---
name: sigil
description: >
  Compliance layer for ERC-8004 AI agents. Create compliance policies,
  trigger assessments, check on-chain compliance status, and write stamps
  to the 8004 Validation Registry. REST API — no MCP package needed.
license: MIT
metadata:
  author: s0nderlabs
  version: "1.0.0"
---

# Sigil — Compliance for the Agentic Economy

Autonomous compliance layer for ERC-8004 agents. Protocols define rules, agents get assessed, stamps live on-chain.

**API Base URL:** `https://api.sigil.s0nderlabs.xyz`

## 1. Authentication

Three methods, checked in order:

| Method | Header | Used By |
|--------|--------|---------|
| API Key | `Authorization: Bearer {SIGIL_API_KEY}` + `x-wallet-address: {address}` | MCP agents, programmatic access |
| EIP-191 Signature | Signed message in request body | Agent wallets (via `/trigger-assessment`) |
| SIWE | Wallet signature in request body | Browser users (via `/inscribe`) |

API key auth is the simplest for agents. No wallet signing needed.

## 2. Quick Start

```
Step 1: Create a policy
  POST /inscribe/auto
  { name, description, rules, visibility }
  → { policyId, rules[] }

Step 2: Trigger assessment
  POST /trigger-assessment
  { agentId, policyId }
  → { score, compliant, evidenceURI }

Step 3: Check compliance (on-chain)
  ISigil(0x2A1F759EC07d1a4177f845666dA0a6d82c37c11f).isCompliant(wallet, policyId)
```

## 3. Policy Creation

### Single-Shot (recommended for agents)

```bash
curl -X POST https://api.sigil.s0nderlabs.xyz/inscribe/auto \
  -H "Authorization: Bearer $SIGIL_API_KEY" \
  -H "x-wallet-address: $WALLET_ADDRESS" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DeFi Agent Trust",
    "description": "Basic trust requirements for DeFi agents",
    "rules": "Agent must hold at least 0.01 ETH, must not be sanctioned, and must have at least 10 transactions",
    "visibility": "public"
  }'
```

**Response:**
```json
{
  "success": true,
  "policyId": "0xabc123...64chars",
  "name": "DeFi Agent Trust",
  "description": "Basic trust requirements for DeFi agents",
  "rules": [
    { "criteria": "Hold at least 0.01 ETH", "dataSource": "eth_balance", "evaluationGuidance": "..." },
    { "criteria": "Not sanctioned", "dataSource": "sanctions_check", "evaluationGuidance": "..." },
    { "criteria": "At least 10 transactions", "dataSource": "transaction_history", "evaluationGuidance": "..." }
  ],
  "visibility": "public"
}
```

**Validation:**
- `name`: required, max 100 chars
- `description`: required, max 500 chars
- `rules`: required, natural language (AI translates to structured rules)
- `visibility`: optional, "public" (default) or "private"

### Conversational (for browser UI)

`POST /inscribe` — SSE stream, multi-turn chat with the Scribe AI. Used by the web frontend at `sigil.s0nderlabs.xyz/inscribe`.

## 4. Assessment Flow

### Basic Assessment (stamp in Sigil only)

```bash
curl -X POST https://api.sigil.s0nderlabs.xyz/trigger-assessment \
  -H "Authorization: Bearer $SIGIL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "1591",
    "policyId": "0xabc123..."
  }'
```

**Response:**
```json
{
  "agentId": "1591",
  "policyId": "0xabc123...",
  "requestHash": "0xdef456...",
  "score": 85,
  "compliant": true,
  "evidenceURI": "ipfs://Qm...",
  "evidenceHash": "0x...",
  "tag": "sigil-v1",
  "validationRequestFound": false,
  "warning": "No validationRequest found — stamp saved to Sigil only.",
  "hint": "Call validationRequest(...) on 0x8004Cb1B..."
}
```

### Full 8004 Pipeline (stamp in Sigil + 8004 Validation Registry)

To write stamps to the ERC-8004 Validation Registry (visible across the 8004 ecosystem), submit a `validationRequest` before triggering assessment:

```
Step 1: Compute requestHash
  requestHash = keccak256(encodePacked(uint256(agentId), bytes32(policyId)))

Step 2: Submit validationRequest on-chain
  ValidationRegistry(0x8004Cb1BF31DAf7788923b405b754f57acEB4272)
    .validationRequest(
      "0x2A1F759EC07d1a4177f845666dA0a6d82c37c11f",  // Sigil middleware (validator)
      agentId,
      "",           // requestURI (optional)
      requestHash
    )

Step 3: Trigger assessment (same as basic)
  POST /trigger-assessment { agentId, policyId }

Step 4: Result
  validationRequestFound: true
  → stamp written to BOTH Sigil contract AND 8004 Validation Registry
  → visible on 8004scan, 8004agents.ai, and any 8004-aware tool
```

**Cast example:**
```bash
AGENT_ID="1591"
POLICY_ID="0xabc123..."
SIGIL="0x2A1F759EC07d1a4177f845666dA0a6d82c37c11f"
VALIDATION_REGISTRY="0x8004Cb1BF31DAf7788923b405b754f57acEB4272"

# Compute requestHash
REQUEST_HASH=$(cast keccak $(cast abi-encode "f(uint256,bytes32)" "$AGENT_ID" "$POLICY_ID"))

# Submit validationRequest
cast send "$VALIDATION_REGISTRY" \
  "validationRequest(address,uint256,string,bytes32)" \
  "$SIGIL" "$AGENT_ID" "" "$REQUEST_HASH" \
  --private-key "$AGENT_KEY" --rpc-url "$RPC_URL"

# Trigger assessment
curl -X POST https://api.sigil.s0nderlabs.xyz/trigger-assessment \
  -H "Authorization: Bearer $SIGIL_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"agentId\": \"$AGENT_ID\", \"policyId\": \"$POLICY_ID\"}"
```

**Note:** The `validationRequest` caller must be the agent owner or an approved operator (`setApprovalForAll`) on the 8004 Identity Registry.

## 5. Checking Compliance

### On-Chain (Solidity)
```solidity
bool compliant = ISigil(0x2A1F759EC07d1a4177f845666dA0a6d82c37c11f)
    .isCompliant(agentWallet, policyId);
```

### Via API
```bash
# By wallet
curl https://api.sigil.s0nderlabs.xyz/assessments?wallet=0x...

# By agent ID
curl https://api.sigil.s0nderlabs.xyz/assessments?agentId=1591
```

### Via 8004 Validation Registry (if full pipeline was used)
```solidity
(address validator, uint256 agentId, uint8 response, , string memory tag, ) =
    ValidationRegistry(0x8004Cb1BF31DAf7788923b405b754f57acEB4272)
        .getValidationStatus(requestHash);
```

## 6. Browsing Policies

```bash
# List all active policies
curl https://api.sigil.s0nderlabs.xyz/policies
```

Returns array of `{ id, name, description, rules[], is_public, is_active, registered_by }`.

## 7. Endpoint Reference

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| `POST` | `/inscribe/auto` | API key or SIWE | `{ name, description, rules, visibility? }` | `{ success, policyId, rules[] }` |
| `POST` | `/inscribe` | API key or SIWE | `{ prompt, sessionId? }` | SSE stream |
| `POST` | `/trigger-assessment` | API key or EIP-191 | `{ agentId, policyId }` (API key) or `{ agentId, policyId, message, signature }` (EIP-191) | `{ score, compliant, evidenceURI, validationRequestFound }` |
| `POST` | `/assess` | API key | `{ agentId, policyId, requestHash, onChainData }` | `{ score, compliant, evidenceURI }` |
| `GET` | `/policies` | None | — | `[{ id, name, description, rules[] }]` |
| `GET` | `/assessments` | None | `?agentId=` or `?wallet=` | `[{ agent_id, score, compliant, evidence_uri }]` |
| `GET` | `/health` | None | — | `{ status: "ok" }` |

## 8. Available Data Sources for Rules

| Data Source | What It Checks |
|-------------|---------------|
| `eth_balance` | ETH balance of agent wallet |
| `token_balance` | ERC-20/721/1155 token holdings |
| `transaction_history` | Full tx history, patterns, frequency |
| `contract_code` | Whether address is EOA or contract |
| `sanctions_check` | OFAC SDN list screening |
| `validation_history` | Prior 8004 validation records |
| `reputation_history` | 8004 reputation feedback and star ratings |

## 9. Contracts (Ethereum Sepolia)

| Contract | Address |
|----------|---------|
| Sigil Middleware | `0x2A1F759EC07d1a4177f845666dA0a6d82c37c11f` |
| SigilDemo | `0xec1EbB23162888bE120f66Fc7341239256F1c473` |
| 8004 Identity Registry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| 8004 Validation Registry | `0x8004Cb1BF31DAf7788923b405b754f57acEB4272` |
| 8004 Reputation Registry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |

## 10. Rating the Assessor (Reputation Feedback)

After an assessment, the response includes `assessorAgentId` and `reputationRegistry`. Agents can rate the assessment quality:

```bash
cast send 0x8004B663056A597Dffe9eCcC1965A193B7388713 \
  "giveFeedback(uint256,int128,uint8,string,string,string,string,bytes32)" \
  $ASSESSOR_AGENT_ID 5 0 "starred" "assessor" "" "" \
  0x0000000000000000000000000000000000000000000000000000000000000000 \
  --private-key $AGENT_KEY --rpc-url $RPC_URL
```

## 11. Using Sigil via Souq MCP

If you're already using the [Souq Protocol MCP server](https://www.npmjs.com/package/@s0nderlabs/souq-mcp), Sigil compliance tools are built in — no separate setup needed:

| Souq MCP Tool | Equivalent Sigil API |
|--------------|---------------------|
| `create_policy(prompt)` | `POST /inscribe/auto` |
| `trigger_assessment(agentId, policyId)` | `POST /trigger-assessment` |
| `check_compliance(wallet, policyId)` | On-chain `isCompliant()` |

```bash
# Install Souq MCP (includes Sigil tools)
claude mcp add souq -- npx -y @s0nderlabs/souq-mcp@latest
```

## 12. Critical Rules

1. **API key auth is simplest.** Send `Authorization: Bearer {key}` + `x-wallet-address` header. No signing needed.

2. **Policy names are unique per wallet.** `policyId = keccak256(encodePacked(registeredBy, name))`. Same wallet + same name = same policy. The endpoint returns the existing policy if it already exists.

3. **Assessment is async.** `/trigger-assessment` spawns a CRE workflow that reads on-chain data, runs AI evaluation, and writes the stamp. Takes 15-60 seconds.

4. **validationRequest is optional.** Without it, stamps go to Sigil's contract only. With it, stamps also go to the 8004 Validation Registry.

5. **Evidence is immutable.** Every assessment pins full evidence (data snapshot + rule evaluations + reasoning) to IPFS. The `evidenceURI` and `evidenceHash` in the response are permanent.

6. **Compliance is binary.** `isCompliant()` returns true/false. The `score` (0-100) is metadata — all rules must pass for compliance (AND logic).
