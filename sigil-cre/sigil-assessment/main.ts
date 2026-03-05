import {
  HTTPCapability,
  handler,
  Runner,
  type Runtime,
  type HTTPPayload,
  decodeJson,
} from "@chainlink/cre-sdk";

type Config = {
  aiServiceUrl: string;
};

type AssessmentRequest = {
  agentId: string;
  policyId: string;
  requestHash: string;
};

const onHttpTrigger = (
  runtime: Runtime<Config>,
  payload: HTTPPayload
): string => {
  const request = decodeJson<AssessmentRequest>(payload.input);
  runtime.log(
    `Assessment request received — agentId: ${request.agentId}, policyId: ${request.policyId}`
  );

  // In full implementation:
  // 1. EVM Read — fetch agent identity from 8004 Identity Registry
  // 2. HTTP to AI service — send agent data + policy rules, get assessment
  // 3. EVM Write — submit signed report to middleware contract

  runtime.log("Assessment workflow completed (stub)");
  return JSON.stringify({
    agentId: request.agentId,
    policyId: request.policyId,
    score: 85,
    result: "pass",
  });
};

const initWorkflow = (config: Config) => {
  const httpTrigger = new HTTPCapability();

  return [
    handler(
      httpTrigger.trigger({}), // empty config for simulation
      onHttpTrigger
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
