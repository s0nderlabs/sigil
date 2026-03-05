import { PinataSDK } from "pinata";
import { keccak256 } from "viem";

let pinataClient: PinataSDK | null = null;

function getPinata(): PinataSDK {
  if (!pinataClient) {
    pinataClient = new PinataSDK({ pinataJwt: process.env.PINATA_JWT! });
  }
  return pinataClient;
}

export async function pinJsonToIpfs(
  data: unknown
): Promise<{ uri: string; hash: string }> {
  const jsonStr = JSON.stringify(data);
  const jsonBytes = new TextEncoder().encode(jsonStr);
  const contentHash = keccak256(jsonBytes);

  const pinata = getPinata();
  const file = new File([jsonBytes], "evidence.json", {
    type: "application/json",
  });
  const result = await pinata.upload.public.file(file);

  return {
    uri: `ipfs://${result.cid}`,
    hash: contentHash,
  };
}
