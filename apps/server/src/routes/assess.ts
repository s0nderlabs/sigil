// POST /assess — Agent B (Assessor) endpoint
// Called by CRE workflow with API key auth
export async function handleAssess(_req: Request): Promise<Response> {
  // TODO: verify API key, create Agent B session, return assessment result
  return Response.json({ error: "Not implemented" }, { status: 501 });
}
