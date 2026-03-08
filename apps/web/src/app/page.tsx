"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { AsciiHero } from "@/components/ascii-hero";
import { SectionReveal } from "@/components/section-reveal";
import { SEPOLIA_ADDRESSES } from "@sigil/core/constants";

const STEPS = [
  {
    num: "01",
    title: "Define",
    desc: "Describe what your protocol allows in plain language. Sigil turns your requirements into structured compliance rules. No forms, no code.",
  },
  {
    num: "02",
    title: "Assess",
    desc: "Chainlink CRE invokes an autonomous AI assessor that reads agent identity on-chain and evaluates against your policy. No human in the loop.",
  },
  {
    num: "03",
    title: "Seal",
    desc: "Evidence is pinned to IPFS. The compliance stamp is recorded on-chain through the Sigil contract. Permanent, verifiable, tamper-proof.",
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

  return (
    <div>
      {/* Hero */}
      <AsciiHero>
        <div className="text-center px-6">
          <div ref={headlineRef} className="mb-5 overflow-hidden pb-2">
            {["Compliance", "for the", "Agentic", "Economy"].map((word, i) => (
              <span
                key={i}
                className="headline-word inline-block font-display text-4xl sm:text-5xl lg:text-6xl text-ink mr-3"
              >
                {word}
              </span>
            ))}
          </div>

          <p className="text-ink-light text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            Autonomous compliance for ERC-8004 AI agents, powered by Chainlink CRE.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/inscribe"
              className="px-6 py-3 bg-teal text-cream font-mono text-sm tracking-wide hover:bg-teal-light transition-all"
            >
              Create Policy
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3 border border-border text-ink font-mono text-sm tracking-wide hover:border-ink-light transition-all"
            >
              Check Agent
            </Link>
          </div>
        </div>
      </AsciiHero>

      <div className="max-w-5xl mx-auto px-6">

      {/* How it works */}
      <section className="pt-32 pb-24">
        <SectionReveal>
          <span className="font-display italic text-2xl text-teal/70">How it works</span>
        </SectionReveal>
        <div className="mt-8">
          {STEPS.map((step, i) => (
            <SectionReveal key={step.num} delay={i * 0.12}>
              <div className={`relative overflow-hidden ${i < STEPS.length - 1 ? "border-b border-teal/15" : ""}`}>
                <div className="py-10 group">
                  {/* Giant decorative number */}
                  <span
                    className="absolute -right-4 top-1/2 -translate-y-1/2 font-display italic text-[clamp(100px,15vw,180px)] leading-none text-ink/[0.03] group-hover:text-teal/[0.08] transition-colors duration-700 select-none pointer-events-none"
                    aria-hidden="true"
                  >
                    {step.num}
                  </span>
                  {/* Content */}
                  <div className="relative z-10">
                    <h3 className="font-serif text-2xl sm:text-3xl text-ink mb-3 group-hover:text-teal transition-colors duration-300">
                      {step.title}
                    </h3>
                    <p className="text-sm text-ink-light leading-relaxed max-w-lg">
                      {step.desc}
                    </p>
                  </div>
                </div>
              </div>
            </SectionReveal>
          ))}
        </div>
      </section>

      {/* Section break */}
      <SectionReveal>
        <div className="flex justify-center py-12">
          <span className="font-display italic text-2xl text-teal/15 select-none">~</span>
        </div>
      </SectionReveal>

      {/* Deployed Contracts */}
      <section className="pb-24">
        <SectionReveal>
          <span className="font-display italic text-2xl text-teal/70">Deployed on Sepolia</span>
        </SectionReveal>
        <SectionReveal>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-px bg-border border border-border">
            {CONTRACTS.map((c) => (
              <a
                key={c.label}
                href={`https://sepolia.etherscan.io/address/${c.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-cream p-6 group hover:-translate-y-px hover:shadow-[0_2px_12px_rgba(74,124,111,0.08)] transition-all duration-300"
              >
                <span className="font-mono text-[10px] text-ink-light group-hover:text-teal/60 tracking-[0.15em] uppercase block mb-3 transition-colors duration-300">
                  {c.label}
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[13px] text-ink group-hover:text-teal transition-colors duration-300">
                    {c.address.slice(0, 6)}...{c.address.slice(-4)}
                  </span>
                  <svg
                    className="w-3.5 h-3.5 text-ink-light/30 group-hover:text-teal group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 17L17 7" />
                    <path d="M7 7h10v10" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </SectionReveal>
      </section>

      {/* Footer */}
      <footer className="relative pt-32 pb-20 overflow-hidden">
        {/* Watermark */}
        <span
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-display italic text-[clamp(60px,10vw,140px)] leading-none text-ink/[0.03] select-none pointer-events-none whitespace-nowrap"
          aria-hidden="true"
        >
          s0nderlabs
        </span>

        <div className="relative z-10 flex flex-col items-center gap-8">
          {/* Studio signature */}
          <div className="text-center">
            <span className="font-display italic text-lg text-ink/80">Sigil</span>
            <p className="font-mono text-[11px] text-ink-light/50 tracking-[0.12em] mt-2">
              Built for Chainlink Convergence 2026
            </p>
          </div>

          {/* External links */}
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/s0nderlabs/sigil"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] text-ink-light/40 hover:text-teal transition-colors duration-300 tracking-wide"
            >
              GitHub
            </a>
            <span className="text-ink-light/15 text-[8px] select-none" aria-hidden>&bull;</span>
            <a
              href={`https://sepolia.etherscan.io/address/${SEPOLIA_ADDRESSES.sigilMiddleware}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] text-ink-light/40 hover:text-teal transition-colors duration-300 tracking-wide"
            >
              Etherscan
            </a>
            <span className="text-ink-light/15 text-[8px] select-none" aria-hidden>&bull;</span>
            <a
              href="https://eips.ethereum.org/EIPS/eip-8004"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] text-ink-light/40 hover:text-teal transition-colors duration-300 tracking-wide"
            >
              ERC-8004
            </a>
          </div>

          {/* Colophon */}
          <span className="font-mono text-[10px] text-ink-light/25 tracking-[0.2em]">
            Sepolia / 11155111
          </span>
        </div>
      </footer>
      </div>
    </div>
  );
}
