import { verifyApiKey, verifySiweFromBody } from "../middleware/auth.js";
import { streamInscribe } from "../agents/scribe.js";

export async function handleInscribe(req: Request): Promise<Response> {
  let authenticatedAddress: string;
  let body: any;

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // API key auth (programmatic/agent access) takes priority, SIWE as fallback (browser)
  if (verifyApiKey(req)) {
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
  const generator = streamInscribe({
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
        console.error("Inscribe stream error:", errorMsg);
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
