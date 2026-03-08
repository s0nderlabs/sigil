"use client";

import { useState } from "react";
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
                <PolicyDetail rules={policy.rules} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}
