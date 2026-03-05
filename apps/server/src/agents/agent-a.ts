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

export async function runOnboarding(userMessage: string): Promise<ReadableStream> {
  const tools = createAgentATools();
  const server = createSdkMcpServer({ name: "sigil-agent-a", tools });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const message of query({
          prompt: userMessage,
          options: {
            model: "claude-sonnet-4-6",
            systemPrompt: AGENT_A_SYSTEM_PROMPT,
            mcpServers: { "sigil-tools": server },
            maxTurns: 15,
            permissionMode: "bypassPermissions",
            allowDangerouslySkipPermissions: true,
          },
        })) {
          if ("result" in message) {
            controller.enqueue(new TextEncoder().encode(message.result));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return stream;
}
