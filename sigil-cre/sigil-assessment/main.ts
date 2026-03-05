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
  stringToHex,
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

// ── Helpers ──────────────────────────────────────────────────────────────
function callView(
  evmClient: EVMClient,
  runtime: Runtime<Config>,
  functionName: "getAgentWallet" | "ownerOf" | "tokenURI",
  args: readonly [bigint],
): string {
  const calldata = encodeFunctionData({ abi: identityRegistryAbi, functionName, args });
  const reply = evmClient.callContract(runtime, {
    call: encodeCallMsg({ from: zeroAddress, to: IDENTITY_REGISTRY, data: calldata }),
    blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
  }).result();
  return decodeFunctionResult({
    abi: identityRegistryAbi,
    functionName,
    data: bytesToHex(reply.data),
  }) as string;
}

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
  const wallet = callView(evmClient, runtime, "getAgentWallet", [agentIdBigInt]);
  runtime.log(`Agent wallet: ${wallet}`);
  const owner = callView(evmClient, runtime, "ownerOf", [agentIdBigInt]);
  const tokenURI = callView(evmClient, runtime, "tokenURI", [agentIdBigInt]);
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

  const postToAiService = (sender: any): AssessmentResponse => {
    const response = sender.sendRequest({
      url: runtime.config.aiServiceUrl,
      method: "POST" as const,
      body: Buffer.from(JSON.stringify(requestBody)).toString("base64"),
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "Authorization": `Bearer ${apiKey}` } : {}),
      },
      timeout: "120s",
      cacheSettings: {
        store: true,
        maxAge: "300s",
      },
    }).result();
    return json(response) as AssessmentResponse;
  };

  const assessment = httpClient.sendRequest(
    runtime,
    postToAiService,
    consensusIdenticalAggregation<AssessmentResponse>(),
  )().result();

  runtime.log(`Assessment: score=${assessment.score}, compliant=${assessment.compliant}`);

  if (assessment.score === undefined || assessment.compliant === undefined) {
    runtime.log("ERROR: AI service returned empty assessment");
    return JSON.stringify({ error: "AI service returned empty assessment" });
  }

  // ── Step 3: Encode report payload ──
  // Ensure policyId is bytes32 hex (pad string IDs to bytes32)
  const policyIdBytes32: Hex = (request.policyId.startsWith("0x") && request.policyId.length === 66)
    ? request.policyId as Hex
    : stringToHex(request.policyId, { size: 32 });

  const reportPayload = encodeAbiParameters(
    parseAbiParameters("uint256, bytes32, address, bytes32, uint8, bool, string, bytes32, string"),
    [
      agentIdBigInt,
      request.requestHash as Hex,
      wallet as `0x${string}`,
      policyIdBytes32,
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
