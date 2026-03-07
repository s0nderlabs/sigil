import { z } from "zod";
import { encodePacked, keccak256 } from "viem";
import { resolve } from "path";
import { createSupabaseClient } from "../../clients/supabase.js";
import { type ToolDefinition, toolResponse } from "../types.js";

const ruleSchema = z.object({
  criteria: z.string(),
  dataSource: z.string(),
  evaluationGuidance: z.string(),
});

export const savePolicy: ToolDefinition = {
  name: "save_policy",
  description:
    "Register a policy on-chain via CRE and save it to the database. Requires rules to have been created first via create_rule.",
  inputSchema: z.object({
    name: z.string().describe("Policy name"),
    description: z.string().describe("Policy description"),
    isPublic: z
      .boolean()
      .default(true)
      .describe("Whether the policy is publicly visible"),
    rules: z
      .array(ruleSchema)
      .min(1)
      .describe("Array of rules created via create_rule"),
    registeredBy: z
      .string()
      .describe("Address of the protocol registering this policy"),
  }),
  handler: async (args) => {
    const creKey = process.env.CRE_ETH_PRIVATE_KEY;
    if (!creKey) {
      return toolResponse({ error: "CRE_ETH_PRIVATE_KEY not set" });
    }

    // Compute policyId = keccak256(abi.encodePacked(registeredBy, name))
    const policyId = keccak256(
      encodePacked(
        ["address", "string"],
        [args.registeredBy as `0x${string}`, args.name]
      )
    );

    // Register on-chain via CRE
    const creBin = process.env.CRE_BIN || resolve(process.env.HOME || "~", ".cre/bin/cre");
    const creDir = process.env.CRE_PROJECT_DIR || resolve(import.meta.dir, "../../../../../sigil-cre");

    const httpPayload = JSON.stringify({
      type: "register_policy",
      policyId,
      name: args.name,
      description: args.description,
      isPublic: args.isPublic,
    });

    const proc = Bun.spawn([
      creBin, "workflow", "simulate", "sigil-assessment",
      "--non-interactive", "--trigger-index", "0",
      "--http-payload", httpPayload,
      "--target", "staging-settings", "--broadcast",
    ], {
      cwd: creDir,
      env: { ...process.env, CRE_ETH_PRIVATE_KEY: creKey, AI_SERVICE_API_KEY: process.env.SIGIL_API_KEY || "" },
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    console.log("[save-policy] CRE exit code:", exitCode);
    if (exitCode !== 0) {
      console.error("[save-policy] CRE stdout:", stdout.slice(0, 500));
      if (stderr) console.error("[save-policy] CRE stderr:", stderr.slice(0, 500));
      return toolResponse({
        error: "CRE policy registration failed",
        details: stderr || stdout,
      });
    }

    // Save to Supabase
    const supabase = createSupabaseClient();
    const { error: dbError } = await supabase.from("policies").insert({
      id: policyId,
      name: args.name,
      description: args.description,
      is_public: args.isPublic,
      is_active: true,
      registered_by: args.registeredBy,
      rules: args.rules,
    });

    if (dbError) {
      return toolResponse({
        policyId,
        warning: `On-chain registration succeeded but database save failed: ${dbError.message}`,
      });
    }

    return toolResponse({ policyId, registered: true });
  },
};
