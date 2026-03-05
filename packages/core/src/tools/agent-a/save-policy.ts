import { z } from "zod";
import {
  createWalletClient,
  http,
  encodePacked,
  keccak256,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { createSupabaseClient } from "../../clients/supabase.js";
import { SIGIL_ABI } from "../../constants/abis.js";
import { SEPOLIA_ADDRESSES } from "../../constants/addresses.js";
import { type ToolDefinition, toolResponse } from "../types.js";

const ruleSchema = z.object({
  criteria: z.string(),
  dataSource: z.string(),
  evaluationGuidance: z.string(),
});

export const savePolicy: ToolDefinition = {
  name: "save_policy",
  description:
    "Register a policy on-chain via the Sigil middleware contract and save it to the database. Requires rules to have been created first via create_rule.",
  inputSchema: z.object({
    name: z.string().describe("Policy name"),
    description: z.string().describe("Policy description"),
    isPublic: z
      .boolean()
      .default(true)
      .describe("Whether the policy is publicly visible"),
    rules: z
      .array(ruleSchema)
      .min(1)
      .describe("Array of rules created via create_rule"),
    registeredBy: z
      .string()
      .describe("Address of the protocol registering this policy"),
  }),
  handler: async (args) => {
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!privateKey) {
      return toolResponse({ error: "DEPLOYER_PRIVATE_KEY not set" });
    }

    const sigilAddress = SEPOLIA_ADDRESSES.sigilMiddleware;
    if (!sigilAddress) {
      return toolResponse({ error: "Sigil middleware address not configured" });
    }

    // Compute policyId = keccak256(abi.encodePacked(registeredBy, name))
    const policyId = keccak256(
      encodePacked(
        ["address", "string"],
        [args.registeredBy as `0x${string}`, args.name]
      )
    );

    // Register on-chain
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const wallet = createWalletClient({
      account,
      chain: sepolia,
      transport: http(
        process.env.ALCHEMY_RPC_URL ||
          "https://ethereum-sepolia-rpc.publicnode.com"
      ),
    });

    const txHash = await wallet.writeContract({
      address: sigilAddress as `0x${string}`,
      abi: SIGIL_ABI,
      functionName: "registerPolicy",
      args: [
        policyId as `0x${string}`,
        args.name,
        args.description,
        args.isPublic,
      ],
    });

    // Save to Supabase
    const supabase = createSupabaseClient();
    const { error: dbError } = await supabase.from("policies").insert({
      id: policyId,
      name: args.name,
      description: args.description,
      is_public: args.isPublic,
      is_active: true,
      registered_by: args.registeredBy,
      rules: args.rules,
      tx_hash: txHash,
    });

    if (dbError) {
      return toolResponse({
        policyId,
        txHash,
        warning: `On-chain tx sent but database save failed: ${dbError.message}`,
      });
    }

    return toolResponse({ policyId, txHash });
  },
};
