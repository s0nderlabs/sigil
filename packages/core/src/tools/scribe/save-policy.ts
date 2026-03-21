import { z } from "zod";
import { encodePacked, keccak256, zeroAddress } from "viem";
import { resolve } from "path";
import { createSupabaseClient } from "../../clients/supabase.js";
import { createRpcClient } from "../../clients/rpc.js";
import { SIGIL_ABI } from "../../constants/abis.js";
import { SEPOLIA_ADDRESSES } from "../../constants/addresses.js";
import { type ToolDefinition, toolResponse } from "../types.js";

const ON_CHAIN_VERIFY_ATTEMPTS = 3;
const ON_CHAIN_VERIFY_DELAY_MS = 5_000;

const ruleSchema = z.object({
  criteria: z.string(),
  dataSource: z.string(),
  evaluationGuidance: z.string(),
});

export const savePolicy: ToolDefinition = {
  name: "save_policy",
  description:
    "Register a policy on-chain via CRE and save it to the database. Requires rules to have been created first via create_rule.",
  inputSchema: z.object({
    name: z.string().describe("Policy name"),
    description: z.string().describe("Policy description"),
    isPublic: z
      .boolean()
      .default(true)
      .describe("Whether the policy is publicly visible"),
    rules: z
      .array(ruleSchema)
      .min(1)
      .describe("Array of rules created via create_rule"),
    registeredBy: z
      .string()
      .describe("Address of the protocol registering this policy"),
  }),
  handler: async (args) => {
    const creKey = process.env.CRE_ETH_PRIVATE_KEY;
    if (!creKey) {
      return toolResponse({ error: "CRE_ETH_PRIVATE_KEY not set" });
    }

    // Compute policyId = keccak256(abi.encodePacked(registeredBy, name))
    const policyId = keccak256(
      encodePacked(
        ["address", "string"],
        [args.registeredBy as `0x${string}`, args.name]
      )
    );

    // Check if policy already exists (same wallet + name = same policyId)
    const rpcCheck = createRpcClient();
    try {
      const existing = await rpcCheck.readContract({
        address: SEPOLIA_ADDRESSES.sigilMiddleware as `0x${string}`,
        abi: SIGIL_ABI,
        functionName: "getPolicy",
        args: [policyId as `0x${string}`],
      }) as { name: string; registeredBy: string };
      if (existing.registeredBy !== zeroAddress) {
        return toolResponse({
          error: `Policy "${args.name}" already exists with this wallet. Use a different name.`,
          policyId,
          existingPolicy: existing.name,
        });
      }
    } catch {
      // getPolicy reverts if not found — that's expected, continue
    }

    // Register on-chain via CRE
    const creBin = process.env.CRE_BIN || resolve(process.env.HOME || "~", ".cre/bin/cre");
    const creDir = process.env.CRE_PROJECT_DIR || resolve(import.meta.dir, "../../../../../sigil-cre");

    const httpPayload = JSON.stringify({
      type: "register_policy",
      policyId,
      name: args.name,
      description: args.description,
      isPublic: args.isPublic,
    });

    const proc = Bun.spawn([
      creBin, "workflow", "simulate", "sigil-assessment",
      "--non-interactive", "--trigger-index", "0",
      "--http-payload", httpPayload,
      "--target", "staging-settings", "--broadcast",
    ], {
      cwd: creDir,
      env: { ...process.env, CRE_ETH_PRIVATE_KEY: creKey, AI_SERVICE_API_KEY: process.env.SIGIL_API_KEY || "" },
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    console.log("[save-policy] CRE exit code:", exitCode);
    if (exitCode !== 0) {
      console.error("[save-policy] CRE stdout:", stdout.slice(0, 500));
      if (stderr) console.error("[save-policy] CRE stderr:", stderr.slice(0, 500));
      return toolResponse({
        error: "CRE policy registration failed",
        details: stderr || stdout,
      });
    }

    // Verify policy exists on-chain before saving to Supabase.
    // CRE exit code 0 doesn't guarantee the internal onReport() call succeeded,
    // and the tx may not be in a block yet, so retry a few times.
    const rpc = createRpcClient();
    let verified = false;
    for (let attempt = 1; attempt <= ON_CHAIN_VERIFY_ATTEMPTS; attempt++) {
      const policy = await rpc.readContract({
        address: SEPOLIA_ADDRESSES.sigilMiddleware as `0x${string}`,
        abi: SIGIL_ABI,
        functionName: "getPolicy",
        args: [policyId as `0x${string}`],
      }) as { name: string; description: string; isPublic: boolean; isActive: boolean; registeredBy: string };

      if (policy.registeredBy !== zeroAddress) {
        console.log("[save-policy] On-chain verification passed:", policy.name);
        verified = true;
        break;
      }
      console.log(`[save-policy] On-chain verification attempt ${attempt}/${ON_CHAIN_VERIFY_ATTEMPTS}: not found yet`);
      if (attempt < ON_CHAIN_VERIFY_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, ON_CHAIN_VERIFY_DELAY_MS));
      }
    }

    if (!verified) {
      console.error("[save-policy] On-chain verification failed after retries");
      return toolResponse({
        error: "Policy not found on-chain after CRE broadcast (tx may have failed or not been included)",
        policyId,
      });
    }

    // Save to Supabase
    const supabase = createSupabaseClient();
    const { error: dbError } = await supabase.from("policies").insert({
      id: policyId,
      name: args.name,
      description: args.description,
      is_public: args.isPublic,
      is_active: true,
      registered_by: args.registeredBy,
      rules: args.rules,
    });

    if (dbError) {
      return toolResponse({
        policyId,
        warning: `On-chain registration succeeded but database save failed: ${dbError.message}`,
      });
    }

    return toolResponse({ policyId, registered: true });
  },
};
