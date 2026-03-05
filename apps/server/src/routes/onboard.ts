import { verifySiwe } from "../middleware/auth.js";
import { runOnboarding } from "../agents/agent-a.js";

export async function handleOnboard(req: Request): Promise<Response> {
  const siweResult = await verifySiwe(req);
  if (!siweResult) {
    return Response.json({ error: "Unauthorized — SIWE verification failed" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const userMessage = body.message || body.prompt;

    if (!userMessage) {
      return Response.json({ error: "No message provided" }, { status: 400 });
    }

    const stream = await runOnboarding(userMessage);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Authenticated-Address": siweResult.address,
      },
    });
  } catch (err) {
    console.error("Onboard error:", err);
    return Response.json(
      { error: "Onboarding failed", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
