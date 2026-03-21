import { resolve } from "path";
import {
  keccak256,
  encodePacked,
  recoverMessageAddress,
} from "viem";
import { IDENTITY_REGISTRY_ABI, VALIDATION_REGISTRY_ABI, SEPOLIA_ADDRESSES } from "@sigil/core/constants";
import { createSupabaseClient, createRpcClient } from "@sigil/core/clients";

const SELF_DESCRIBING_ERROR = {
  error: "signature_required",
  message: "Sign a message with your agent wallet to prove ownership and trigger an assessment.",
  required: {
    agentId: "Your ERC-8004 agent token ID (string)",
    policyId: "The policy bytes32 hex ID to assess against",
    signature: "EIP-191 personal_sign of the message field",
    message: "sigil:assess:{agentId}:{policyId}:{unix_timestamp}",
  },
  example: {
    agentId: "1",
    policyId: "0xabc123...def456",
    message: "sigil:assess:1:0xabc123...def456:1741420800",
    signature: "0x<sign the message above with your agent wallet>",
  },
};

const MAX_MESSAGE_AGE_MS = 5 * 60 * 1000; // 5 minutes

export async function handleTriggerAssessment(req: Request): Promise<Response> {
  try {
    const body = await req.json() as Record<string, unknown>;

    // Self-describing error if missing fields
    const { agentId, policyId, signature, message } = body as {
      agentId?: string;
      policyId?: string;
      signature?: string;
      message?: string;
    };

    if (!agentId || !policyId || !signature || !message) {
      return Response.json(SELF_DESCRIBING_ERROR, { status: 400 });
    }

    // Parse and validate message format: sigil:assess:{agentId}:{policyId}:{timestamp}
    const parts = (message as string).split(":");
    if (parts.length < 5 || parts[0] !== "sigil" || parts[1] !== "assess") {
      return Response.json({
        error: "invalid_message_format",
        expected: "sigil:assess:{agentId}:{policyId}:{unix_timestamp}",
      }, { status: 400 });
    }

    const msgAgentId = parts[2];
    // policyId may contain colons (hex), rejoin remaining except last part (timestamp)
    const msgTimestamp = parts[parts.length - 1];
    const msgPolicyId = parts.slice(3, parts.length - 1).join(":");

    if (msgAgentId !== agentId || msgPolicyId !== policyId) {
      return Response.json({
        error: "message_mismatch",
        message: "agentId and policyId in message must match body fields",
      }, { status: 400 });
    }

    // Replay protection: timestamp within 5 minutes
    const timestamp = parseInt(msgTimestamp, 10);
    if (isNaN(timestamp) || Math.abs(Date.now() - timestamp * 1000) > MAX_MESSAGE_AGE_MS) {
      return Response.json({
        error: "message_expired",
        message: "Timestamp must be within 5 minutes of current time",
      }, { status: 400 });
    }

    const rpc = createRpcClient();

    // Recover signer and read agent wallet in parallel (independent operations)
    const [recoveredAddress, agentWallet] = await Promise.all([
      recoverMessageAddress({
        message: message as string,
        signature: signature as `0x${string}`,
      }),
      rpc.readContract({
        address: SEPOLIA_ADDRESSES.identityRegistry as `0x${string}`,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "getAgentWallet",
        args: [BigInt(agentId)],
      }) as Promise<string>,
    ]);

    // Verify signer is the agent wallet (ECDSA match or Smart Account owner)
    if (recoveredAddress.toLowerCase() !== agentWallet.toLowerCase()) {
      // ERC-4337 Smart Account fallback: check if the ECDSA signer is an owner
      // of the Smart Account registered as the agent wallet (e.g., Safe)
      let isSmartAccountOwner = false;
      try {
        const rpc = createRpcClient();
        const code = await rpc.getCode({ address: agentWallet as `0x${string}` });
        if (code && code !== "0x") {
          isSmartAccountOwner = await rpc.readContract({
            address: agentWallet as `0x${string}`,
            abi: [{
              type: "function", name: "isOwner",
              inputs: [{ name: "owner", type: "address" }],
              outputs: [{ name: "", type: "bool" }],
              stateMutability: "view",
            }] as const,
            functionName: "isOwner",
            args: [recoveredAddress],
          });
        }
      } catch {
        // Not a Safe or doesn't support isOwner — fall through to rejection
      }

      if (!isSmartAccountOwner) {
        return Response.json({
          error: "unauthorized",
          message: "Signature does not match the agent wallet for this agentId",
        }, { status: 403 });
      }
    }

    // Compute requestHash (matches contract's computeRequestHash)
    const requestHash = keccak256(
      encodePacked(
        ["uint256", "bytes32"],
        [BigInt(agentId), policyId as `0x${string}`]
      )
    );

    // Check if validationRequest exists on 8004 Validation Registry
    try {
      await rpc.readContract({
        address: SEPOLIA_ADDRESSES.validationRegistry as `0x${string}`,
        abi: VALIDATION_REGISTRY_ABI,
        functionName: "getValidationStatus",
        args: [requestHash],
      });
    } catch {
      return Response.json({
        error: "validation_request_missing",
        message: "No validationRequest found on the 8004 Validation Registry for this requestHash. Submit a validationRequest before triggering assessment.",
        requestHash,
        validationRegistry: SEPOLIA_ADDRESSES.validationRegistry,
        hint: `Call validationRequest("${SEPOLIA_ADDRESSES.sigilMiddleware}", ${agentId}, "", "${requestHash}") on ${SEPOLIA_ADDRESSES.validationRegistry}`,
      }, { status: 400 });
    }

    // Spawn CRE workflow
    const creBin = process.env.CRE_BIN || resolve(process.env.HOME || "~", ".cre/bin/cre");
    const creDir = process.env.CRE_PROJECT_DIR || resolve(import.meta.dir, "../../../../sigil-cre");

    const httpPayload = JSON.stringify({
      type: "assess",
      agentId,
      policyId,
      requestHash,
    });

    const proc = Bun.spawn([
      creBin, "workflow", "simulate", "sigil-assessment",
      "--non-interactive", "--trigger-index", "0",
      "--http-payload", httpPayload,
      "--target", "staging-settings", "--broadcast",
    ], {
      cwd: creDir,
      env: { ...process.env, CRE_ETH_PRIVATE_KEY: process.env.CRE_ETH_PRIVATE_KEY, AI_SERVICE_API_KEY: process.env.SIGIL_API_KEY || "" },
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    console.log(`[trigger-assessment] CRE exit code: ${exitCode}`);
    if (stdout.trim()) console.log(`[trigger-assessment] CRE stdout:\n${stdout}`);
    if (stderr.trim()) console.error(`[trigger-assessment] CRE stderr:\n${stderr}`);

    if (exitCode !== 0) {
      return Response.json({
        error: "assessment_failed",
        message: "CRE workflow failed",
        details: (stderr || stdout).slice(-500),
      }, { status: 500 });
    }

    // Query result from Supabase (most recent assessment for this agent + policy)
    const supabase = createSupabaseClient();
    const { data: assessment } = await supabase
      .from("assessments")
      .select("score, compliant, evidence_uri, evidence_hash, tag")
      .eq("agent_id", agentId)
      .eq("policy_id", policyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (assessment) {
      return Response.json({
        agentId,
        policyId,
        requestHash,
        score: assessment.score,
        compliant: assessment.compliant,
        evidenceURI: assessment.evidence_uri,
        evidenceHash: assessment.evidence_hash,
        tag: assessment.tag,
      });
    }

    // Fallback: assessment was submitted but not yet in database
    return Response.json({
      agentId,
      policyId,
      requestHash,
      message: "Assessment submitted on-chain. Query /assessments for results.",
    });
  } catch (err) {
    // If JSON parsing fails, return self-describing error
    if (err instanceof SyntaxError) {
      return Response.json(SELF_DESCRIBING_ERROR, { status: 400 });
    }
    console.error("Trigger assessment error:", err);
    return Response.json({
      error: "internal_error",
      message: err instanceof Error ? err.message : "Unknown error",
    }, { status: 500 });
  }
}
