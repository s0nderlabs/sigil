"use client";

import { motion } from "framer-motion";
import { EvidenceViewer } from "./evidence-viewer";

interface ComplianceStatusProps {
  score: number;
  compliant: boolean;
  evidenceUri: string;
  tag: string;
  policyName?: string;
}

export function ComplianceStatus({ score, compliant, evidenceUri, tag, policyName }: ComplianceStatusProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5"
    >
      {/* Policy name */}
      {policyName && (
        <h3 className="font-serif text-lg text-ink">{policyName}</h3>
      )}

      {/* Score bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="label-mono">Compliance Score</span>
          <span className="font-mono text-sm font-semibold">{score}/100</span>
        </div>
        <div className="h-2 bg-cream-dark rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className={`h-full rounded-full ${compliant ? "bg-teal" : "bg-fail"}`}
          />
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs tracking-wide ${
            compliant
              ? "bg-teal/10 text-teal"
              : "bg-fail/10 text-fail"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${compliant ? "bg-teal" : "bg-fail"}`} />
          {compliant ? "Compliant" : "Non-compliant"}
        </span>
        {tag && (
          <span className="font-mono text-xs text-ink-light">{tag}</span>
        )}
      </div>

      {/* Evidence viewer */}
      {evidenceUri && <EvidenceViewer evidenceUri={evidenceUri} />}
    </motion.div>
  );
}
