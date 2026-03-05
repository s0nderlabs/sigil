import { z } from "zod";
import { createRpcClient } from "../../clients/rpc.js";
import { type ToolDefinition, toolResponse } from "../types.js";

export const checkContractCode: ToolDefinition = {
  name: "check_contract_code",
  description:
    "Check if an Ethereum address is a smart contract by inspecting its bytecode on Sepolia",
  inputSchema: z.object({
    address: z.string().describe("Ethereum address to check"),
  }),
  handler: async (args) => {
    const client = createRpcClient();
    const code = await client.getCode({
      address: args.address as `0x${string}`,
    });
    const isContract = !!code && code !== "0x";
    const codeSize = code ? (code.length - 2) / 2 : 0;
    return toolResponse({ isContract, codeSize });
  },
};
