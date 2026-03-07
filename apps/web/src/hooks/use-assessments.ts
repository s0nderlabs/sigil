"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

interface Assessment {
  id: string;
  agent_id: string;
  policy_id: string;
  request_hash: string;
  wallet: string;
  score: number;
  compliant: boolean;
  evidence_uri: string;
  evidence_hash: string;
  tag: string;
  created_at: string;
}

export function useAssessments(params?: { agentId?: string; wallet?: string }) {
  const search = new URLSearchParams();
  if (params?.agentId) search.set("agentId", params.agentId);
  if (params?.wallet) search.set("wallet", params.wallet);
  const qs = search.toString();

  return useQuery<Assessment[]>({
    queryKey: ["assessments", qs],
    queryFn: () => apiGet<Assessment[]>(`/assessments${qs ? `?${qs}` : ""}`),
    staleTime: 15_000,
  });
}
