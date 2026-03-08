#!/bin/sh
# Write CRE auth config from base64-encoded full cre.yaml
if [ -n "$CRE_AUTH_CONFIG" ]; then
  mkdir -p "$HOME/.cre"
  echo "$CRE_AUTH_CONFIG" | base64 -d > "$HOME/.cre/cre.yaml"
fi

# Generate CRE project.yaml from env vars (project.yaml is gitignored)
if [ -n "$ALCHEMY_RPC_URL" ]; then
  cat > /app/sigil-cre/project.yaml << YAML
staging-settings:
  rpcs:
    - chain-name: ethereum-testnet-sepolia
      url: $ALCHEMY_RPC_URL

production-settings:
  rpcs:
    - chain-name: ethereum-testnet-sepolia
      url: $ALCHEMY_RPC_URL
YAML
fi

exec bun run apps/server/src/index.ts
