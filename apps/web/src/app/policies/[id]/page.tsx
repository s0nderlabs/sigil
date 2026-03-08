"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { usePolicies } from "@/hooks/use-policies";
import { CopyButton } from "@/components/copy-button";
import { IntegrationGuide } from "@/components/policies/integration-guide";

export default function PolicyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: policies, isLoading } = usePolicies();
  const policy = policies?.find((p) => p.id === id);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-sm text-ink-light text-center py-20">
          Loading...
        </p>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href="/policies"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-light hover:text-teal transition-colors"
        >
          &larr; Policies
        </Link>
        <p className="text-sm text-ink-light text-center py-20">
          Policy not found.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Back */}
      <Link
        href="/policies"
        className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-light hover:text-teal transition-colors"
      >
        &larr; Policies
      </Link>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mt-8"
      >
        <div className="flex items-start gap-3">
          <h1 className="font-display text-4xl text-ink leading-tight">
            {policy.name}
          </h1>
          <div className="flex items-center gap-2 pt-2.5">
            <span
              className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                policy.is_active
                  ? "bg-teal/10 text-teal"
                  : "bg-fail/10 text-fail"
              }`}
            >
              {policy.is_active ? "Active" : "Inactive"}
            </span>
            {policy.is_public && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-cream-dark text-ink-light">
                Public
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-ink-light mt-3 leading-relaxed max-w-2xl">
          {policy.description}
        </p>
      </motion.div>

      {/* Metadata */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05, duration: 0.4 }}
        className="mt-10 pt-8 border-t border-border"
      >
        <span className="label-mono">Details</span>
        <div className="mt-4">
          <Row label="Policy ID" value={policy.id} mono copyable />
          <Row
            label="Registered by"
            value={policy.registered_by}
            mono
            copyable
          />
          <Row
            label="Created"
            value={new Date(policy.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          />
          <Row
            label="Rules"
            value={`${policy.rules.length} rule${policy.rules.length !== 1 ? "s" : ""}`}
          />
        </div>
      </motion.div>

      {/* Rules */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="mt-10 pt-8 border-t border-border"
      >
        <span className="label-mono">Rules</span>
        <div className="mt-5 space-y-5">
          {policy.rules.map((rule, i) => (
            <div
              key={i}
              className="border-l-2 border-teal/20 pl-4 space-y-1.5"
            >
              <div className="label-mono text-teal">Rule {i + 1}</div>
              <p className="text-sm text-ink">{rule.criteria}</p>
              <span className="inline-block font-mono text-xs tracking-wide px-2 py-0.5 bg-cream-dark rounded text-ink-light">
                {rule.dataSource}
              </span>
              <p className="text-xs text-ink-light leading-relaxed">
                {rule.evaluationGuidance}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Integration Guide */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="mt-10 pt-8 border-t border-border"
      >
        <span className="label-mono block mb-4">Integration Guide</span>
        <IntegrationGuide policyId={policy.id} variant="page" />
      </motion.div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  copyable,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
}) {
  const display =
    value.length > 42
      ? `${value.slice(0, 20)}...${value.slice(-8)}`
      : value;

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border group/row">
      <span className="font-mono text-xs text-ink-light tracking-wide">
        {label}
      </span>
      <span
        className={`flex items-center gap-1.5 text-sm text-ink ${
          mono ? "font-mono text-xs" : "font-serif"
        }`}
      >
        {display}
        {copyable && (
          <CopyButton
            value={value}
            className="opacity-0 group-hover/row:opacity-100 text-ink-light hover:text-ink"
          />
        )}
      </span>
    </div>
  );
}
