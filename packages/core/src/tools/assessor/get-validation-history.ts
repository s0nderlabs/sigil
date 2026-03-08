import { z } from "zod";
import { parseAbiItem } from "viem";
import { createRpcClient } from "../../clients/rpc.js";
import { SEPOLIA_ADDRESSES } from "../../constants/addresses.js";
import { type ToolDefinition, toolResponse } from "../types.js";

const VALIDATION_RESPONSE_EVENT = parseAbiItem(
  "event ValidationResponse(address indexed validatorAddress, uint256 indexed agentId, bytes32 indexed requestHash, uint8 response, string responseURI, bytes32 responseHash, string tag)"
);

export const getValidationHistory: ToolDefinition = {
  name: "get_validation_history",
  description:
    "Query the 8004 Validation Registry for past validation responses. Can filter by validator address.",
  inputSchema: z.object({
    validator: z
      .string()
      .optional()
      .describe("Validator address to filter by (optional)"),
    agentId: z
      .number()
      .optional()
      .describe("Agent token ID to filter by (optional)"),
    requestHash: z
      .string()
      .optional()
      .describe("Request hash to filter by (optional)"),
  }),
  handler: async (args) => {
    const client = createRpcClient();

    // Public RPCs limit log queries to ~50K blocks. Paginate backward
    // from latest in chunks to find all ValidationResponse events.
    const latestBlock = await client.getBlockNumber();
    const CHUNK = 49_000n;
    const MIN_BLOCK = 5_000_000n; // Validation Registry deployed well after this
    let toBlock = latestBlock;
    const validations: {
      validator: string | undefined;
      agentId: number | undefined;
      requestHash: string | undefined;
      response: number | undefined;
      responseURI: string | undefined;
      responseHash: string | undefined;
      tag: string | undefined;
      blockNumber: number;
      transactionHash: string | null;
    }[] = [];

    while (toBlock > MIN_BLOCK) {
      const fromBlock = toBlock - CHUNK > MIN_BLOCK ? toBlock - CHUNK : MIN_BLOCK;
      const logs = await client.getLogs({
        address: SEPOLIA_ADDRESSES.validationRegistry as `0x${string}`,
        event: VALIDATION_RESPONSE_EVENT,
        args: {
          validatorAddress: args.validator
            ? (args.validator as `0x${string}`)
            : undefined,
          agentId: args.agentId
            ? BigInt(args.agentId)
            : undefined,
          requestHash: args.requestHash
            ? (args.requestHash as `0x${string}`)
            : undefined,
        },
        fromBlock,
        toBlock,
      });
      for (const log of logs) {
        validations.push({
          validator: log.args.validatorAddress,
          agentId: log.args.agentId != null ? Number(log.args.agentId) : undefined,
          requestHash: log.args.requestHash,
          response: log.args.response,
          responseURI: log.args.responseURI,
          responseHash: log.args.responseHash,
          tag: log.args.tag,
          blockNumber: Number(log.blockNumber),
          transactionHash: log.transactionHash,
        });
      }
      toBlock = fromBlock - 1n;
    }

    return toolResponse({ validations, totalCount: validations.length });
  },
};
