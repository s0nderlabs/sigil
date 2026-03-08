"use client";

import type { Rule } from "@sigil/core/types";
import { IntegrationGuide } from "./integration-guide";

export function PolicyDetail({
  rules,
  policyId,
}: {
  rules: Rule[];
  policyId: string;
}) {
  return (
    <div className="py-5">
      <div className="pl-4 space-y-4">
        {rules.map((rule, i) => (
          <div
            key={i}
            className="border-l-2 border-teal/20 pl-4 space-y-1.5"
          >
            <div className="label-mono text-teal">Rule {i + 1}</div>
            <p className="text-sm text-ink">{rule.criteria}</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs tracking-wide px-2 py-0.5 bg-cream-dark rounded text-ink-light">
                {rule.dataSource}
              </span>
            </div>
            <p className="text-xs text-ink-light leading-relaxed">
              {rule.evaluationGuidance}
            </p>
          </div>
        ))}
      </div>
      <IntegrationGuide policyId={policyId} />
    </div>
  );
}
