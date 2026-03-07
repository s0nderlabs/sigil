import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { AGENT_A_SYSTEM_PROMPT } from "@sigil/core/prompts";
import {
  getPolicies,
  createRule,
  savePolicy,
} from "@sigil/core/tools/agent-a";

function createAgentATools() {
  const tools = [getPolicies, createRule, savePolicy].map((def) =>
    tool(def.name, def.description, def.inputSchema.shape, async (args: any) => {
      return await def.handler(args);
    })
  );
  return tools;
}

/**
 * Streams onboarding responses as SSE-formatted strings.
 * Yields: event:session, event:delta, event:done, event:error
 */
export async function* streamOnboarding(params: {
  userMessage: string;
  sessionId?: string;
  authenticatedAddress: string;
}): AsyncGenerator<string> {
  const tools = createAgentATools();
  const server = createSdkMcpServer({ name: "sigil-agent-a", tools });

  const systemPrompt = `${AGENT_A_SYSTEM_PROMPT}\n\n## Session Context\nThe authenticated wallet address is: ${params.authenticatedAddress}. Use this as registeredBy when saving policies.`;

  const isResume = !!params.sessionId;

  const options: Record<string, unknown> = {
    model: process.env.CLAUDE_MODEL || "claude-opus-4-6",
    maxThinkingTokens: 10000,
    systemPrompt,
    mcpServers: { "sigil-tools": server },
    maxTurns: 15,
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true,
    persistSession: true,
  };

  if (isResume) {
    options.resume = params.sessionId;
  }

  let sessionId = params.sessionId || "";
  let fullText = "";

  for await (const msg of query({ prompt: params.userMessage, options: options as any })) {
    const m = msg as any;

    // Session init — emit sessionId
    if (m.type === "system" && m.subtype === "init") {
      sessionId = m.session_id;
      yield `event: session\ndata: ${JSON.stringify({ sessionId })}\n\n`;
    }

    // Stream events — extract text deltas from top-level assistant messages
    if (m.type === "stream_event" && m.parent_tool_use_id === null) {
      const evt = m.event;
      if (
        evt?.type === "content_block_delta" &&
        evt?.delta?.type === "text_delta" &&
        evt?.delta?.text
      ) {
        fullText += evt.delta.text;
        yield `event: delta\ndata: ${JSON.stringify({ text: evt.delta.text })}\n\n`;
      }
    }

    // Final result
    if (m.type === "result") {
      const resultText = m.result || fullText;
      yield `event: done\ndata: ${JSON.stringify({ result: resultText, sessionId })}\n\n`;
    }
  }
}
