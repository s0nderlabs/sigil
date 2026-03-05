import { z } from "zod";
import { pinJsonToIpfs } from "../../clients/pinata.js";
import type { EvidenceV1 } from "../../types/evidence.js";
import type { RuleEvaluation } from "../../types/assessment.js";
import { type ToolDefinition, toolResponse } from "../types.js";

export const pinEvidence: ToolDefinition = {
  name: "pin_evidence",
  description:
    "Pin the final assessment evidence to IPFS via Pinata. MUST be called as the FINAL step of every assessment. Auto-injects dataSnapshot from all previous tool call results stored in session state.",
  inputSchema: z.object({
    ruleEvaluations: z
      .array(
        z.object({
          ruleIndex: z.number(),
          criteria: z.string(),
          dataSource: z.string(),
          dataUsed: z.string(),
          verdict: z.enum(["pass", "fail"]),
          confidence: z.number(),
          reasoning: z.string(),
        })
      )
      .describe("Evaluation result for each rule"),
    score: z.number().min(0).max(100).describe("Overall compliance score 0-100"),
    compliant: z.boolean().describe("Whether the agent passed all rules"),
    summary: z
      .string()
      .describe("Brief human-readable summary of the assessment"),
  }),
  handler: async (args, context) => {
    const state = context?.sessionState;
    if (!state) {
      return toolResponse({ error: "No session state available. Cannot build evidence." });
    }

    const agentId = state.get("agentId") as string;
    const policyId = state.get("policyId") as string;
    const policyName = state.get("policyName") as string;
    const requestHash = state.get("requestHash") as string;
    const wallet = state.get("wallet") as string;
    const dataSnapshot = (state.get("dataSnapshot") as Record<string, unknown>) || {};

    const evidence: EvidenceV1 = {
      version: 1,
      agentId,
      policyId,
      policyName,
      requestHash,
      wallet,
      timestamp: Math.floor(Date.now() / 1000),
      chainId: 11155111, // Sepolia
      dataSnapshot,
      ruleEvaluations: args.ruleEvaluations as RuleEvaluation[],
      score: args.score,
      compliant: args.compliant,
      summary: args.summary,
    };

    const { uri, hash } = await pinJsonToIpfs(evidence);
    return toolResponse({ uri, hash, evidenceVersion: 1 });
  },
};
