import { handleHealth } from "./routes/health.js";
import { handleOnboard } from "./routes/onboard.js";
import { handleAssess } from "./routes/assess.js";
import { handleTriggerAssessment } from "./routes/trigger-assessment.js";
import { handleGetPolicies } from "./routes/policies.js";
import { handleGetAssessments } from "./routes/assessments.js";

const PORT = Number(process.env.PORT) || 3001;
const ALLOWED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-wallet-address",
  };
}

Bun.serve({
  port: PORT,
  idleTimeout: 255, // Agent SDK queries can take 60-120s
  async fetch(req) {
    const url = new URL(req.url);
    const cors = corsHeaders(req);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    let response: Response;

    if (req.method === "GET" && url.pathname === "/health") {
      response = handleHealth(req);
    } else if (req.method === "POST" && url.pathname === "/onboard") {
      response = await handleOnboard(req);
    } else if (req.method === "POST" && url.pathname === "/assess") {
      response = await handleAssess(req);
    } else if (req.method === "POST" && url.pathname === "/trigger-assessment") {
      response = await handleTriggerAssessment(req);
    } else if (req.method === "GET" && url.pathname === "/policies") {
      response = await handleGetPolicies(req);
    } else if (req.method === "GET" && url.pathname === "/assessments") {
      response = await handleGetAssessments(req);
    } else {
      response = new Response("Not Found", { status: 404 });
    }

    // Apply CORS headers to all responses
    for (const [k, v] of Object.entries(cors)) {
      response.headers.set(k, v);
    }

    return response;
  },
});

console.log(`Sigil server running on port ${PORT}`);
