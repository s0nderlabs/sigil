import { z } from "zod";
import { type ToolDefinition, toolResponse } from "../types.js";

const VALID_DATA_SOURCES = [
  "eth_balance",
  "token_balance",
  "transaction_history",
  "contract_code",
  "sanctions_check",
  "validation_history",
  "reputation_history",
] as const;

export const createRule: ToolDefinition = {
  name: "create_rule",
  description:
    "Validate and create a compliance rule. The rule must reference a data source that Agent B can evaluate. Returns the validated rule structure.",
  inputSchema: z.object({
    criteria: z
      .string()
      .describe(
        "What condition must be met (e.g., 'Hold at least 0.5 ETH')"
      ),
    dataSource: z
      .enum(VALID_DATA_SOURCES)
      .describe(
        "The data source Agent B will use: eth_balance, token_balance, transaction_history, contract_code, sanctions_check, validation_history, or reputation_history"
      ),
    evaluationGuidance: z
      .string()
      .describe(
        "Instructions for Agent B on how to evaluate this rule against the data"
      ),
  }),
  handler: async (args) => {
    const rule = {
      criteria: args.criteria,
      dataSource: args.dataSource,
      evaluationGuidance: args.evaluationGuidance,
    };

    return toolResponse({
      rule,
      valid: true,
      message: `Rule created: "${args.criteria}" using ${args.dataSource}`,
    });
  },
};
