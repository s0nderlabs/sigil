#!/bin/sh
# Write CRE auth config from base64-encoded full cre.yaml
if [ -n "$CRE_AUTH_CONFIG" ]; then
  mkdir -p "$HOME/.cre"
  echo "$CRE_AUTH_CONFIG" | base64 -d > "$HOME/.cre/cre.yaml"
fi

exec bun run apps/server/src/index.ts
