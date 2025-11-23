# syntax=docker/dockerfile:1.7

# Builder stage - use Bun to install and build
FROM oven/bun:1.3-debian AS builder
WORKDIR /app

# Copy repository contents
COPY . .

# Install dependencies and build frontend
RUN bun install --frozen-lockfile && \
    bun run build:frontend

# Production image - pure Bun runtime (no Node.js needed!)
FROM oven/bun:1.3-debian AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8787

# Install only minimal runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy built application
COPY --from=builder /app/package.json /app/bun.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/server ./server
COPY --from=builder /app/frontend/dist ./frontend/dist

# No native module rebuild needed - bun:sqlite is built-in! 🎉

# Create data directory for SQLite database
RUN mkdir -p /app/server/data

# Persist SQLite data outside the container filesystem
VOLUME /app/server/data

EXPOSE 8787

# Set working directory to server folder
WORKDIR /app/server

# Run with Bun runtime (native SQLite support)
# Init script generates encryption key on first run
CMD ["sh", "-c", "bun run src/init.js && bun run src/index.js"]
