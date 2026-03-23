# Sigil

Autonomous compliance layer for ERC-8004 AI agents, powered by Chainlink CRE. Protocols define rules in plain language, AI agents assess compliance using real on-chain data, and verifiable stamps are written on-chain. Any smart contract can check `isCompliant(address, policyId)` before granting access.

"8004 is the passport. Sigil is the stamp."

## Architecture

```
                        +-----------------------+
                        |     Chainlink CRE     |
                        |    (WASM Sandbox)     |
                        +---+-------+-------+---+
                            |       |       |
                +-----------+   +---+---+   +-----------+
                |               |       |               |
           EVM Read        HTTP POST    |          EVM Write
        (8004 Identity   (AI Service)   |        (report via
         Registry)                      |         Forwarder)
                                        |
                          +-------------+------------+
                          |       Sigil Server       |
                          |    (Bun + Claude SDK)    |
                          +------+-------+-----------+
                          |  Scribe   |  Assessor    |
                          |(3 tools)  |  (8 tools)   |
                          +------+----+----+---------+
                                 |         |
                          +------+----+----+------+
                          | Supabase  |   IPFS    |
                          | (policies |  (Pinata) |
                          |  results) |           |
                          +-----------+-----------+
```

Components:
- **Sigil Contract** (Solidity 0.8.23) -- IReceiver for CRE reports, `isCompliant()` oracle, policy registry
- **CRE Workflow** (TypeScript -> WASM) -- HTTP trigger -> EVM Read (8004 identity) -> HTTP POST to AI -> EVM Write
- **Server** (Bun + Claude Agent SDK) -- Scribe (policy creation, 3 tools) + Assessor (compliance evaluation, 8 tools)
- **Frontend** (Next.js 15 + wagmi + RainbowKit) -- Landing, inscribe chat, dashboard, policy directory

## Live Infrastructure

| Service | URL |
|---------|-----|
| Frontend | https://sigil.s0nderlabs.xyz |
| API Server | https://api.sigil.s0nderlabs.xyz |
| Chain | Ethereum Sepolia (chainId 11155111) |

## Contracts (Sepolia, all verified)

| Contract | Address |
|----------|---------|
| Sigil Middleware | `0x2A1F759EC07d1a4177f845666dA0a6d82c37c11f` |
| SigilDemo | `0xec1EbB23162888bE120f66Fc7341239256F1c473` |
| CRE Simulation Forwarder | `0x15fC6ae953E024d975e77382eEeC56A9101f9F88` |

ERC-8004 contracts (not ours, deployed singletons):

| Contract | Address |
|----------|---------|
| Identity Registry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| Validation Registry | `0x8004Cb1BF31DAf7788923b405b754f57acEB4272` |
| Reputation Registry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |

## API Endpoints

```bash
# Health check
curl https://api.sigil.s0nderlabs.xyz/health

# List all active policies
curl https://api.sigil.s0nderlabs.xyz/policies

# Query assessment history (filter by agentId or wallet)
curl "https://api.sigil.s0nderlabs.xyz/assessments?agentId=2223"
curl "https://api.sigil.s0nderlabs.xyz/assessments?wallet=0x..."

# Self-describing auth error (shows exactly how to authenticate)
curl -s -X POST https://api.sigil.s0nderlabs.xyz/trigger-assessment | python3 -m json.tool
```

Full endpoint reference:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Server status |
| GET | `/health/cre` | None | CRE auth status |
| POST | `/inscribe` | API key or SIWE | Streaming SSE policy creation chat with Scribe |
| POST | `/inscribe/auto` | API key or SIWE | Single-shot policy creation. Body: `{ name, description, rules, visibility }` |
| POST | `/assess` | API key | Internal assessor endpoint (called by CRE, not directly) |
| POST | `/trigger-assessment` | API key or EIP-191 | Trigger CRE assessment. Body: `{ agentId, policyId, message, signature }` |
| GET | `/policies` | None | All active policies with rules |
| GET | `/assessments` | None | Assessment history. Filter: `?agentId=` or `?wallet=` |

## AI Agents

Both agents are built on the Claude Agent SDK with in-process MCP tool servers. Both are registered ERC-8004 agents.

### Scribe (agentId: 2223) -- Policy Onboarder

Guides protocols through defining compliance rules via conversational AI or single-shot API.

| Tool | Description |
|------|-------------|
| `get_policies` | Fetch all active policies from Supabase |
| `create_rule` | Validate rule against 7 allowed data sources, return structured rule |
| `save_policy` | Register policy on-chain via CRE + save to Supabase |

Allowed data sources for rules: `eth_balance`, `token_balance`, `transaction_history`, `contract_code`, `sanctions_check`, `validation_history`, `reputation_history`

### Assessor (agentId: 2224) -- Compliance Evaluator

Autonomously evaluates agents against policies using AND logic (all rules must pass).

| Tool | Data Source | What it checks |
|------|------------|----------------|
| `get_eth_balance` | Alchemy RPC | ETH balance of agent wallet |
| `get_token_balance` | Alchemy RPC | ERC-20 token balances |
| `get_transaction_history` | HyperSync (Envio) | Full indexed transaction history with pattern analysis |
| `check_contract_code` | Alchemy RPC | Whether address is EOA or contract |
| `check_sanctions` | OFAC SDN list | Sanctions screening against known addresses |
| `get_validation_history` | 8004 Validation Registry | Prior validation records |
| `get_reputation_history` | 8004 Reputation Registry | Feedback scores, star ratings, review counts |
| `pin_evidence` | Pinata IPFS | Pin assessment evidence, return CID + keccak256 hash |

Assessment output:
```json
{
  "score": 85,
  "compliant": true,
  "evidenceURI": "ipfs://Qm...",
  "evidenceHash": "0x...",
  "tag": "sigil-v1"
}
```

## Assessment Flow

```
1. Agent or protocol calls POST /trigger-assessment (EIP-191 signed or API key)
2. Server validates auth against 8004 Identity Registry
3. Server spawns CRE workflow: cre workflow simulate sigil-assessment --broadcast
4. CRE reads agent identity from 8004 Identity Registry (getAgentWallet, ownerOf, tokenURI)
5. CRE calls POST /assess on Sigil server with agent data
6. Assessor AI evaluates each rule using its 8 tools
7. Evidence pinned to IPFS via Pinata
8. CRE ABI-encodes result and writes to Sigil contract via KeystoneForwarder
9. Sigil.onReport() updates complianceStatus and calls 8004 Validation Registry
10. isCompliant(address, policyId) now returns true
```

## ERC-8004 Integration

Sigil is a consumer and the first validator of ERC-8004. Does not fork or extend the standard.

**Reads:**
- Identity Registry: `getAgentWallet(agentId)`, `ownerOf(agentId)`, `tokenURI(agentId)` -- during assessment auth and data gathering
- Reputation Registry: `getClients(agentId)`, `getSummary(agentId, client)` -- during assessment for reputation scoring

**Writes:**
- Validation Registry: `validationResponse(requestHash, score, responseURI, responseHash, tag)` -- compliance stamps visible across the 8004 ecosystem

**Receives:**
- Reputation Registry: agents/protocols call `giveFeedback(assessorAgentId, ...)` to rate Sigil's Assessor

The 8004 Validation Registry has been empty since the standard launched. Sigil is the first to fill it.

## Protocol Integration Pattern

Any smart contract can gate functionality behind Sigil compliance:

```solidity
interface ISigil {
    function isCompliant(address wallet, bytes32 policyId) external view returns (bool);
}

contract YourProtocol {
    ISigil public sigil;
    bytes32 public requiredPolicyId;

    function protectedAction() external {
        if (!sigil.isCompliant(msg.sender, requiredPolicyId)) {
            revert NotCompliant(msg.sender, requiredPolicyId);
        }
        // ... your logic
    }
}
```

SigilDemo at `0xec1EbB23162888bE120f66Fc7341239256F1c473` demonstrates this pattern with a compliance-gated counter.

## Chainlink CRE

The CRE workflow runs inside a WASM sandbox. Currently CRE simulation with `--broadcast` for real Sepolia transactions.

Why CRE:
- Tamper-proof execution -- consensus on assessment results
- Direct on-chain writes via KeystoneForwarder -> Sigil.onReport()
- Verifiable bookends -- reads identity from 8004, writes stamps to 8004
- Future: private rules via Vault DON secrets

## Tech Stack

| Layer | Technology |
|-------|-----------|
| AI | Claude Agent SDK, Claude Opus 4.6 (configurable) |
| Oracle | Chainlink CRE v1.2.0 (TypeScript -> WASM) |
| Contracts | Solidity 0.8.23, Foundry, 51 tests |
| Server | Bun |
| Frontend | Next.js 15, wagmi, RainbowKit, GSAP, Tailwind CSS v4 |
| Storage | Supabase (Postgres), Pinata (IPFS) |
| Indexing | HyperSync (Envio) |
| Chain | Ethereum Sepolia |
| Auth | SIWE (browser), EIP-191 (agent API), Bearer API key (internal) |

## Repo Structure

```
sigil/
  packages/core/        @sigil/core -- shared types, tools, prompts, clients, ABIs
  apps/server/          @sigil/server -- Bun HTTP server + Claude Agent SDK
  apps/web/             @sigil/web -- Next.js 15 frontend (Vercel)
  contracts/            Foundry -- Sigil.sol + SigilDemo.sol (51 tests)
  sigil-cre/            CRE workflow -- TypeScript compiled to WASM
  agent.json            Agent identity descriptor (Scribe + Assessor)
```

Monorepo managed by Bun workspaces. `contracts/` and `sigil-cre/` have separate dependency trees.

## Souq Integration

Sigil integrates with Souq Protocol via SigilGateHook. When a Souq job is created with `useHook: true`, the hook calls `sigil.isCompliant()` for each participant against specified policies. The Souq MCP plugin includes three Sigil tools: `create_policy`, `trigger_assessment`, `check_compliance`.

## Skill Reference

For detailed API documentation including authentication examples, the full 8004 pipeline, and integration with Souq MCP:

```
.agents/skills/sigil/SKILL.md
```
