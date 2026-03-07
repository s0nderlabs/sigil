"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { AgentLookup } from "@/components/dashboard/agent-lookup";
import { ComplianceStatus } from "@/components/dashboard/compliance-status";
import { AssessmentHistory } from "@/components/dashboard/assessment-history";
import { useAssessments } from "@/hooks/use-assessments";
import { SEPOLIA_ADDRESSES, IDENTITY_REGISTRY_ABI } from "@sigil/core/constants";

export default function DashboardPage() {
  const [agentId, setAgentId] = useState<string>("");
  const [searchId, setSearchId] = useState<string>("");

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

  const latestAssessment = assessments?.[0];

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-serif text-3xl text-ink mb-2">Compliance Dashboard</h1>
      <p className="text-sm text-ink-light mb-10">
        Look up an ERC-8004 agent to view its on-chain identity and compliance status.
      </p>

      <AgentLookup onSearch={handleSearch} isLoading={assessmentsLoading} />

      {searchId && (
        <div className="mt-12 space-y-10">
          {/* On-chain identity */}
          <div>
            <span className="label-mono">On-Chain Identity</span>
            <div className="mt-4 space-y-3">
              <Row label="Agent ID" value={`#${searchId}`} />
              <Row
                label="Wallet"
                value={wallet ? String(wallet) : "Loading..."}
                mono
              />
              <Row
                label="Owner"
                value={owner ? String(owner) : "Loading..."}
                mono
              />
              <Row
                label="Token URI"
                value={tokenURI ? String(tokenURI) : "Loading..."}
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
                />
              </div>
            </div>
          )}

          {/* History */}
          {assessments && assessments.length > 0 && (
            <div>
              <span className="label-mono">Assessment History</span>
              <div className="mt-4">
                <AssessmentHistory assessments={assessments} />
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

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border">
      <span className="font-mono text-xs text-ink-light tracking-wide">
        {label}
      </span>
      <span className={`text-sm text-ink ${mono ? "font-mono text-xs" : "font-serif"}`}>
        {value.length > 42 ? `${value.slice(0, 20)}...${value.slice(-8)}` : value}
      </span>
    </div>
  );
}
