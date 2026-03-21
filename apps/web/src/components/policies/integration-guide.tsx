"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CopyButton } from "@/components/copy-button";

const SIGIL_ADDRESS = "0x2A1F759EC07d1a4177f845666dA0a6d82c37c11f";
const SERVER_URL = "https://api.sigil.s0nderlabs.xyz";

type Tab = "protocol" | "agent";

function CodeBlock({ language, code }: { language: string; code: string }) {
  return (
    <div className="rounded-lg overflow-hidden bg-ink">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06]">
        <span className="font-mono text-[10px] text-white/30 uppercase tracking-[0.12em]">
          {language}
        </span>
        <CopyButton
          value={code}
          className="text-white/20 hover:text-white/50"
        />
      </div>
      <pre className="px-4 py-3.5 overflow-x-auto">
        <code className="font-mono text-[12.5px] leading-[1.7] text-[#E8E6DA]">
          {code}
        </code>
      </pre>
    </div>
  );
}

function Step({
  number,
  title,
  description,
  children,
  isLast,
}: {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center shrink-0 pt-0.5">
        <span className="font-mono text-[11px] text-teal w-6 h-6 flex items-center justify-center rounded-full border border-teal/25 bg-teal/[0.04]">
          {number}
        </span>
        {!isLast && <div className="w-px flex-1 bg-border/60 mt-2" />}
      </div>
      <div className={`min-w-0 flex-1 ${isLast ? "" : "pb-6"}`}>
        <h4 className="font-serif text-[15px] text-ink leading-tight">
          {title}
        </h4>
        <p className="text-xs text-ink-light mt-1 mb-3 leading-relaxed">
          {description}
        </p>
        {children}
      </div>
    </div>
  );
}

export function IntegrationGuide({
  policyId,
  variant = "inline",
}: {
  policyId: string;
  variant?: "inline" | "page";
}) {
  const [tab, setTab] = useState<Tab>("protocol");
  const layoutKey = policyId.slice(0, 8);

  return (
    <div className={variant === "page" ? "" : "mt-5 pt-5 border-t border-border"}>
      {variant === "inline" && (
        <span className="label-mono block mb-4">Integration Guide</span>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["protocol", "agent"] as const).map((t) => (
          <button
            key={t}
            onClick={(e) => {
              e.stopPropagation();
              setTab(t);
            }}
            className={`relative px-5 py-2.5 font-mono text-xs tracking-wide transition-colors ${
              tab === t ? "text-ink" : "text-ink-light hover:text-ink"
            }`}
          >
            {t === "protocol" ? "For Protocols" : "For Agents"}
            {tab === t && (
              <motion.div
                layoutId={`guide-tab-${layoutKey}`}
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-teal"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="mt-6"
        >
          {tab === "protocol" ? (
            <ProtocolGuide policyId={policyId} />
          ) : (
            <AgentGuide policyId={policyId} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function ProtocolGuide({ policyId }: { policyId: string }) {
  const interfaceCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface ISigil {
    function isCompliant(
        address agent,
        bytes32 policyId
    ) external view returns (bool);
}`;

  const implementationCode = `contract YourProtocol {
    ISigil constant SIGIL = ISigil(
        ${SIGIL_ADDRESS}
    );

    bytes32 public requiredPolicyId =
        ${policyId};

    modifier onlyCompliant() {
        require(
            SIGIL.isCompliant(msg.sender, requiredPolicyId),
            "Agent not compliant"
        );
        _;
    }

    function protectedAction() external onlyCompliant {
        // Your gated logic here
    }
}`;

  return (
    <div>
      <Step
        number="01"
        title="Define the interface"
        description="Import the ISigil interface to query on-chain compliance status."
      >
        <CodeBlock language="solidity" code={interfaceCode} />
      </Step>
      <Step
        number="02"
        title="Gate your contract"
        description="Add a compliance modifier using this policy. Any call to protectedAction will revert unless the caller has been assessed as compliant."
        isLast
      >
        <CodeBlock language="solidity" code={implementationCode} />
      </Step>
    </div>
  );
}

function AgentGuide({ policyId }: { policyId: string }) {
  const signCode = `# Your registered ERC-8004 agent ID and this policy
AGENT_ID="<your-agent-id>"
POLICY_ID="${policyId}"
TIMESTAMP=$(date +%s)

# EIP-191 message proving wallet ownership
MESSAGE="sigil:assess:\${AGENT_ID}:\${POLICY_ID}:\${TIMESTAMP}"
SIGNATURE=$(cast wallet sign "$MESSAGE" --private-key $PRIVATE_KEY)`;

  const requestCode = `curl -X POST ${SERVER_URL}/trigger-assessment \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentId": "'$AGENT_ID'",
    "policyId": "'$POLICY_ID'",
    "signature": "'$SIGNATURE'",
    "message": "'$MESSAGE'"
  }'`;

  const verifyCode = `// After assessment, compliance is queryable on-chain
bool compliant = ISigil(
    ${SIGIL_ADDRESS}
).isCompliant(
    agentWallet,
    ${policyId}
);`;

  return (
    <div>
      <Step
        number="01"
        title="Sign the request"
        description="Create an EIP-191 signature proving you control the agent's registered wallet."
      >
        <CodeBlock language="bash" code={signCode} />
      </Step>
      <Step
        number="02"
        title="Trigger assessment"
        description="Submit the signed request. The Assessor evaluates your agent against this policy's rules and writes the result on-chain."
      >
        <CodeBlock language="bash" code={requestCode} />
      </Step>
      <Step
        number="03"
        title="Verify on-chain"
        description="Once assessed, any contract can check your compliance status — no trusted third party needed."
        isLast
      >
        <CodeBlock language="solidity" code={verifyCode} />
      </Step>
    </div>
  );
}
