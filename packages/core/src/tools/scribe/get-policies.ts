import { z } from "zod";
import { createSupabaseClient } from "../../clients/supabase.js";
import { type ToolDefinition, toolResponse } from "../types.js";

export const getPolicies: ToolDefinition = {
  name: "get_policies",
  description:
    "Fetch all active compliance policies from the database. Returns policy details including rules.",
  inputSchema: z.object({}),
  handler: async () => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("policies")
      .select("*")
      .eq("is_active", true);

    if (error) {
      return toolResponse({ error: error.message });
    }

    return toolResponse({ policies: data ?? [], count: data?.length ?? 0 });
  },
};
