import { handleHealth } from "./routes/health.js";
import { handleOnboard } from "./routes/onboard.js";
import { handleAssess } from "./routes/assess.js";

const PORT = Number(process.env.PORT) || 3001;

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/health") {
      return handleHealth(req);
    }
    if (req.method === "POST" && url.pathname === "/onboard") {
      return handleOnboard(req);
    }
    if (req.method === "POST" && url.pathname === "/assess") {
      return handleAssess(req);
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Sigil server running on port ${PORT}`);
