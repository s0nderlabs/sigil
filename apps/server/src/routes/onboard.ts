// POST /onboard — Agent A (Rule Builder) endpoint
// Called by frontend with SIWE-authenticated protocol wallet
export async function handleOnboard(_req: Request): Promise<Response> {
  // TODO: verify SIWE auth, create Agent A session, stream response
  return Response.json({ error: "Not implemented" }, { status: 501 });
}
