import type { RuleEvaluation } from "./assessment.js";

export type EvidenceV1 = {
  version: 1;
  agentId: string;
  policyId: string;
  policyName: string;
  requestHash: string;
  wallet: string;
  timestamp: number;
  chainId: number;
  dataSnapshot: Record<string, unknown>;
  ruleEvaluations: RuleEvaluation[];
  score: number;
  compliant: boolean;
  summary: string;
};
