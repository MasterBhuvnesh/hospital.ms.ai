# syntax=docker/dockerfile:1

# ── Base ──────────────────────────────────────────────
FROM node:22-alpine AS base

RUN corepack enable && corepack prepare pnpm@8.15.0 --activate
WORKDIR /app

# ── Dependencies ──────────────────────────────────────
FROM base AS deps

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy package.json for all needed workspace packages
COPY packages/common/logging/package.json ./packages/common/logging/
COPY packages/common/pdf/package.json ./packages/common/pdf/
COPY packages/common/middleware/package.json ./packages/common/middleware/
COPY packages/services/patient-sheet-service/package.json ./packages/services/patient-sheet-service/

# Install all dependencies (dev included for build step)
RUN pnpm install --frozen-lockfile

# ── Builder ───────────────────────────────────────────
FROM deps AS builder

# Copy common-logging source
COPY packages/common/logging/src ./packages/common/logging/src
COPY packages/common/logging/tsconfig.json ./packages/common/logging/tsconfig.json

# Copy common-pdf source + fonts
COPY packages/common/pdf/src ./packages/common/pdf/src
COPY packages/common/pdf/tsconfig.json ./packages/common/pdf/tsconfig.json

# Copy common-middleware source
COPY packages/common/middleware/src ./packages/common/middleware/src
COPY packages/common/middleware/tsconfig.json ./packages/common/middleware/tsconfig.json

# Copy service source
COPY packages/services/patient-sheet-service/src ./packages/services/patient-sheet-service/src
COPY packages/services/patient-sheet-service/tsconfig.json ./packages/services/patient-sheet-service/tsconfig.json
COPY packages/services/patient-sheet-service/prisma ./packages/services/patient-sheet-service/prisma
COPY packages/services/patient-sheet-service/prisma.config.ts ./packages/services/patient-sheet-service/prisma.config.ts

# Build dependencies first, then service
RUN pnpm --filter @hms/common-logging build
RUN pnpm --filter @hms/common-middleware build
RUN pnpm --filter @hms/common-pdf build
RUN pnpm --filter @hms/patient-sheet-service build

# ── Production ────────────────────────────────────────
FROM node:22-alpine AS production

RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Create non-root user
RUN addgroup --system --gid 1001 nodejs &&     adduser --system --uid 1001 nodeuser

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy package.json for needed packages
COPY packages/common/logging/package.json ./packages/common/logging/
COPY packages/common/pdf/package.json ./packages/common/pdf/
COPY packages/common/middleware/package.json ./packages/common/middleware/
COPY packages/services/patient-sheet-service/package.json ./packages/services/patient-sheet-service/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Generate Prisma client for runtime
COPY packages/services/patient-sheet-service/prisma ./packages/services/patient-sheet-service/prisma
RUN cd packages/services/patient-sheet-service && \
    DATABASE_URL="postgresql://dummy@localhost/dummy" npx prisma@6.19.3 generate --schema=prisma/schema.prisma

# Copy built artifacts from builder
COPY --from=builder /app/packages/common/logging/dist ./packages/common/logging/dist
COPY --from=builder /app/packages/common/pdf/dist ./packages/common/pdf/dist
COPY --from=builder /app/packages/common/middleware/dist ./packages/common/middleware/dist
COPY --from=builder /app/packages/services/patient-sheet-service/dist ./packages/services/patient-sheet-service/dist

# Change ownership to non-root
RUN chown -R nodeuser:nodejs /app

USER nodeuser

ENV NODE_ENV=production
ENV PORT=5016

EXPOSE 5016

WORKDIR /app/packages/services/patient-sheet-service

CMD ["node", "dist/index.js"]
