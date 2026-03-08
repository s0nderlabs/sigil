import { createSupabaseClient } from "@sigil/core/clients";

export async function handleGetAssessments(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const agentId = url.searchParams.get("agentId");
    const wallet = url.searchParams.get("wallet");

    const supabase = createSupabaseClient();
    let query = supabase
      .from("assessments")
      .select("id, agent_id, policy_id, request_hash, wallet, score, compliant, evidence_uri, evidence_hash, tag, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (agentId) query = query.eq("agent_id", agentId);
    if (wallet) query = query.eq("wallet", wallet);

    const { data, error } = await query;

    if (error) {
      return Response.json({ error: "Failed to fetch assessments" }, { status: 500 });
    }

    return Response.json(data || []);
  } catch (err) {
    console.error("Assessments error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
