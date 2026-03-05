import { verifyApiKey } from "../middleware/auth.js";
import { runAssessment } from "../agents/agent-b.js";
import { createSupabaseClient } from "@sigil/core/clients";

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

    // Normalize bytes32 hex policyId to string for Supabase lookup
    let lookupId = body.policyId;
    if (lookupId.startsWith("0x") && lookupId.length === 66) {
      const hex = lookupId.slice(2).replace(/(00)+$/, "");
      lookupId = Buffer.from(hex, "hex").toString("utf8");
    }

    const supabase = createSupabaseClient();
    const { data: policy, error } = await supabase
      .from("policies")
      .select("id, name, rules, is_active")
      .eq("id", lookupId)
      .single();

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

    return Response.json(result);
  } catch (err) {
    console.error("Assessment error:", err);
    return Response.json(
      { error: "Assessment failed", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
