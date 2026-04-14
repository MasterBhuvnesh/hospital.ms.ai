# syntax=docker/dockerfile:1

# ── Base ──────────────────────────────────────────────
FROM node:22-alpine AS base

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate
WORKDIR /app

# ── Dependencies ──────────────────────────────────────
FROM base AS deps

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy package.json for all needed workspace packages
COPY packages/common/logging/package.json ./packages/common/logging/
COPY packages/common/middleware/package.json ./packages/common/middleware/
COPY packages/services/identity-service/package.json ./packages/services/identity-service/

# Install all dependencies (dev included for build step)
RUN pnpm install --frozen-lockfile

# ── Builder ───────────────────────────────────────────
FROM deps AS builder

# Copy only source & config — preserves node_modules symlinks from deps stage
COPY packages/common/logging/src ./packages/common/logging/src
COPY packages/common/logging/tsconfig.json ./packages/common/logging/tsconfig.json

COPY packages/common/middleware/src ./packages/common/middleware/src
COPY packages/common/middleware/tsconfig.json ./packages/common/middleware/tsconfig.json

COPY packages/services/identity-service/src ./packages/services/identity-service/src
COPY packages/services/identity-service/tsconfig.json ./packages/services/identity-service/tsconfig.json
COPY packages/services/identity-service/prisma ./packages/services/identity-service/prisma
COPY packages/services/identity-service/prisma.config.ts ./packages/services/identity-service/prisma.config.ts

# Build common-logging first (dependency)
RUN pnpm --filter @hms/common-logging build

RUN pnpm --filter @hms/common-middleware build

# Build identity-service
RUN pnpm --filter @hms/identity-service build

# ── Production ────────────────────────────────────────
FROM node:22-alpine AS production

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeuser

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy package.json for needed packages
COPY packages/common/logging/package.json ./packages/common/logging/
COPY packages/common/middleware/package.json ./packages/common/middleware/
COPY packages/services/identity-service/package.json ./packages/services/identity-service/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Generate Prisma client for runtime
COPY packages/services/identity-service/prisma ./packages/services/identity-service/prisma
RUN cd packages/services/identity-service && \
    DATABASE_URL="postgresql://dummy@localhost/dummy" npx prisma@6.19.3 generate --schema=prisma/schema.prisma

# Copy built artifacts from builder
COPY --from=builder /app/packages/common/logging/dist ./packages/common/logging/dist
COPY --from=builder /app/packages/common/middleware/dist ./packages/common/middleware/dist
COPY --from=builder /app/packages/services/identity-service/dist ./packages/services/identity-service/dist

# Change ownership to non-root
RUN chown -R nodeuser:nodejs /app

USER nodeuser

ENV NODE_ENV=production
ENV PORT=5001

EXPOSE 5001

WORKDIR /app/packages/services/identity-service

CMD ["node", "dist/index.js"]
