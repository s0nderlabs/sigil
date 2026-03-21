export const isOpenRouterMode = () =>
  (process.env.ANTHROPIC_BASE_URL || "").includes("openrouter");

export function buildOpenRouterOptions() {
  const model = process.env.CLAUDE_MODEL || "minimax/minimax-m2.7";
  return isOpenRouterMode()
    ? {
        env: {
          ...process.env,
          ANTHROPIC_MODEL: model,
          ANTHROPIC_SMALL_FAST_MODEL: model,
          ANTHROPIC_DEFAULT_SONNET_MODEL: model,
          ANTHROPIC_DEFAULT_HAIKU_MODEL: model,
        },
      }
    : {
        model: process.env.CLAUDE_MODEL || "claude-opus-4-6",
        maxThinkingTokens: 10000,
      };
}
