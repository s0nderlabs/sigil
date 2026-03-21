import { verifyApiKey, verifySiweFromBody } from "../middleware/auth.js";
import { runAutoInscribe } from "../agents/scribe.js";

export async function handleAutoInscribe(req: Request): Promise<Response> {
  let authenticatedAddress: string;
  let body: any;

  try {
    body = await req.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  // Auth: API key first, SIWE fallback
  if (verifyApiKey(req)) {
    authenticatedAddress = req.headers.get("x-wallet-address") || "0xDEV";
  } else {
    const siweResult = await verifySiweFromBody(body);
    if (!siweResult) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    authenticatedAddress = siweResult.address;
  }

  // Validate required fields
  const { name, description, rules, visibility } = body as {
    name?: string;
    description?: string;
    rules?: string;
    visibility?: string;
  };

  if (!name || !name.trim()) {
    return Response.json({ success: false, error: "name is required" }, { status: 400 });
  }
  if (name.length > 100) {
    return Response.json({ success: false, error: "name must be 100 characters or less" }, { status: 400 });
  }
  if (!description || !description.trim()) {
    return Response.json({ success: false, error: "description is required" }, { status: 400 });
  }
  if (description.length > 500) {
    return Response.json({ success: false, error: "description must be 500 characters or less" }, { status: 400 });
  }
  if (!rules || !rules.trim()) {
    return Response.json({ success: false, error: "rules is required" }, { status: 400 });
  }

  const policyVisibility = visibility === "private" ? "private" : "public";

  try {
    const result = await runAutoInscribe({
      name: name.trim(),
      description: description.trim(),
      rules: rules.trim(),
      visibility: policyVisibility,
      authenticatedAddress,
    });

    return Response.json({
      success: true,
      policyId: result.policyId,
      name: name.trim(),
      description: description.trim(),
      rules: result.rules,
      visibility: policyVisibility,
    });
  } catch (err) {
    console.error("Auto-inscribe error:", err);
    return Response.json({
      success: false,
      error: err instanceof Error ? err.message : "Scribe failed to generate valid rules from the provided input",
    }, { status: 500 });
  }
}
