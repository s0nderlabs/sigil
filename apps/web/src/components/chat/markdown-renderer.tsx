"use client";

import type { ComponentPropsWithoutRef } from "react";
import { Streamdown } from "streamdown";

interface MarkdownRendererProps {
  content: string;
  isAnimating?: boolean;
}

// Sigil-themed code block CSS using data-streamdown selectors
const sigilCSS = `
  [data-streamdown="code-block"] {
    border-radius: 0.75rem;
    border: 1px solid #E5E4DC;
    overflow: hidden;
    margin: 1rem 0;
  }
  [data-streamdown="code-block-header"] {
    background-color: #F5F5F0;
    border-bottom: 1px solid #E5E4DC;
    padding: 0.5rem 1rem;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem;
    color: #8A8A8A;
  }
  [data-streamdown="code-block-body"] {
    background-color: #FAFAF5;
    padding: 1rem;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8rem;
    line-height: 1.6;
    color: #191918;
    overflow-x: auto;
  }
  [data-streamdown="code-block-copy-button"],
  [data-streamdown="code-block-download-button"] {
    color: #8A8A8A;
    cursor: pointer;
    padding: 0.25rem;
    transition: color 0.2s;
  }
  [data-streamdown="code-block-copy-button"]:hover,
  [data-streamdown="code-block-download-button"]:hover {
    color: #4A7C6F;
  }
`;

const h1 = (props: ComponentPropsWithoutRef<"h1">) => (
  <h1 className="font-serif text-2xl text-ink mt-6 mb-3" {...props} />
);
const h2 = (props: ComponentPropsWithoutRef<"h2">) => (
  <h2 className="font-serif text-xl text-ink mt-5 mb-2" {...props} />
);
const h3 = (props: ComponentPropsWithoutRef<"h3">) => (
  <h3 className="font-serif text-lg text-ink mt-4 mb-2" {...props} />
);
const p = (props: ComponentPropsWithoutRef<"p">) => (
  <p className="mb-4 leading-relaxed text-ink/90" {...props} />
);
const ul = (props: ComponentPropsWithoutRef<"ul">) => (
  <ul className="list-disc pl-5 mb-4 marker:text-teal" {...props} />
);
const ol = (props: ComponentPropsWithoutRef<"ol">) => (
  <ol className="list-decimal pl-5 mb-4 marker:text-teal" {...props} />
);
const li = (props: ComponentPropsWithoutRef<"li">) => (
  <li className="leading-relaxed text-ink/90 mb-1" {...props} />
);
const blockquote = (props: ComponentPropsWithoutRef<"blockquote">) => (
  <blockquote
    className="border-l-2 border-teal/50 pl-4 my-4 text-ink-light italic"
    {...props}
  />
);
const a = (props: ComponentPropsWithoutRef<"a">) => (
  <a
    className="text-teal hover:text-teal/70 transition-colors underline underline-offset-2"
    target="_blank"
    rel="noopener noreferrer"
    {...props}
  />
);
const strong = (props: ComponentPropsWithoutRef<"strong">) => (
  <strong className="font-semibold text-ink" {...props} />
);
const em = (props: ComponentPropsWithoutRef<"em">) => (
  <em className="italic text-ink/95" {...props} />
);
const table = (props: ComponentPropsWithoutRef<"table">) => (
  <div className="overflow-x-auto rounded-lg border border-border my-4">
    <table className="w-full text-sm" {...props} />
  </div>
);
const thead = (props: ComponentPropsWithoutRef<"thead">) => (
  <thead className="bg-cream-dark" {...props} />
);
const th = (props: ComponentPropsWithoutRef<"th">) => (
  <th className="px-4 py-2 text-left font-mono text-xs text-ink-light font-semibold border-b border-border" {...props} />
);
const td = (props: ComponentPropsWithoutRef<"td">) => (
  <td className="px-4 py-2 border-b border-border" {...props} />
);
const hr = (props: ComponentPropsWithoutRef<"hr">) => (
  <hr className="border-none h-px bg-border my-6" {...props} />
);

export function MarkdownRenderer({ content, isAnimating = false }: MarkdownRendererProps) {
  return (
    <>
      <style>{sigilCSS}</style>
      <div className="markdown-renderer font-body text-[15px] lg:text-base max-w-2xl">
        <Streamdown
          isAnimating={isAnimating}
          components={{ h1, h2, h3, p, ul, ol, li, blockquote, a, strong, em, table, thead, th, td, hr } as any}
        >
          {content}
        </Streamdown>
      </div>
    </>
  );
}
