# =============================================================================
#  hms-platform  ->  the all-in-one image
#
#  Build from the REPOSITORY ROOT, never from this directory:
#
#      docker build -f docker/Dockerfile -t hms-platform:$(git rev-parse --short HEAD) .
#
#  CI tags this with the same git SHA as the eight per-service images, so an
#  environment is provably running one commit whichever strategy it uses.
#
#  Unlike a per-service image this one is NOT pruned to one dependency graph: it
#  carries every service's dependencies, because any subset of them may be asked
#  to run. That is the trade, and it is why per-service images stay primary for
#  Kubernetes. See docs/developer.md section 3.1.
# =============================================================================

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.20.0 --activate
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
# ./apps/* is the eight services and nothing else: web, mobile and desktop are
# excluded from the workspace in pnpm-workspace.yaml until they are scaffolded.
RUN pnpm --filter "./packages/*" build && pnpm --filter "./apps/*" build

# --- runtime ------------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production \
    APP_ENV=container

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs app
COPY --from=build --chown=app:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=app:nodejs /app/apps         ./apps
COPY --from=build --chown=app:nodejs /app/packages     ./packages
COPY --from=build --chown=app:nodejs /app/docker/all-in-one.mjs ./docker/all-in-one.mjs
COPY --from=build --chown=app:nodejs /app/docker/migrate.sh ./docker/migrate.sh
USER app

# Documentation only; publishing is decided where the container is orchestrated.
EXPOSE 4000 5001 5002 5003 5004 5005 5006 5007

# Which port is worth probing depends on SERVICES, so it is a variable rather
# than a guess. The default is the gateway, which is in the default service set.
ENV HEALTH_PORT=4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.HEALTH_PORT+'/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["node", "docker/all-in-one.mjs"]
