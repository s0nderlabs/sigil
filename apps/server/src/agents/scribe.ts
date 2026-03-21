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
 * Single-shot policy creation for MCP agents.
 * Translates natural language rules into structured rules, creates and saves the policy.
 */
export async function runAutoInscribe(params: {
  name: string;
  description: string;
  rules: string;
  visibility: string;
  authenticatedAddress: string;
}): Promise<{ policyId: string; rules: Array<{ criteria: string; dataSource: string; evaluationGuidance: string }> }> {
  const tools = createScribeTools();
  const server = createSdkMcpServer({ name: "sigil-scribe-auto", tools });

  const systemPrompt = `${SCRIBE_SYSTEM_PROMPT}\n\n## Session Context\nThe authenticated wallet address is: ${params.authenticatedAddress}. Use this as registeredBy when saving policies.`;

  const prompt = `Create a compliance policy with these exact details:
- Name: "${params.name}"
- Description: "${params.description}"
- Visibility: ${params.visibility}
- Registered By: ${params.authenticatedAddress}

Rules to create (translate each into a structured rule with criteria, dataSource, and evaluationGuidance):
${params.rules}

Execute immediately: call create_rule for each rule, then call save_policy with the name, description, visibility, rules array, and registeredBy address. Do not ask questions.

After saving, return a JSON object with: { policyId, rules }`;

  let lastText = "";
  for await (const message of query({
    prompt,
    options: {
      ...buildOpenRouterOptions(),
      systemPrompt,
      mcpServers: { "sigil-tools": server },
      maxTurns: 15,
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      outputFormat: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            policyId: { type: "string" },
            rules: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  criteria: { type: "string" },
                  dataSource: { type: "string" },
                  evaluationGuidance: { type: "string" },
                },
                required: ["criteria", "dataSource", "evaluationGuidance"],
              },
            },
          },
          required: ["policyId", "rules"],
          additionalProperties: false,
        },
      },
    },
  })) {
    const msg = message as any;

    // Collect text from assistant messages (MiniMax puts results here)
    if (msg.type === "assistant" && msg.parent_tool_use_id === null && msg.message?.content) {
      for (const block of msg.message.content) {
        if (block.type === "text" && block.text) {
          lastText = block.text;
        }
      }
    }

    if (msg.type === "result") {
      if (msg.structured_output && typeof msg.structured_output === "object") {
        return msg.structured_output;
      }

      if (msg.result && typeof msg.result === "string" && msg.result.length > 0) {
        try { return JSON.parse(msg.result); } catch { /* not JSON */ }
      }

      // Try extracting JSON from assistant message text
      if (lastText) {
        const jsonMatch = lastText.match(/\{[\s\S]*"policyId"[\s\S]*\}/);
        if (jsonMatch) {
          try { return JSON.parse(jsonMatch[0]); } catch { /* not valid JSON */ }
        }
      }

      if (msg.is_error) {
        throw new Error(`Scribe error after ${msg.num_turns} turns`);
      }

      // Policy may have been saved even if structured output failed — query Supabase
      const { createSupabaseClient } = await import("@sigil/core/clients");
      const supabase = createSupabaseClient();
      const { data } = await supabase
        .from("policies")
        .select("id, rules")
        .eq("name", params.name)
        .eq("registered_by", params.authenticatedAddress)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        return { policyId: data.id, rules: data.rules };
      }

      throw new Error("Scribe returned empty result");
    }
  }

  throw new Error("Scribe did not produce a result");
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
