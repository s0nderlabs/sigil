"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { Rule } from "@sigil/core/types";

interface PolicyRow {
  id: string;
  name: string;
  description: string;
  is_public: boolean;
  is_active: boolean;
  registered_by: string;
  rules: Rule[];
  created_at: string;
}

export function usePolicies() {
  return useQuery<PolicyRow[]>({
    queryKey: ["policies"],
    queryFn: () => apiGet<PolicyRow[]>("/policies"),
    staleTime: 30_000,
  });
}
