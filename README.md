# Sigil

CRE-powered compliance layer for the ERC-8004 agent economy.

**"8004 is the passport. Sigil is the stamp."**

## Architecture

1. **Middleware Contract** — IReceiver + `isCompliant(address, policyId)` + wallet-to-status mapping
2. **Demo Contract** — increment counter gated by compliance check
3. **CRE Workflow** — HTTP trigger → EVM Read → HTTP to AI service → EVM Write
4. **Backend** — Bun HTTP server + Claude Agent SDK (Agent A: onboard, Agent B: assess)
5. **Frontend** — Next.js (landing, onboarding chat, policy directory)

## Monorepo Structure

| Package | Path | Description |
|---------|------|-------------|
| `@sigil/core` | `packages/core/` | Shared types, tools, prompts, clients |
| `@sigil/server` | `apps/server/` | Bun HTTP server + Agent SDK |
| `@sigil/web` | `apps/web/` | Next.js frontend |
| contracts | `contracts/` | Foundry (not a workspace member) |
| CRE workflow | `sigil-cre/` | CRE project (not a workspace member) |

## Setup

```bash
bun install          # Install workspace dependencies
cd contracts && forge install  # Install Foundry libs
```

## Development

```bash
bun run dev:server   # Start backend (localhost:3001)
bun run dev:web      # Start frontend (localhost:3000)
```

## Target Chain

Ethereum Sepolia — all 8004 registries at v2.0.0.

## Hackathon

Chainlink Convergence Hackathon — Deadline: March 8, 2026
