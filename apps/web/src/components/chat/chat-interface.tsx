"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";
import type { Message } from "@/hooks/use-chat";

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  onSend: (text: string) => void;
  onReset: () => void;
}

export function ChatInterface({
  messages,
  isLoading,
  error,
  onSend,
  onReset,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasStreamingMessage = messages.some((m) => m.isStreaming);
  const lastMessage = messages[messages.length - 1];

  // Auto-scroll on new messages and streaming content updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, lastMessage?.content?.length, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      if (input.trim()) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      } else {
        textareaRef.current.style.height = "";
      }
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] relative overflow-hidden">
      {/* Messages area */}
      <div ref={scrollRef} className="h-full overflow-y-auto px-4 lg:px-8 pt-6 pb-32">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-[calc(100%-4rem)] text-center">
              <p className="font-serif text-2xl text-ink mb-2">
                Define your compliance policy
              </p>
              <p className="text-sm text-ink-light max-w-md">
                Tell me what kind of AI agents your protocol wants to allow, and I&apos;ll
                help you create the rules to assess them.
              </p>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                role={msg.role}
                content={msg.content}
                isStreaming={msg.isStreaming}
              />
            ))}
          </AnimatePresence>

          {isLoading && !hasStreamingMessage && <TypingIndicator />}

          {error && (
            <div className="font-mono text-xs text-fail px-3 py-2 bg-fail/5 rounded">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Input bar — pinned to bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-4 lg:px-8 pt-2 pb-4 bg-gradient-to-t from-cream via-cream to-cream/0">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-border bg-cream overflow-hidden shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
            {/* Textarea area */}
            <div className="px-4 pt-3 pb-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your compliance requirements..."
                disabled={isLoading}
                rows={1}
                className="w-full bg-transparent resize-none outline-none font-body text-[15px] lg:text-base min-h-[24px] max-h-[200px] leading-relaxed placeholder:text-ink-light/50 disabled:opacity-50"
              />
            </div>
            {/* Toolbar row */}
            <div className="flex items-center justify-between px-3 pb-2.5">
              <div className="flex items-center">
                {messages.length > 0 && (
                  <button
                    onClick={onReset}
                    className="font-mono text-[11px] text-ink-light hover:text-ink transition-colors px-2 py-1 rounded hover:bg-ink/5"
                  >
                    Reset
                  </button>
                )}
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-ink text-cream hover:bg-ink/90 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                aria-label="Send message"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
