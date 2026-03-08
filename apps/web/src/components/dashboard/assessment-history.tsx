"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePolicies } from "@/hooks/use-policies";
import { EvidenceViewer } from "./evidence-viewer";

interface Assessment {
  id: string;
  policy_id: string;
  score: number;
  compliant: boolean;
  tag: string;
  evidence_uri: string;
  created_at: string;
}

export function AssessmentHistory({ assessments }: { assessments: Assessment[] }) {
  const { data: policies } = usePolicies();
  const policyNames = new Map(policies?.map((p) => [p.id, p.name]));
  const [expanded, setExpanded] = useState<string | null>(null);

  if (assessments.length === 0) {
    return (
      <p className="text-sm text-ink-light py-8 text-center">
        No assessments found.
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {assessments.map((a, i) => {
        const policyName = policyNames.get(a.policy_id);
        const isExpanded = expanded === a.id;
        return (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="border-b border-border last:border-0"
          >
            <button
              onClick={() => setExpanded(isExpanded ? null : a.id)}
              className="w-full text-left flex items-center justify-between py-3 group"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-2 h-2 rounded-full ${
                    a.compliant ? "bg-teal" : "bg-fail"
                  }`}
                />
                <div>
                  <span className="text-sm text-ink font-serif group-hover:text-teal transition-colors">
                    {policyName || (a.policy_id.length > 20 ? `${a.policy_id.slice(0, 20)}...` : a.policy_id)}
                  </span>
                  {a.tag && (
                    <span className="ml-2 font-mono text-xs text-ink-light">
                      {a.tag}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs font-semibold">{a.score}/100</span>
                <span className="font-mono text-xs text-ink-light">
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
                <span
                  className={`transition-transform duration-300 text-ink-light text-sm ${
                    isExpanded ? "rotate-45" : ""
                  }`}
                >
                  +
                </span>
              </div>
            </button>
            <AnimatePresence>
              {isExpanded && a.evidence_uri && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden pb-4 pl-5"
                >
                  <EvidenceViewer evidenceUri={a.evidence_uri} autoExpand />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
