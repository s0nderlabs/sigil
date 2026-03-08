"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { PolicyDetail } from "./policy-detail";
import { CopyButton } from "@/components/copy-button";
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

export function PolicyList({ policies }: { policies: PolicyRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (policies.length === 0) {
    return (
      <p className="text-sm text-ink-light py-12 text-center">
        No policies registered yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {policies.map((policy, i) => (
        <motion.div
          key={policy.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, duration: 0.4 }}
        >
          <div
            role="button"
            tabIndex={0}
            onClick={() => setExpanded(expanded === policy.id ? null : policy.id)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(expanded === policy.id ? null : policy.id); } }}
            className="w-full text-left py-5 border-b border-border hover:border-ink-light/30 transition-colors group cursor-pointer"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-lg text-ink group-hover:text-teal transition-colors">
                    {policy.name}
                  </h3>
                  <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                    policy.is_active ? "bg-teal/10 text-teal" : "bg-fail/10 text-fail"
                  }`}>
                    {policy.is_active ? "Active" : "Inactive"}
                  </span>
                  {policy.is_public && (
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-cream-dark text-ink-light">
                      Public
                    </span>
                  )}
                </div>
                <p className="text-sm text-ink-light mt-1 line-clamp-2">
                  {policy.description}
                </p>
                <span className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-xs text-ink-light group/copy">
                  <span className="text-ink-light/60">Policy ID:</span>
                  {policy.id.slice(0, 10)}...{policy.id.slice(-6)}
                  <CopyButton value={policy.id} className="opacity-0 group-hover/copy:opacity-100 text-ink-light hover:text-ink" />
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0 pt-1">
                <span className="label-mono">
                  {policy.rules.length} rule{policy.rules.length !== 1 ? "s" : ""}
                </span>
                <Link
                  href={`/policies/${policy.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-ink-light/50 hover:text-teal transition-all opacity-0 group-hover:opacity-100"
                  title="Open full page"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </Link>
                <span
                  className={`transition-transform duration-300 text-ink-light ${
                    expanded === policy.id ? "rotate-45" : ""
                  }`}
                >
                  +
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ink-light/60 tracking-wide group/addr">
                <span className="text-ink-light/40">Registered by:</span>
                {policy.registered_by.slice(0, 6)}...{policy.registered_by.slice(-4)}
                <CopyButton value={policy.registered_by} className="opacity-0 group-hover/addr:opacity-100 text-ink-light/60 hover:text-ink-light" />
              </span>
              <span className="font-mono text-[11px] text-ink-light/60 tracking-wide">
                {new Date(policy.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          <AnimatePresence>
            {expanded === policy.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <PolicyDetail rules={policy.rules} policyId={policy.id} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}
