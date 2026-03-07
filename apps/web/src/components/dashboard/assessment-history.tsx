"use client";

import { motion } from "framer-motion";

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
  if (assessments.length === 0) {
    return (
      <p className="text-sm text-ink-light py-8 text-center">
        No assessments found.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {assessments.map((a, i) => (
        <motion.div
          key={a.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className="flex items-center justify-between py-3 border-b border-border last:border-0"
        >
          <div className="flex items-center gap-3">
            <span
              className={`w-2 h-2 rounded-full ${
                a.compliant ? "bg-teal" : "bg-fail"
              }`}
            />
            <div>
              <span className="font-mono text-xs text-ink">
                {a.policy_id.length > 20 ? `${a.policy_id.slice(0, 20)}...` : a.policy_id}
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
          </div>
        </motion.div>
      ))}
    </div>
  );
}
