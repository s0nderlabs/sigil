"use client";

import { useQuery } from "@tanstack/react-query";

interface RuleEvaluation {
  ruleIndex: number;
  criteria: string;
  dataSource: string;
  dataUsed: string;
  verdict: "pass" | "fail";
  confidence: number;
  reasoning: string;
}

export interface EvidenceV1 {
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
}

const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

function ipfsToHttp(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    return IPFS_GATEWAY + uri.slice(7);
  }
  return uri;
}

async function fetchEvidence(uri: string): Promise<EvidenceV1> {
  const url = ipfsToHttp(uri);
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch evidence from IPFS");
  return res.json();
}

export function useEvidence(evidenceUri: string | undefined) {
  return useQuery<EvidenceV1>({
    queryKey: ["evidence", evidenceUri],
    queryFn: () => fetchEvidence(evidenceUri!),
    enabled: !!evidenceUri,
    staleTime: Infinity, // IPFS content is immutable
  });
}
