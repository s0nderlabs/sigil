import { z } from "zod";
import { formatEther } from "viem";
import { createRpcClient } from "../../clients/rpc.js";
import { type ToolDefinition, toolResponse } from "../types.js";

export const getEthBalance: ToolDefinition = {
  name: "get_eth_balance",
  description: "Get the ETH balance of an Ethereum address on Sepolia",
  inputSchema: z.object({
    address: z.string().describe("Ethereum address to check"),
  }),
  handler: async (args) => {
    const client = createRpcClient();
    const balance = await client.getBalance({
      address: args.address as `0x${string}`,
    });
    return toolResponse({
      balance: formatEther(balance),
      balanceWei: balance.toString(),
    });
  },
};
