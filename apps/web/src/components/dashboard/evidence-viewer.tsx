"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEvidence, type EvidenceV1 } from "@/hooks/use-evidence";

interface EvidenceViewerProps {
  evidenceUri: string;
}

export function EvidenceViewer({ evidenceUri }: EvidenceViewerProps) {
  const [expanded, setExpanded] = useState(false);
  const { data: evidence, isLoading, error } = useEvidence(
    expanded ? evidenceUri : undefined
  );

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1.5 font-mono text-xs text-teal hover:text-teal-light transition-colors"
      >
        {expanded ? "Hide Evidence" : "View Evidence from IPFS"}
        <span
          className={`transition-transform duration-200 ${
            expanded ? "rotate-90" : ""
          }`}
        >
          &rarr;
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            {isLoading && (
              <div className="py-6 text-sm text-ink-light text-center">
                Fetching evidence from IPFS...
              </div>
            )}

            {error && (
              <div className="py-4 font-mono text-xs text-fail">
                Failed to load evidence. The IPFS gateway may be unavailable.
              </div>
            )}

            {evidence && <EvidenceContent evidence={evidence} uri={evidenceUri} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EvidenceContent({ evidence, uri }: { evidence: EvidenceV1; uri: string }) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="mt-4 space-y-6">
      {/* Summary */}
      <div className="bg-cream-dark rounded-lg p-5">
        <span className="label-mono text-teal">Summary</span>
        <p className="text-sm text-ink mt-2 leading-relaxed font-serif">
          {evidence.summary}
        </p>
      </div>

      {/* Metadata */}
      <div className="space-y-2">
        <span className="label-mono">Evidence Metadata</span>
        <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-2">
          <MetaRow label="Policy" value={evidence.policyName} />
          <MetaRow label="Agent Id" value={evidence.agentId} />
          <MetaRow label="Wallet" value={truncate(evidence.wallet)} mono />
          <MetaRow label="Chain" value={`Sepolia (${evidence.chainId})`} />
          <MetaRow
            label="Timestamp"
            value={new Date(evidence.timestamp * 1000).toLocaleString()}
          />
          <MetaRow label="Request Hash" value={truncate(evidence.requestHash)} mono />
        </div>
      </div>

      {/* Rule Evaluations */}
      <div>
        <span className="label-mono">Rule Evaluations</span>
        <div className="mt-3 space-y-3">
          {evidence.ruleEvaluations.map((rule, i) => (
            <div
              key={i}
              className={`border-l-2 pl-4 py-3 ${
                rule.verdict === "pass"
                  ? "border-teal/40"
                  : "border-fail/40"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded ${
                    rule.verdict === "pass"
                      ? "bg-teal/10 text-teal"
                      : "bg-fail/10 text-fail"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      rule.verdict === "pass" ? "bg-teal" : "bg-fail"
                    }`}
                  />
                  {rule.verdict === "pass" ? "Pass" : "Fail"}
                </span>
                <span className="font-mono text-xs text-ink-light">
                  {Math.round(rule.confidence * 100)}% confidence
                </span>
              </div>

              <p className="text-sm text-ink font-serif">{rule.criteria}</p>
              <p className="text-xs text-ink-light mt-1 leading-relaxed">
                {rule.reasoning}
              </p>

              <div className="flex items-center gap-3 mt-2">
                <span className="font-mono text-xs tracking-wide px-2 py-0.5 bg-cream-dark rounded text-ink-light">
                  {rule.dataSource}
                </span>
              </div>

              {rule.dataUsed && (
                <details className="mt-2">
                  <summary className="font-mono text-xs text-ink-light cursor-pointer hover:text-ink transition-colors">
                    Data used
                  </summary>
                  <pre className="mt-1 text-[0.7rem] text-ink-light bg-cream-dark p-3 rounded overflow-x-auto leading-relaxed font-mono">
                    {rule.dataUsed}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Data Snapshot */}
      {evidence.dataSnapshot &&
        Object.keys(evidence.dataSnapshot).length > 0 && (
          <div>
            <span className="label-mono">Data Snapshot</span>
            <pre className="mt-2 text-[0.7rem] text-ink-light bg-cream-dark p-4 rounded overflow-x-auto leading-relaxed font-mono max-h-60 overflow-y-auto">
              {JSON.stringify(evidence.dataSnapshot, null, 2)}
            </pre>
          </div>
        )}

      {/* Raw JSON toggle */}
      <div>
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="font-mono text-xs text-ink-light hover:text-ink transition-colors"
        >
          {showRaw ? "Hide raw JSON" : "Show raw JSON"}
        </button>
        <AnimatePresence>
          {showRaw && (
            <motion.pre
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-2 text-[0.7rem] text-ink-light bg-cream-dark p-4 rounded overflow-x-auto leading-relaxed font-mono max-h-96 overflow-y-auto"
            >
              {JSON.stringify(evidence, null, 2)}
            </motion.pre>
          )}
        </AnimatePresence>
      </div>

      {/* IPFS link */}
      <div className="pt-2 border-t border-border">
        <a
          href={uri.startsWith("ipfs://")
            ? `https://gateway.pinata.cloud/ipfs/${uri.slice(7)}`
            : uri
          }
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-ink-light hover:text-teal transition-colors"
        >
          View raw on IPFS gateway &rarr;
        </a>
      </div>
    </div>
  );
}

function MetaRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50">
      <span className="font-mono text-xs text-ink-light">{label}</span>
      <span
        className={`text-sm text-ink ${mono ? "font-mono text-xs" : "font-serif"}`}
      >
        {value}
      </span>
    </div>
  );
}

function truncate(str: string): string {
  if (!str) return "";
  if (str.length > 20) return `${str.slice(0, 8)}...${str.slice(-6)}`;
  return str;
}
