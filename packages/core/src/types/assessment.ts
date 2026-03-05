export type AssessmentResult = {
  score: number;
  compliant: boolean;
  evidenceURI: string;
  evidenceHash: string;
  tag: string;
};

export type RuleEvaluation = {
  ruleIndex: number;
  criteria: string;
  dataSource: string;
  dataUsed: string;
  verdict: "pass" | "fail";
  confidence: number;
  reasoning: string;
};
