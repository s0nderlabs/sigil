import { z } from "zod";
import { queryTransactionHistory } from "../../clients/hypersync.js";
import { createRpcClient } from "../../clients/rpc.js";
import { type ToolDefinition, toolResponse } from "../types.js";

export const getTransactionHistory: ToolDefinition = {
  name: "get_transaction_history",
  description:
    "Get the full transaction history of an Ethereum address on Sepolia. Returns the authoritative nonce (outbound tx count) from RPC and all indexed transactions from HyperSync.",
  inputSchema: z.object({
    address: z.string().describe("Ethereum address to query"),
  }),
  handler: async (args) => {
    const client = createRpcClient();

    const [nonce, hypersync] = await Promise.all([
      client.getTransactionCount({
        address: args.address as `0x${string}`,
      }),
      queryTransactionHistory(args.address),
    ]);

    return toolResponse({
      nonce,
      totalCount: Math.max(nonce, hypersync.totalCount),
      indexedCount: hypersync.totalCount,
      transactions: hypersync.transactions,
    });
  },
};
