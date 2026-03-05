import { z } from "zod";
import { formatUnits } from "viem";
import { createRpcClient } from "../../clients/rpc.js";
import { type ToolDefinition, toolResponse } from "../types.js";

const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
] as const;

export const getTokenBalance: ToolDefinition = {
  name: "get_token_balance",
  description:
    "Get the ERC-20 token balance of an address on Sepolia. Returns balance, decimals, and symbol.",
  inputSchema: z.object({
    address: z.string().describe("Ethereum address to check"),
    tokenAddress: z.string().describe("ERC-20 token contract address"),
  }),
  handler: async (args) => {
    const client = createRpcClient();
    const addr = args.address as `0x${string}`;
    const token = args.tokenAddress as `0x${string}`;

    const [balanceResult, decimalsResult, symbolResult] = await Promise.allSettled([
      client.readContract({ address: token, abi: ERC20_ABI, functionName: "balanceOf", args: [addr] }),
      client.readContract({ address: token, abi: ERC20_ABI, functionName: "decimals" }),
      client.readContract({ address: token, abi: ERC20_ABI, functionName: "symbol" }),
    ]);

    const balance = balanceResult.status === "fulfilled" ? (balanceResult.value as bigint) : 0n;
    const decimals = decimalsResult.status === "fulfilled" ? (decimalsResult.value as number) : 18;
    const symbol = symbolResult.status === "fulfilled" ? (symbolResult.value as string) : "UNKNOWN";

    return toolResponse({
      balance: formatUnits(balance, decimals),
      balanceRaw: balance.toString(),
      decimals,
      symbol,
    });
  },
};
