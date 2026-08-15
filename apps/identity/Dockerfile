# =============================================================================
#  @hms/identity  ->  hms-identity
#
#  Build from the REPOSITORY ROOT, never from this directory, because the
#  build needs the workspace manifests and the shared packages:
#
#      docker build -f apps/identity/Dockerfile -t hms-identity:$(git rev-parse --short HEAD) .
#
#  CI tags this with the same git SHA as every other service image and as the
#  all-in-one image, so an environment is provably running one commit.
# =============================================================================

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# --- dependencies -------------------------------------------------------------
# Manifests only, so this layer is cached until a package.json actually changes.
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/*/package.json apps/
COPY packages/*/package.json packages/
RUN pnpm install --frozen-lockfile

# --- build --------------------------------------------------------------------
FROM deps AS build
COPY . .
# "@hms/identity..." builds this service AND the packages it depends on, nothing else.
RUN pnpm --filter "@hms/identity..." build \
 && pnpm --filter "@hms/db" prisma:generate
# Prune to the production dependency graph for this service alone.
RUN pnpm --filter "@hms/identity" deploy --prod --legacy /out

# --- runtime ------------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production \
    APP_ENV=container \
    SERVICE=identity \
    PORT=5001

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs app
COPY --from=build --chown=app:nodejs /out /app
USER app

EXPOSE 5001
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["node", "dist/index.js"]
