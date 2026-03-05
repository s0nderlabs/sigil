export type Rule = {
  criteria: string;
  dataSource: string;
  evaluationGuidance: string;
};

export type Policy = {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  isActive: boolean;
  registeredBy: string;
  rules: Rule[];
};
