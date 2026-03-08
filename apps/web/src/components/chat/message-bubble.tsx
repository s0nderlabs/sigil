"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { MarkdownRenderer } from "./markdown-renderer";
import { TypingIndicator } from "./typing-indicator";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

function UserBubble({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { x: 50, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.4, ease: "power2.out" }
    );
  }, []);

  return (
    <div ref={ref} className="flex justify-end mb-4">
      <div className="max-w-[80%] lg:max-w-[60%]">
        <div className="rounded-[24px] px-5 py-3 bg-teal text-cream">
          <p className="font-serif text-[15px] lg:text-base leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}

function AssistantBubble({
  content,
  isStreaming,
}: {
  content: string;
  isStreaming?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-4"
    >
      <div className="text-sm lg:text-base">
        {content ? (
          <MarkdownRenderer content={content} isAnimating={isStreaming} />
        ) : isStreaming ? (
          <TypingIndicator />
        ) : null}
      </div>
    </motion.div>
  );
}

export function MessageBubble({ role, content, isStreaming }: MessageBubbleProps) {
  if (role === "user") {
    return <UserBubble content={content} />;
  }
  return <AssistantBubble content={content} isStreaming={isStreaming} />;
}
