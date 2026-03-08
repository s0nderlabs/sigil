FROM oven/bun:1 AS base

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Install CRE CLI (Linux amd64)
RUN curl -fsSL https://github.com/smartcontractkit/cre-cli/releases/download/v1.2.0/cre_linux_amd64.tar.gz \
    | tar -xz -C /tmp && mv /tmp/cre_v1.2.0_linux_amd64 /usr/local/bin/cre && chmod +x /usr/local/bin/cre

WORKDIR /app

# Copy workspace root
COPY package.json bun.lock tsconfig.json ./

# Copy workspace package.jsons for dependency resolution
COPY packages/core/package.json packages/core/
COPY apps/server/package.json apps/server/

# Install dependencies
RUN bun install

# Copy source
COPY packages/core/ packages/core/
COPY apps/server/ apps/server/

# Copy CRE workflow (source + configs, dist built at runtime by CRE)
COPY sigil-cre/ sigil-cre/

# Install CRE workflow dependencies
RUN cd sigil-cre/sigil-assessment && bun install

# Build core package
RUN cd packages/core && bun run build

# Set CRE paths
ENV CRE_BIN=/usr/local/bin/cre
ENV CRE_PROJECT_DIR=/app/sigil-cre

# Copy entrypoint
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Run as non-root user (required by Claude Code CLI — refuses --dangerously-skip-permissions as root)
RUN groupadd -r sigil && useradd -r -g sigil -d /home/sigil -m sigil
RUN chown -R sigil:sigil /app
USER sigil

EXPOSE 3001

ENTRYPOINT ["/app/entrypoint.sh"]
