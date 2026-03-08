"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const leftLinks = [
  { href: "/inscribe", label: "Inscribe" },
  { href: "/dashboard", label: "Dashboard" },
];

const rightLinks = [
  { href: "/policies", label: "Policies" },
];

export function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const linkClass = (active: boolean) =>
    `relative font-serif text-[13px] tracking-wide transition-colors duration-300 ${
      active ? "text-teal" : "text-ink-light/60 hover:text-teal"
    }`;

  const dot = (
    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal" />
  );

  return (
    <nav className="sticky top-0 z-50 flex justify-center px-4 pt-3">
      <div
        className={`flex items-center justify-center gap-4 sm:gap-7 px-4 sm:px-6 py-2.5 rounded-full border transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          scrolled
            ? "bg-cream/70 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.06)] border-border/60"
            : "bg-transparent backdrop-blur-none shadow-none border-transparent"
        }`}
      >
        {/* Left links */}
        <div className="flex items-center gap-3 sm:gap-5">
          {leftLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} className={linkClass(isActive)}>
                {link.label}
                {isActive && dot}
              </Link>
            );
          })}
        </div>

        {/* Center logo */}
        <Link
          href="/"
          className="font-display italic text-[28px] text-ink tracking-tight leading-none hover:text-teal transition-colors duration-300"
        >
          Sigil
        </Link>

        {/* Right links + wallet */}
        <div className="flex items-center gap-3 sm:gap-5">
          {rightLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} className={linkClass(isActive)}>
                {link.label}
                {isActive && dot}
              </Link>
            );
          })}

          <ConnectButton.Custom>
            {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
              const ready = mounted;
              const connected = ready && account && chain;

              return (
                <div
                  {...(!ready && {
                    "aria-hidden": true,
                    style: { opacity: 0, pointerEvents: "none" as const, userSelect: "none" as const },
                  })}
                >
                  {connected ? (
                    <button
                      onClick={openAccountModal}
                      className={`font-serif tracking-wide transition-all duration-300 ${
                        scrolled
                          ? "text-[12px] px-3 py-1 rounded-full bg-teal/10 text-teal hover:bg-teal/20"
                          : "text-[13px] text-ink-light/60 hover:text-teal"
                      }`}
                    >
                      {chain.unsupported ? (
                        <span className="text-fail">Wrong network</span>
                      ) : (
                        account.displayName
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={openConnectModal}
                      className={`font-serif tracking-wide transition-all duration-300 ${
                        scrolled
                          ? "text-[12px] px-3 py-1 rounded-full bg-teal/10 text-teal hover:bg-teal/20"
                          : "text-[13px] text-ink-light/60 hover:text-teal"
                      }`}
                    >
                      Connect
                    </button>
                  )}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </div>
    </nav>
  );
}
