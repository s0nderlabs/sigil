export function handleHealth(_req: Request): Response {
  return Response.json({ status: "ok" });
}
