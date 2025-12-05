# syntax=docker/dockerfile:1.7

# Builder stage - use Bun (Alpine) to install and build
FROM oven/bun:1.3-alpine AS builder
WORKDIR /app

COPY . .

# Install dependencies and build frontend
RUN bun install --frozen-lockfile && bun run build:frontend

# Dependencies stage - install only production server deps
FROM oven/bun:1.3-alpine AS deps
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lock ./bun.lock
COPY --from=builder /app/server ./server
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/frontend/package.json ./frontend/package.json

# Install only server + shared workspace production dependencies
RUN bun install --frozen-lockfile --production --filter @faster-chat/server --filter @faster-chat/shared --no-save \
  && rm -rf /root/.bun/install/cache

# Production image - lean Bun runtime on Alpine
FROM oven/bun:1.3-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=1337

# Copy built application
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/bun.lock ./bun.lock
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/server ./server
COPY --from=builder /app/frontend/dist ./frontend/dist

# No native module rebuild needed - bun:sqlite is built-in! 🎉

# Create data directory for SQLite database
RUN mkdir -p /app/server/data

# Persist SQLite data outside the container filesystem
VOLUME /app/server/data

EXPOSE 1337

# Set working directory to server folder
WORKDIR /app/server

# Run with Bun runtime (native SQLite support)
# Init script generates encryption key on first run
CMD ["sh", "-c", "bun run src/init.js && bun run src/index.js"]
