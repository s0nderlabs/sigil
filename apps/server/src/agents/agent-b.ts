import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import type { AssessmentResult } from "@sigil/core/types";
import type { Rule } from "@sigil/core/types";
import { AGENT_B_SYSTEM_PROMPT } from "@sigil/core/prompts";

import {
  getEthBalance,
  getTokenBalance,
  getTransactionHistory,
  checkContractCode,
  checkSanctions,
  getValidationHistory,
  getReputationHistory,
  pinEvidence,
} from "@sigil/core/tools/agent-b";

function createAgentBTools(sessionState: Map<string, unknown>) {
  const dataSnapshot: Record<string, unknown> = {};
  sessionState.set("dataSnapshot", dataSnapshot);

  const tools = [
    getEthBalance,
    getTokenBalance,
    getTransactionHistory,
    checkContractCode,
    checkSanctions,
    getValidationHistory,
    getReputationHistory,
    pinEvidence,
  ].map((def) =>
    tool(def.name, def.description, def.inputSchema.shape, async (args: any) => {
      const result = await def.handler(args, { sessionState });
      if (def.name !== pinEvidence.name) {
        const parsed = JSON.parse(result.content[0].text);
        // Strip full transactions array from evidence snapshot — keep only counts
        if (def.name === getTransactionHistory.name && parsed.transactions) {
          const { transactions, ...summary } = parsed;
          dataSnapshot[def.name] = summary;
        } else {
          dataSnapshot[def.name] = parsed;
        }
      }
      return result;
    })
  );

  return tools;
}

function buildAssessmentPrompt(params: {
  agentId: string;
  policyId: string;
  requestHash: string;
  onChainData: { wallet: string; owner: string; tokenURI: string };
  rules: Rule[];
}): string {
  return `## Assessment Request

**Agent ID**: ${params.agentId}
**Policy ID**: ${params.policyId}
**Request Hash**: ${params.requestHash}

### On-Chain Identity Data
- **Wallet**: ${params.onChainData.wallet}
- **Owner**: ${params.onChainData.owner}
- **Token URI**: ${params.onChainData.tokenURI}

### Policy Rules to Evaluate
${params.rules.map((r, i) => `
#### Rule ${i + 1}
- **Criteria**: ${r.criteria}
- **Data Source**: ${r.dataSource}
- **Evaluation Guidance**: ${r.evaluationGuidance}
`).join("\n")}

Evaluate each rule using the available tools. After evaluating all rules, call \`pin_evidence\` with your complete assessment. Then return a JSON object with: { score, compliant, evidenceURI, evidenceHash, tag }`;
}

export async function runAssessment(params: {
  agentId: string;
  policyId: string;
  requestHash: string;
  onChainData: { wallet: string; owner: string; tokenURI: string };
  rules: Rule[];
  policyName: string;
}): Promise<AssessmentResult> {
  const sessionState = new Map<string, unknown>();
  sessionState.set("agentId", params.agentId);
  sessionState.set("policyId", params.policyId);
  sessionState.set("policyName", params.policyName);
  sessionState.set("requestHash", params.requestHash);
  sessionState.set("wallet", params.onChainData.wallet);

  const tools = createAgentBTools(sessionState);
  const server = createSdkMcpServer({ name: "sigil-agent-b", tools });

  const prompt = buildAssessmentPrompt(params);

  for await (const message of query({
    prompt,
    options: {
      model: process.env.CLAUDE_MODEL || "claude-opus-4-6",
      maxThinkingTokens: 10000,
      systemPrompt: AGENT_B_SYSTEM_PROMPT,
      mcpServers: { "sigil-tools": server },
      maxTurns: 25,
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      outputFormat: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            score: { type: "number" },
            compliant: { type: "boolean" },
            evidenceURI: { type: "string" },
            evidenceHash: { type: "string" },
            tag: { type: "string" },
          },
          required: ["score", "compliant", "evidenceURI", "evidenceHash", "tag"],
          additionalProperties: false,
        },
      },
    },
  })) {
    if ((message as any).type === "result") {
      const msg = message as any;

      // structured_output is the primary field when outputFormat is used
      if (msg.structured_output && typeof msg.structured_output === "object") {
        return msg.structured_output as AssessmentResult;
      }

      // Fallback: parse result string
      if (msg.result && typeof msg.result === "string" && msg.result.length > 0) {
        return JSON.parse(msg.result) as AssessmentResult;
      }

      // Check if it's an error
      if (msg.is_error) {
        throw new Error(`Agent B error after ${msg.num_turns} turns`);
      }

      throw new Error("Agent B returned empty result");
    }
  }

  throw new Error("Agent B did not produce a result");
}
