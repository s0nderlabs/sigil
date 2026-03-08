"use client";

import { useState, useMemo } from "react";
import { useReadContract } from "wagmi";
import { motion } from "framer-motion";
import { AgentLookup } from "@/components/dashboard/agent-lookup";
import { ComplianceStatus } from "@/components/dashboard/compliance-status";
import { AssessmentHistory } from "@/components/dashboard/assessment-history";
import { CopyButton } from "@/components/copy-button";
import { useAssessments } from "@/hooks/use-assessments";
import { usePolicies } from "@/hooks/use-policies";
import { SEPOLIA_ADDRESSES, IDENTITY_REGISTRY_ABI } from "@sigil/core/constants";

export default function DashboardPage() {
  const [agentId, setAgentId] = useState<string>("");
  const [searchId, setSearchId] = useState<string>("");

  // Fetch all assessments for the "recently assessed" list
  const { data: allAssessments } = useAssessments();
  const recentAgents = useMemo(() => {
    if (!allAssessments) return [];
    const seen = new Map<string, typeof allAssessments[0]>();
    for (const a of allAssessments) {
      if (!seen.has(a.agent_id)) seen.set(a.agent_id, a);
    }
    return Array.from(seen.values());
  }, [allAssessments]);

  const { data: wallet } = useReadContract({
    address: SEPOLIA_ADDRESSES.identityRegistry as `0x${string}`,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "getAgentWallet",
    args: searchId ? [BigInt(searchId)] : undefined,
    query: { enabled: !!searchId },
  });

  const { data: owner } = useReadContract({
    address: SEPOLIA_ADDRESSES.identityRegistry as `0x${string}`,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "ownerOf",
    args: searchId ? [BigInt(searchId)] : undefined,
    query: { enabled: !!searchId },
  });

  const { data: tokenURI } = useReadContract({
    address: SEPOLIA_ADDRESSES.identityRegistry as `0x${string}`,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "tokenURI",
    args: searchId ? [BigInt(searchId)] : undefined,
    query: { enabled: !!searchId },
  });

  const { data: assessments, isLoading: assessmentsLoading } = useAssessments(
    searchId ? { agentId: searchId } : undefined,
  );

  const handleSearch = (id: string) => {
    setAgentId(id);
    setSearchId(id);
  };

  const { data: policies } = usePolicies();
  const policyNames = new Map(policies?.map((p) => [p.id, p.name]));
  const latestAssessment = assessments?.[0];
  const latestPolicyName = latestAssessment
    ? policyNames.get(latestAssessment.policy_id)
    : undefined;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-serif text-3xl text-ink mb-2">Compliance Dashboard</h1>
      <p className="text-sm text-ink-light mb-10">
        Look up an ERC-8004 agent to view its on-chain identity and compliance status.
      </p>

      <AgentLookup onSearch={handleSearch} isLoading={assessmentsLoading} />

      {/* Recently assessed agents */}
      {!searchId && recentAgents.length > 0 && (
        <div className="mt-12">
          <span className="label-mono">Recently Assessed Agents</span>
          <div className="mt-5 space-y-0">
            {recentAgents.map((a, i) => (
              <motion.div
                key={a.agent_id}
                role="button"
                tabIndex={0}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                onClick={() => handleSearch(a.agent_id)}
                onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSearch(a.agent_id); } }}
                className="w-full text-left flex items-center justify-between py-4 border-b border-border hover:border-ink-light/30 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      a.compliant ? "bg-teal" : "bg-fail"
                    }`}
                  />
                  <div>
                    <span className="font-mono text-sm text-ink group-hover:text-teal transition-colors">
                      Agent #{a.agent_id}
                    </span>
                    <span className="ml-3 inline-flex items-center gap-1 font-mono text-xs text-ink-light/60">
                      {a.wallet.slice(0, 6)}...{a.wallet.slice(-4)}
                      <CopyButton value={a.wallet} className="opacity-0 group-hover:opacity-100 text-ink-light/60 hover:text-ink-light" />
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`font-mono text-xs font-semibold ${
                    a.compliant ? "text-teal" : "text-fail"
                  }`}>
                    {a.score}/100
                  </span>
                  <span className="font-mono text-[11px] text-ink-light/60">
                    {new Date(a.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-ink-light group-hover:text-teal transition-colors text-sm">
                    &rarr;
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {searchId && (
        <div className="mt-12 space-y-10">
          {/* Back to list */}
          <button
            onClick={() => { setSearchId(""); setAgentId(""); }}
            className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-light hover:text-teal transition-colors"
          >
            &larr; All agents
          </button>

          {/* On-chain identity */}
          <div>
            <span className="label-mono">On-Chain Identity</span>
            <div className="mt-4 space-y-3">
              <Row label="Agent ID" value={`#${searchId}`} />
              <Row
                label="Wallet"
                value={wallet ? String(wallet) : "Loading..."}
                mono
                copyable={!!wallet}
              />
              <Row
                label="Owner"
                value={owner ? String(owner) : "Loading..."}
                mono
                copyable={!!owner}
              />
              <Row
                label="Token URI"
                value={tokenURI ? String(tokenURI) : "Loading..."}
                copyable={!!tokenURI}
              />
            </div>
          </div>

          {/* Latest assessment */}
          {latestAssessment && (
            <div>
              <span className="label-mono">Latest Assessment</span>
              <div className="mt-4">
                <ComplianceStatus
                  score={latestAssessment.score}
                  compliant={latestAssessment.compliant}
                  evidenceUri={latestAssessment.evidence_uri}
                  tag={latestAssessment.tag}
                  policyName={latestPolicyName}
                />
              </div>
            </div>
          )}

          {/* History */}
          {assessments && assessments.length > 1 && (
            <div>
              <span className="label-mono">Assessment History</span>
              <div className="mt-4">
                <AssessmentHistory assessments={assessments.slice(1)} />
              </div>
            </div>
          )}

          {assessments && assessments.length === 0 && (
            <p className="text-sm text-ink-light text-center py-8">
              No assessments found for this agent.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono, copyable }: { label: string; value: string; mono?: boolean; copyable?: boolean }) {
  const display = value.length > 42 ? `${value.slice(0, 20)}...${value.slice(-8)}` : value;
  return (
    <div className="flex items-center justify-between py-2 border-b border-border group/row">
      <span className="font-mono text-xs text-ink-light tracking-wide">
        {label}
      </span>
      <span className={`flex items-center gap-1.5 text-sm text-ink ${mono ? "font-mono text-xs" : "font-serif"}`}>
        {display}
        {copyable && (
          <CopyButton value={value} className="opacity-0 group-hover/row:opacity-100 text-ink-light hover:text-ink" />
        )}
      </span>
    </div>
  );
}
