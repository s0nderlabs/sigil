import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

let cachedClient: ReturnType<typeof createPublicClient> | null = null;

export function createRpcClient(rpcUrl?: string) {
  if (rpcUrl) {
    return createPublicClient({
      chain: sepolia,
      transport: http(rpcUrl),
    });
  }
  if (!cachedClient) {
    cachedClient = createPublicClient({
      chain: sepolia,
      transport: http(
        process.env.ALCHEMY_RPC_URL ||
          "https://ethereum-sepolia-rpc.publicnode.com"
      ),
    });
  }
  return cachedClient;
}
