"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { AsciiHero } from "@/components/ascii-hero";
import { SectionReveal } from "@/components/section-reveal";
import { useAssessments } from "@/hooks/use-assessments";
import { SEPOLIA_ADDRESSES } from "@sigil/core/constants";

const STEPS = [
  {
    num: "01",
    title: "Define",
    desc: "Create compliance policies through conversational AI. Specify rules, data sources, and evaluation criteria.",
  },
  {
    num: "02",
    title: "Assess",
    desc: "CRE triggers an autonomous AI assessor that evaluates on-chain agents against your policy rules.",
  },
  {
    num: "03",
    title: "Seal",
    desc: "Results are pinned to IPFS and recorded on-chain via the ERC-8004 Validation Registry. Trustless and verifiable.",
  },
];

const CONTRACTS = [
  { label: "Identity Registry", address: SEPOLIA_ADDRESSES.identityRegistry },
  { label: "Validation Registry", address: SEPOLIA_ADDRESSES.validationRegistry },
  { label: "Sigil Middleware", address: SEPOLIA_ADDRESSES.sigilMiddleware },
  { label: "CRE Sim Forwarder", address: SEPOLIA_ADDRESSES.creSimulationForwarder },
];

export default function Home() {
  const headlineRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!headlineRef.current) return;
    const words = headlineRef.current.querySelectorAll(".headline-word");
    gsap.from(words, {
      y: 30,
      opacity: 0,
      stagger: 0.08,
      duration: 0.6,
      ease: "cubic-bezier(0.16, 1, 0.3, 1)",
      delay: 0.8,
    });
  }, { scope: headlineRef });

  const { data: assessments } = useAssessments();

  return (
    <div>
      {/* Hero — ASCII canvas as full background with content overlaid */}
      <AsciiHero>
        <div className="text-center px-6">
          <div ref={headlineRef} className="mb-5 overflow-hidden pb-2">
            {["Compliance", "for the", "Agent", "Economy"].map((word, i) => (
              <span
                key={i}
                className="headline-word inline-block font-serif text-4xl sm:text-5xl lg:text-6xl text-ink mr-3"
              >
                {word}
              </span>
            ))}
          </div>

          <p className="text-ink-light text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            CRE-powered compliance layer for ERC-8004 AI agents.
            Define policies. Assess autonomously. Seal on-chain.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/onboard"
              className="px-6 py-3 bg-ink text-cream font-mono text-sm tracking-wide rounded-lg hover:bg-ink/90 transition-all"
            >
              Create Policy
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3 border border-border text-ink font-mono text-sm tracking-wide rounded-lg hover:border-ink-light transition-all"
            >
              Check Agent
            </Link>
          </div>
        </div>
      </AsciiHero>

      <div className="max-w-5xl mx-auto px-6">

      {/* How it works */}
      <section className="py-20">
        <SectionReveal>
          <span className="label-mono">How it works</span>
        </SectionReveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-10">
          {STEPS.map((step, i) => (
            <SectionReveal key={step.num} delay={i * 0.1}>
              <span className="font-mono text-3xl text-teal/30 font-light">{step.num}</span>
              <h3 className="font-serif text-2xl text-ink mt-2 mb-3">{step.title}</h3>
              <p className="text-sm text-ink-light leading-relaxed">{step.desc}</p>
            </SectionReveal>
          ))}
        </div>
      </section>

      {/* Deployed Contracts */}
      <section className="py-20 border-t border-border">
        <SectionReveal>
          <span className="label-mono">Deployed on Sepolia</span>
        </SectionReveal>
        <div className="mt-8 space-y-4">
          {CONTRACTS.map((c, i) => (
            <SectionReveal key={c.label} delay={i * 0.06}>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <span className="font-mono text-xs text-ink-light tracking-wide">
                  {c.label}
                </span>
                <a
                  href={`https://sepolia.etherscan.io/address/${c.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-teal hover:text-teal-light transition-colors"
                >
                  {c.address.slice(0, 6)}...{c.address.slice(-4)}
                </a>
              </div>
            </SectionReveal>
          ))}
        </div>
      </section>

      {/* Recent Assessments */}
      {assessments && assessments.length > 0 && (
        <section className="py-20 border-t border-border">
          <SectionReveal>
            <span className="label-mono">Recent Assessments</span>
          </SectionReveal>
          <div className="mt-8 space-y-3">
            {assessments.slice(0, 5).map((a: any, i: number) => (
              <SectionReveal key={a.id} delay={i * 0.05}>
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        a.compliant ? "bg-teal" : "bg-fail"
                      }`}
                    />
                    <span className="font-mono text-xs text-ink">
                      Agent {a.agent_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs font-semibold">{a.score}/100</span>
                    <span className="font-mono text-xs text-ink-light">
                      {a.tag}
                    </span>
                  </div>
                </div>
              </SectionReveal>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-12 border-t border-border text-center">
        <span className="label-mono">
          Built by s0nderlabs for Chainlink Convergence 2026
        </span>
      </footer>
      </div>
    </div>
  );
}
