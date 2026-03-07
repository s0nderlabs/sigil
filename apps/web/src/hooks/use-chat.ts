"use client";

import { useState, useCallback, useRef } from "react";
import { apiStream } from "@/lib/api";
import type { SiweAuth } from "./use-siwe";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  sessionId: string | null;
  error: string | null;
}

export function useChat() {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    sessionId: null,
    error: null,
  });

  const streamingContentRef = useRef("");
  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamingIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const flushBuffer = useCallback(() => {
    const content = streamingContentRef.current;
    const id = streamingIdRef.current;
    if (!id || !content) return;

    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((m) =>
        m.id === id ? { ...m, content } : m
      ),
    }));
  }, []);

  const stopFlush = useCallback(() => {
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current);
      flushIntervalRef.current = null;
    }
    flushBuffer();
  }, [flushBuffer]);

  const sendMessage = useCallback(
    (text: string, walletAddress: string, siweAuth: SiweAuth) => {
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: Date.now(),
      };

      const assistantId = `assistant-${Date.now()}`;
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        isStreaming: true,
      };

      streamingContentRef.current = "";
      streamingIdRef.current = assistantId;

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMsg, assistantMsg],
        isLoading: true,
        error: null,
      }));

      // Start 50ms flush interval
      flushIntervalRef.current = setInterval(flushBuffer, 50);

      abortRef.current = apiStream(
        "/onboard",
        {
          message: siweAuth.message,
          signature: siweAuth.signature,
          prompt: text,
          sessionId: state.sessionId,
        },
        {
          onEvent: (event, data) => {
            if (event === "session" && data.sessionId) {
              setState((prev) => ({ ...prev, sessionId: data.sessionId }));
            }

            if (event === "delta" && data.text) {
              streamingContentRef.current += data.text;
            }

            if (event === "done") {
              if (data.sessionId) {
                setState((prev) => ({ ...prev, sessionId: data.sessionId }));
              }
              // If no deltas came through, simulate streaming with character reveal
              if (data.result && !streamingContentRef.current) {
                const fullText = data.result;
                let charIndex = 0;
                const CHARS_PER_TICK = 3;
                const TICK_MS = 12;

                // Replace the 50ms flush interval with character reveal
                stopFlush();
                flushIntervalRef.current = setInterval(() => {
                  charIndex = Math.min(charIndex + CHARS_PER_TICK, fullText.length);
                  streamingContentRef.current = fullText.slice(0, charIndex);
                  flushBuffer();

                  if (charIndex >= fullText.length) {
                    stopFlush();
                    streamingIdRef.current = null;
                    setState((prev) => ({
                      ...prev,
                      isLoading: false,
                      messages: prev.messages.map((m) =>
                        m.id === assistantId
                          ? { ...m, content: fullText, isStreaming: false }
                          : m
                      ),
                    }));
                  }
                }, TICK_MS);
                return; // Don't let onDone finalize immediately
              } else if (data.result) {
                streamingContentRef.current = data.result;
              }
            }

            if (event === "error") {
              setState((prev) => ({
                ...prev,
                error: data.error || "Stream error",
                isLoading: false,
              }));
              stopFlush();
            }
          },
          onError: (err) => {
            setState((prev) => ({
              ...prev,
              error: err.message,
              isLoading: false,
            }));
            stopFlush();
          },
          onDone: () => {
            // If character reveal is running, let it handle finalization
            if (flushIntervalRef.current) return;

            stopFlush();
            streamingIdRef.current = null;

            setState((prev) => ({
              ...prev,
              isLoading: false,
              messages: prev.messages.map((m) =>
                m.id === assistantId
                  ? { ...m, content: streamingContentRef.current, isStreaming: false }
                  : m
              ),
            }));
          },
        },
        { "x-wallet-address": walletAddress },
      );
    },
    [state.sessionId, flushBuffer, stopFlush],
  );

  const reset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    stopFlush();
    streamingContentRef.current = "";
    streamingIdRef.current = null;
    setState({ messages: [], isLoading: false, sessionId: null, error: null });
  }, [stopFlush]);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    sessionId: state.sessionId,
    error: state.error,
    sendMessage,
    reset,
  };
}
