"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SPINNER_FRAMES = ["✦", "✧", "✶", "✷", "✸", "✹", "✺", "✻"];

const SIGIL_PHRASES = [
  "Analyzing Policy",
  "Reviewing Standards",
  "Checking Compliance",
  "Consulting Framework",
  "Evaluating Criteria",
  "Assessing Requirements",
  "Processing Rules",
  "Building Assessment",
  "Scanning Protocols",
  "Drafting Report",
];

const TEAL = "#4A7C6F";

export function TypingIndicator() {
  const [frameIndex, setFrameIndex] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(
    Math.floor(Math.random() * SIGIL_PHRASES.length)
  );

  // Spinner rotation: 100ms per frame
  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Phrase rotation: 1500ms per phrase
  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % SIGIL_PHRASES.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mb-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-2"
      >
        <span className="text-2xl font-mono" style={{ color: TEAL }}>
          {SPINNER_FRAMES[frameIndex]}
        </span>

        <AnimatePresence mode="wait">
          <motion.span
            key={phraseIndex}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 5 }}
            transition={{ duration: 0.3 }}
            className="text-sm font-medium"
          >
            <span style={{ color: TEAL, opacity: 0.9 }}>
              {SIGIL_PHRASES[phraseIndex]}...
            </span>
          </motion.span>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
