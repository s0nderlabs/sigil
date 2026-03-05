import {
  HTTPCapability,
  EVMClient,
  HTTPClient,
  handler,
  Runner,
  type Runtime,
  type HTTPPayload,
  decodeJson,
  encodeCallMsg,
  prepareReportRequest,
  LAST_FINALIZED_BLOCK_NUMBER,
  consensusIdenticalAggregation,
  json,
} from "@chainlink/cre-sdk";
import {
  encodeFunctionData,
  decodeFunctionResult,
  encodeAbiParameters,
  parseAbiParameters,
  hexToBytes,
  bytesToHex,
  zeroAddress,
  type Hex,
} from "viem";

// ── Config ─────────────────────────────────────────────────────────────
type Config = {
  aiServiceUrl: string;
  sigilMiddleware?: string;
};

type AssessmentRequest = {
  agentId: string;
  policyId: string;
  requestHash: string;
};

type AssessmentResponse = {
  score: number;
  compliant: boolean;
  evidenceURI: string;
  evidenceHash: string;
  tag: string;
};

// ── Contract ABIs (minimal, inline) ─────────────────────────────────────
const identityRegistryAbi = [
  {
    type: "function" as const,
    name: "getAgentWallet",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view" as const,
  },
  {
    type: "function" as const,
    name: "ownerOf",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view" as const,
  },
  {
    type: "function" as const,
    name: "tokenURI",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view" as const,
  },
] as const;

const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e" as const;
const SEPOLIA_CHAIN_SELECTOR = 16015286601757825753n;

// ── Workflow ─────────────────────────────────────────────────────────────
const onHttpTrigger = (
  runtime: Runtime<Config>,
  payload: HTTPPayload
): string => {
  const request = decodeJson(payload.input) as AssessmentRequest;
  const agentIdBigInt = BigInt(request.agentId);

  runtime.log(`Assessment request: agentId=${request.agentId}, policyId=${request.policyId}`);

  // ── Step 1: EVM Read — Fetch agent identity from 8004 Identity Registry ──
  const evmClient = new EVMClient(SEPOLIA_CHAIN_SELECTOR);

  // getAgentWallet(agentId)
  const walletCalldata = encodeFunctionData({
    abi: identityRegistryAbi,
    functionName: "getAgentWallet",
    args: [agentIdBigInt],
  });
  const walletReply = evmClient.callContract(runtime, {
    call: encodeCallMsg({
      from: zeroAddress,
      to: IDENTITY_REGISTRY,
      data: walletCalldata,
    }),
    blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
  }).result();
  const wallet = decodeFunctionResult({
    abi: identityRegistryAbi,
    functionName: "getAgentWallet",
    data: bytesToHex(walletReply.data),
  }) as string;

  runtime.log(`Agent wallet: ${wallet}`);

  // ownerOf(agentId)
  const ownerCalldata = encodeFunctionData({
    abi: identityRegistryAbi,
    functionName: "ownerOf",
    args: [agentIdBigInt],
  });
  const ownerReply = evmClient.callContract(runtime, {
    call: encodeCallMsg({
      from: zeroAddress,
      to: IDENTITY_REGISTRY,
      data: ownerCalldata,
    }),
    blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
  }).result();
  const owner = decodeFunctionResult({
    abi: identityRegistryAbi,
    functionName: "ownerOf",
    data: bytesToHex(ownerReply.data),
  }) as string;

  // tokenURI(agentId)
  const tokenURICalldata = encodeFunctionData({
    abi: identityRegistryAbi,
    functionName: "tokenURI",
    args: [agentIdBigInt],
  });
  const tokenURIReply = evmClient.callContract(runtime, {
    call: encodeCallMsg({
      from: zeroAddress,
      to: IDENTITY_REGISTRY,
      data: tokenURICalldata,
    }),
    blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
  }).result();
  const tokenURI = decodeFunctionResult({
    abi: identityRegistryAbi,
    functionName: "tokenURI",
    data: bytesToHex(tokenURIReply.data),
  }) as string;

  runtime.log(`Identity fetched: owner=${owner}, tokenURI=${tokenURI}`);

  // ── Step 2: HTTP POST to AI Service ──
  const httpClient = new HTTPClient();

  let apiKey = "";
  try {
    const secret = runtime.getSecret({ id: "AI_SERVICE_API_KEY", namespace: "" }).result();
    apiKey = secret.value || "";
  } catch {
    apiKey = "";
  }

  const requestBody = {
    agentId: request.agentId,
    policyId: request.policyId,
    requestHash: request.requestHash,
    onChainData: { wallet, owner, tokenURI },
  };

  const sendHttp = httpClient.sendRequest(
    runtime,
    (sender) => {
      const bodyBytes = new TextEncoder().encode(JSON.stringify(requestBody));
      const response = sender.sendRequest({
        url: runtime.config.aiServiceUrl,
        method: "POST",
        body: Buffer.from(bodyBytes).toString("base64"),
        multiHeaders: {
          "Content-Type": { values: ["application/json"] },
          ...(apiKey ? { Authorization: { values: [`Bearer ${apiKey}`] } } : {}),
        },
      }).result();
      return json(response) as AssessmentResponse;
    },
    consensusIdenticalAggregation<AssessmentResponse>(),
  );

  const assessment = sendHttp().result();

  runtime.log(`Assessment: score=${assessment.score}, compliant=${assessment.compliant}`);

  if (assessment.score === undefined || assessment.compliant === undefined) {
    runtime.log("ERROR: AI service returned empty assessment");
    return JSON.stringify({ error: "AI service returned empty assessment" });
  }

  // ── Step 3: Encode report payload ──
  const reportPayload = encodeAbiParameters(
    parseAbiParameters("uint256, bytes32, address, bytes32, uint8, bool, string, bytes32, string"),
    [
      agentIdBigInt,
      request.requestHash as Hex,
      wallet as `0x${string}`,
      request.policyId as Hex,
      assessment.score,
      assessment.compliant,
      assessment.evidenceURI,
      assessment.evidenceHash as Hex,
      assessment.tag,
    ]
  );

  runtime.log(`Report payload encoded: ${reportPayload.slice(0, 20)}...`);

  // ── Step 4: Submit report via EVM Write ──
  const sigilAddress = runtime.config.sigilMiddleware || "";
  if (sigilAddress) {
    const reportReq = prepareReportRequest(reportPayload);
    const report = runtime.report(reportReq).result();

    evmClient.writeReport(runtime, {
      receiver: hexToBytes(sigilAddress as Hex),
      report,
      $report: true,
    }).result();

    runtime.log("Report submitted to Sigil contract");
  } else {
    runtime.log("WARN: No sigilMiddleware address configured, skipping on-chain report");
  }

  return JSON.stringify({
    agentId: request.agentId,
    policyId: request.policyId,
    score: assessment.score,
    compliant: assessment.compliant,
    evidenceURI: assessment.evidenceURI,
  });
};

// ── Workflow Init ─────────────────────────────────────────────────────────
const initWorkflow = (config: Config) => {
  const httpTrigger = new HTTPCapability();
  return [
    handler(httpTrigger.trigger({}), onHttpTrigger),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
