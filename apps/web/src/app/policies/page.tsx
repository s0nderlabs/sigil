"use client";

import { usePolicies } from "@/hooks/use-policies";
import { PolicyList } from "@/components/policies/policy-list";

export default function PoliciesPage() {
  const { data: policies, isLoading, error } = usePolicies();

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-serif text-3xl text-ink mb-2">Policy Directory</h1>
      <p className="text-sm text-ink-light mb-10">
        Browse registered compliance policies and their evaluation rules.
      </p>

      {isLoading && (
        <p className="text-sm text-ink-light py-12 text-center">
          Loading policies...
        </p>
      )}

      {error && (
        <p className="text-sm text-fail py-12 text-center">
          Failed to load policies.
        </p>
      )}

      {policies && <PolicyList policies={policies} />}
    </div>
  );
}
