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
        className="flex-1 bg-cream-dark px-4 py-3 rounded-lg font-mono text-sm text-ink placeholder:text-ink-light/50 outline-none focus:ring-1 focus:ring-teal/30 transition-shadow"
      />
      <button
        type="submit"
        disabled={!value.trim() || isLoading}
        className="px-5 py-3 bg-ink text-cream font-mono text-sm tracking-wide rounded-lg hover:bg-ink/90 disabled:opacity-30 transition-all"
      >
        {isLoading ? "..." : "Lookup"}
      </button>
    </form>
  );
}
