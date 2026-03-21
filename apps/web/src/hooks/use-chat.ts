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
  const targetContentRef = useRef("");
  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamingIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const doneRef = useRef(false);

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
      targetContentRef.current = "";
      streamingIdRef.current = assistantId;
      doneRef.current = false;

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMsg, assistantMsg],
        isLoading: true,
        error: null,
      }));

      // Progressive reveal: show content char-by-char toward the target
      const CHARS_PER_TICK = 40;
      const TICK_MS = 8;
      flushIntervalRef.current = setInterval(() => {
        const target = targetContentRef.current;
        const current = streamingContentRef.current;
        if (current.length < target.length) {
          const next = Math.min(current.length + CHARS_PER_TICK, target.length);
          streamingContentRef.current = target.slice(0, next);
          flushBuffer();
        } else if (doneRef.current && current.length >= target.length) {
          // All content revealed and stream finished
          stopFlush();
          streamingIdRef.current = null;
          setState((prev) => ({
            ...prev,
            isLoading: false,
            messages: prev.messages.map((m) =>
              m.id === assistantId
                ? { ...m, content: target, isStreaming: false }
                : m
            ),
          }));
        }
      }, TICK_MS);

      abortRef.current = apiStream(
        "/inscribe",
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
              targetContentRef.current += data.text;
            }

            if (event === "done") {
              if (data.sessionId) {
                setState((prev) => ({ ...prev, sessionId: data.sessionId }));
              }
              const fullText = data.result || targetContentRef.current;
              if (fullText) {
                targetContentRef.current = fullText;
              }
              doneRef.current = true;
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
            // Progressive reveal interval handles finalization
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
