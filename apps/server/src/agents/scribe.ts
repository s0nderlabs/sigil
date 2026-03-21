import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { SCRIBE_SYSTEM_PROMPT } from "@sigil/core/prompts";
import {
  getPolicies,
  createRule,
  savePolicy,
} from "@sigil/core/tools/scribe";
import { buildOpenRouterOptions } from "./agent-config.js";

function createScribeTools() {
  const tools = [getPolicies, createRule, savePolicy].map((def) =>
    tool(def.name, def.description, def.inputSchema.shape, async (args: any) => {
      return await def.handler(args);
    })
  );
  return tools;
}

/**
 * Streams inscribe session responses as SSE-formatted strings.
 * Yields: event:session, event:delta, event:done, event:error
 */
export async function* streamInscribe(params: {
  userMessage: string;
  sessionId?: string;
  authenticatedAddress: string;
}): AsyncGenerator<string> {
  const tools = createScribeTools();
  const server = createSdkMcpServer({ name: "sigil-scribe", tools });

  const systemPrompt = `${SCRIBE_SYSTEM_PROMPT}\n\n## Session Context\nThe authenticated wallet address is: ${params.authenticatedAddress}. Use this as registeredBy when saving policies.`;

  const isResume = !!params.sessionId;

  const options: Record<string, unknown> = {
    ...buildOpenRouterOptions(),
    systemPrompt,
    mcpServers: { "sigil-tools": server },
    maxTurns: 15,
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true,
    persistSession: true,
    includePartialMessages: true,
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

    // Assistant messages — collect text from content blocks (non-streaming fallback)
    if (m.type === "assistant" && m.parent_tool_use_id === null && m.message?.content) {
      for (const block of m.message.content) {
        if (block.type === "text" && block.text && !fullText) {
          fullText += block.text;
        }
      }
    }

    // Final result
    if (m.type === "result") {
      const resultText = m.result || fullText;
      yield `event: done\ndata: ${JSON.stringify({ result: resultText, sessionId })}\n\n`;
    }
  }
}
