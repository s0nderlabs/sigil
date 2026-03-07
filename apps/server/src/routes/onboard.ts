import { verifyApiKey, verifySiweFromBody } from "../middleware/auth.js";
import { streamOnboarding } from "../agents/agent-a.js";

export async function handleOnboard(req: Request): Promise<Response> {
  let authenticatedAddress: string;
  let body: any;

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Dev mode: skip SIWE, use API key auth instead
  if (process.env.DEV_MODE === "true") {
    if (!verifyApiKey(req)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    authenticatedAddress = req.headers.get("x-wallet-address") || "0xDEV";
  } else {
    const siweResult = await verifySiweFromBody(body);
    if (!siweResult) {
      return Response.json({ error: "Unauthorized — SIWE verification failed" }, { status: 401 });
    }
    authenticatedAddress = siweResult.address;
  }

  const userMessage = body.prompt;
  const sessionId = body.sessionId;

  if (!userMessage) {
    return Response.json({ error: "No message provided" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const generator = streamOnboarding({
    userMessage,
    sessionId,
    authenticatedAddress,
  });

  let closed = false;
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generator) {
          if (closed) break;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        console.error("Onboard stream error:", errorMsg);
        if (!closed) {
          try {
            controller.enqueue(
              encoder.encode(`event: error\ndata: ${JSON.stringify({ error: errorMsg })}\n\n`)
            );
          } catch { /* controller already closed */ }
        }
      } finally {
        if (!closed) {
          closed = true;
          try { controller.close(); } catch { /* already closed */ }
        }
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
