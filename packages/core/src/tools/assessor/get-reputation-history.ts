import { z } from "zod";
import { createRpcClient } from "../../clients/rpc.js";
import { SEPOLIA_ADDRESSES } from "../../constants/addresses.js";
import { type ToolDefinition, toolResponse } from "../types.js";

const REPUTATION_REGISTRY_ABI = [
  {
    type: "function",
    name: "getClients",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getSummary",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddresses", type: "address[]" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
    ],
    outputs: [
      { name: "count", type: "uint64" },
      { name: "summaryValue", type: "int128" },
      { name: "summaryValueDecimals", type: "uint8" },
    ],
    stateMutability: "view",
  },
] as const;

export const getReputationHistory: ToolDefinition = {
  name: "get_reputation_history",
  description:
    "Query the ERC-8004 Reputation Registry for an agent's public reputation. Returns total feedback count, star rating summary (tag1='starred'), and list of clients who gave feedback.",
  inputSchema: z.object({
    agentId: z
      .string()
      .describe("The ERC-8004 agent token ID to look up reputation for"),
  }),
  handler: async (args) => {
    const client = createRpcClient();
    const registry = SEPOLIA_ADDRESSES.reputationRegistry as `0x${string}`;
    const agentId = BigInt(args.agentId);

    // Step 1: Get all clients who have given feedback
    const clients = (await client.readContract({
      address: registry,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: "getClients",
      args: [agentId],
    })) as `0x${string}`[];

    if (!clients || clients.length === 0) {
      return toolResponse({
        totalFeedbacks: 0,
        averageStarRating: null,
        starRatingCount: 0,
        starRatingDecimals: 0,
        clientCount: 0,
        clients: [],
      });
    }

    // Step 2: Get overall summary and starred summary in parallel
    const [overallResult, starredResult] = await Promise.allSettled([
      client.readContract({
        address: registry,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: "getSummary",
        args: [agentId, clients, "", ""],
      }),
      client.readContract({
        address: registry,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: "getSummary",
        args: [agentId, clients, "starred", ""],
      }),
    ]);

    // Parse overall feedback count
    let totalFeedbacks = 0;
    if (overallResult.status === "fulfilled") {
      const [count] = overallResult.value as [bigint, bigint, number];
      totalFeedbacks = Number(count);
    }

    // Parse star rating
    let averageStarRating: number | null = null;
    let starRatingCount = 0;
    let starRatingDecimals = 0;
    if (starredResult.status === "fulfilled") {
      const [count, summaryValue, decimals] = starredResult.value as [
        bigint,
        bigint,
        number,
      ];
      starRatingCount = Number(count);
      starRatingDecimals = decimals;
      if (starRatingCount > 0) {
        averageStarRating =
          Number(summaryValue) / 10 ** starRatingDecimals;
      }
    }

    return toolResponse({
      totalFeedbacks,
      averageStarRating,
      starRatingCount,
      starRatingDecimals,
      clientCount: clients.length,
      clients: clients.map((c) => c.toString()),
    });
  },
};
