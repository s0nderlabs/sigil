"use client";

import { useState } from "react";

interface AgentLookupProps {
  onSearch: (agentId: string) => void;
  isLoading: boolean;
}

export function AgentLookup({ onSearch, isLoading }: AgentLookupProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) onSearch(value.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter Agent ID (e.g. 1591)"
        className="flex-1 bg-transparent px-4 py-3 border border-border font-mono text-sm text-ink placeholder:text-ink-light/50 outline-none focus:border-teal/40 transition-colors"
      />
      <button
        type="submit"
        disabled={!value.trim() || isLoading}
        className="px-5 py-3 bg-teal text-cream font-mono text-sm tracking-wide hover:bg-teal-light disabled:opacity-30 transition-all"
      >
        {isLoading ? "..." : "Lookup"}
      </button>
    </form>
  );
}
