import { verifyApiKey } from "../middleware/auth.js";
import { runAssessment } from "../agents/assessor.js";
import { createSupabaseClient } from "@sigil/core/clients";
import { SEPOLIA_ADDRESSES } from "@sigil/core/constants";

export async function handleAssess(req: Request): Promise<Response> {
  if (!verifyApiKey(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // CRE sends body as base64-encoded bytes; direct callers send raw JSON
    let body: {
      agentId: string;
      policyId: string;
      requestHash: string;
      onChainData: {
        wallet: string;
        owner: string;
        tokenURI: string;
      };
    };
    const raw = await req.text();
    body = raw.startsWith("{")
      ? JSON.parse(raw)
      : JSON.parse(atob(raw));

    const supabase = createSupabaseClient();

    // Try exact match first (keccak256 policyIds stored as hex strings)
    let lookupId = body.policyId;
    let { data: policy, error } = await supabase
      .from("policies")
      .select("id, name, rules, is_active")
      .eq("id", lookupId)
      .single();

    // Fallback: normalize bytes32 hex to string (for string-based policyIds padded to bytes32)
    if ((error || !policy) && lookupId.startsWith("0x") && lookupId.length === 66) {
      const hex = lookupId.slice(2).replace(/(00)+$/, "");
      const normalized = Buffer.from(hex, "hex").toString("utf8");
      ({ data: policy, error } = await supabase
        .from("policies")
        .select("id, name, rules, is_active")
        .eq("id", normalized)
        .single());
    }

    if (error || !policy) {
      return Response.json({ error: "Policy not found" }, { status: 404 });
    }

    if (!policy.is_active) {
      return Response.json({ error: "Policy is inactive" }, { status: 400 });
    }

    const result = await runAssessment({
      ...body,
      rules: policy.rules,
      policyName: policy.name,
    });

    await supabase.from("assessments").insert({
      agent_id: body.agentId,
      policy_id: body.policyId,
      request_hash: body.requestHash,
      wallet: body.onChainData.wallet,
      score: result.score,
      compliant: result.compliant,
      evidence_uri: result.evidenceURI,
      evidence_hash: result.evidenceHash,
      tag: result.tag,
    });

    return Response.json({
      ...result,
      assessorAgentId: SEPOLIA_ADDRESSES.assessorAgentId,
      reputationRegistry: SEPOLIA_ADDRESSES.reputationRegistry,
      feedbackHint: `Rate this assessment by calling giveFeedback(${SEPOLIA_ADDRESSES.assessorAgentId || "assessorAgentId"}, rating, 0, 'starred', 'assessor', '', '', bytes32(0)) on ${SEPOLIA_ADDRESSES.reputationRegistry}`,
    });
  } catch (err) {
    console.error("Assessment error:", err);
    return Response.json(
      { error: "Assessment failed", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
