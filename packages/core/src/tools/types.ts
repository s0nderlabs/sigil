import type { z } from "zod";

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: z.ZodObject<any>;
  handler: (
    args: any,
    context?: { sessionState?: Map<string, unknown> }
  ) => Promise<{ content: Array<{ type: "text"; text: string }> }>;
};

export function toolResponse(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}
