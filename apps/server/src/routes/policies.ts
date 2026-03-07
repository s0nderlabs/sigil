import { createSupabaseClient } from "@sigil/core/clients";

export async function handleGetPolicies(_req: Request): Promise<Response> {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("policies")
      .select("id, name, description, is_public, is_active, registered_by, rules, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return Response.json({ error: "Failed to fetch policies" }, { status: 500 });
    }

    return Response.json(data || []);
  } catch (err) {
    console.error("Policies error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
