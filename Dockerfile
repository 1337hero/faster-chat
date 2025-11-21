# syntax=docker/dockerfile:1.7

# Builder stage - use Bun to install and build
FROM oven/bun:1.3-debian AS builder
WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy repository contents
COPY . .

# Install dependencies and build frontend
RUN bun install --frozen-lockfile && \
    bun run build:frontend

# Production image - Node.js 22 to run the server
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8787

# Install runtime dependencies + build tools for rebuilding native modules
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    openssl \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy built application
COPY --from=builder /app/package.json /app/bun.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/server ./server
COPY --from=builder /app/frontend/dist ./frontend/dist

# Rebuild better-sqlite3 for Node.js 22
RUN npm rebuild better-sqlite3 --build-from-source

# Persist SQLite data outside the container filesystem
VOLUME /app/server/data

EXPOSE 8787

# Run with Node.js for better-sqlite3 compatibility
CMD ["node", "server/src/index.js"]
