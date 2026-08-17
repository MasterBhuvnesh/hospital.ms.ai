# Developer & Deployment Guide

From a laptop with nothing installed to a production cluster, on AWS or anywhere else.

Profiles and the cloud-independence contract: [portability.md](./portability.md).

---

## 0. Six ways to run this

All six run the **same code from the same commit**. Nothing below is a build variant or a fork.

Mode 5 appears once but serves two data planes: local dependencies for a demo, managed providers for a real single-hospital deployment. It is the same container either way, which is why the list is six rows and not seven.

| # | Mode | Command | For |
|---|---|---|---|
| 1 | **Native dev** | `pnpm deps:up && pnpm dev` | Day-to-day coding. Hot reload, debugger |
| 2 | **Native dev on managed providers** | `pnpm dev` with a third-party env file | Working without a local container stack, and proving the platform adapters are real |
| 3 | **Full Compose, one container per service** | `pnpm compose:up` | Container sanity, and reaching a service directly from Postman |
| 4 | **Local Kubernetes** | kind or minikube plus `helm upgrade` | Manifests, probes, autoscaling, migration jobs. **The portability gate in CI** |
| 5 | **One container, whole backend** | `pnpm single:up`, or the same file against managed providers | **Customers with one server.** Disaster recovery, offline pilots |
| 6 | **Cluster** | Terraform plus Helm | dev, staging, production, customer-hosted, and AWS |

### The two axes

Six rows, but only two decisions. Every mode above is a pair.

**Where the services run:**

| | Form | How |
|---|---|---|
| **Host** | Node processes on your machine | `pnpm dev` |
| **N containers** | One container per service, one image | `SERVICE=<name>` |
| **One container** | Every service in one process | `SERVICES=<list>`, or neither set |
| **Pods** | Kubernetes | Helm, `image.mode` picks per-service or all-in-one |

**Where the data plane lives:**

| | Postgres | Redis | Broker | Storage | Mail |
|---|---|---|---|---|---|
| **Local** | Compose | Compose | Compose | MinIO | Mailpit |
| **Managed** | any Postgres 16 with pgvector | any Redis 7 | see the broker note below | any S3-compatible endpoint | any SMTP relay |
| **AWS** | RDS | ElastiCache | **still self-hosted** | S3 via IAM role | SES over SMTP |

The second axis is **entirely environment values**. No code, no image, and no chart knows which column it is in, which is the whole portability claim and why mode 4 runs in CI on every merge.

### Two things worth knowing before you pick

**The broker does not have a managed column.** RabbitMQ needs `rabbitmq_delayed_message_exchange`, and Amazon MQ cannot install plugins. Check whether a managed provider can enable that specific plugin before planning on it; if it cannot, the broker stays self-hosted even in mode 2 and mode 6 on AWS. See [portability.md](./portability.md).

**Managed Postgres means two URLs.** Every managed Postgres fronts the database with a connection pooler, and Prisma migrations and prepared statements do not work through a pooler in transaction mode. `DATABASE_URL` is the pooled endpoint for runtime and `DIRECT_URL` is the direct one for migrations. Also disable scale-to-zero if the provider offers it: a cold start of even a few hundred milliseconds is visible on a live queue.

### The single-container mode is not a fallback

Mode 5 and the `portable` profile are **product features**. A single-hospital customer should never be told to learn Kubernetes, and a hospital chain with its own cluster should never be told to open an AWS account.

One thing in mode 5 is not arbitrary: **`ai` runs in its own container.** Every service in one container is one Node process and therefore one event loop, and embeddings and PDF rendering are CPU bound. An embedding computed on the loop that serves the queue stalls every live token update in the building. `docker/compose/single-host.yml` splits it for that reason and for no other. Same image, one more container.

---

## 1. Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 22 LTS | `winget install OpenJS.NodeJS.LTS` · `brew install node@22` · nvm |
| pnpm | 11.20.0 | `corepack enable && corepack prepare pnpm@11.20.0 --activate` |
| Docker Desktop | latest | WSL2 backend on Windows |
| Git | latest | `winget install Git.Git` |

Per task: `kubectl`, `helm`, `kind` or `minikube`, `terraform`, Expo Go, a thermal printer for reception work. **No AWS CLI is needed** unless you are working on the `aws` profile.

```bash
node -v        # v22.x
pnpm -v        # 11.20.0
docker version # client and server both respond
```

---

## 2. Mode 1: native development

```bash
git clone <repo> atelier-health && cd atelier-health
pnpm install
cp envs/.env.example envs/.env.development

pnpm deps:up          # postgres, redis, rabbitmq (delayed plugin), minio, mailpit
pnpm db:migrate       # prisma migrate deploy, all schemas
pnpm db:seed          # hospitals, doctors, patients, medicines

pnpm dev              # 8 services + web + desktop, hot reload
pnpm dev:mobile       # expo start, separate terminal
```

| Service | URL |
|---|---|
| Gateway | http://localhost:4000 |
| Web | http://localhost:3000 |
| Desktop | electron-vite window |
| Mobile | Expo Go, scan the QR |
| RabbitMQ management | http://localhost:15672 (`guest` / `guest`) |
| MinIO console | http://localhost:9001 (`minioadmin` / `minioadmin`) |
| Mailpit | http://localhost:8025 |
| Postgres | `localhost:5432` (`hms` / `hms`) |

```bash
pnpm dev --filter @hms/scheduling      # one service
pnpm test                              # vitest
pnpm test:integration                  # testcontainers
pnpm typecheck && pnpm lint --fix
pnpm db:studio                         # prisma studio
pnpm db:reset                          # nuke, migrate, seed
pnpm deps:down -v                      # stop and delete volumes
```

**Seeded logins** (development only; the seed refuses to run when `APP_ENV=production`):

| Role | Email | Password |
|---|---|---|
| Platform admin | `admin@hms.local` | `Password123!` |
| Hospital admin | `hospital@hms.local` | `Password123!` |
| Doctor | `doctor@hms.local` | `Password123!` |
| Receptionist | `reception@hms.local` | `Password123!` |
| Patient | `patient@hms.local` | `Password123!` |

SMS in development goes to a console stub. Email goes to Mailpit. No real provider is contacted from `development` or `testing`.

---

## 2b. Client applications

### 2b.1 Scaffolding `apps/desktop`

Done once, with the official electron-vite quick-start:

```bash
cd apps
pnpm create @quick-start/electron
# Project name           › desktop
# Framework              › React
# Add TypeScript?        › Yes
# Add Electron updater?  › Yes
# Download mirror proxy? › No (Yes on a restricted network)

cd desktop
pnpm add @hms/ui @hms/contracts @hms/api-client --workspace
pnpm add electron-updater node-thermal-printer
```

The template ships the three-process build already configured:

```
apps/desktop/
├── electron.vite.config.ts     main / preload / renderer
├── electron-builder.yml        packaging and publish
└── src/
    ├── main/index.ts           windows, printer IPC, auto-updater
    ├── preload/index.ts        contextBridge, the ONLY privileged surface
    └── renderer/src/modules/   reception, doctor, nurse, pharmacy, laboratory
```

```bash
pnpm dev --filter @hms/desktop
pnpm --filter @hms/desktop build:win     # or build:mac / build:linux
```

**Do not loosen the template's security defaults.** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` are what it ships with. Every privileged capability goes through `src/preload` as a narrow, explicit IPC channel.

### 2b.2 Desktop auto-update

```yaml
# electron-builder.yml
appId: health.atelier.desktop
productName: Atelier Health
publish:
  provider: github            # or: generic, pointing at any S3-compatible bucket
  owner: <org>
  repo: atelier-health
win:
  target: nsis
  certificateSubjectName: <EV cert subject>
```

```ts
// src/main
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true          // apply on quit, never mid-consult
autoUpdater.channel = process.env.UPDATE_CHANNEL ?? 'stable'
autoUpdater.checkForUpdates()
setInterval(() => autoUpdater.checkForUpdates(), 4 * 60 * 60 * 1000)
```

The `generic` publish provider points at MinIO or any web server, so a customer-hosted deployment can serve its own update feed without GitHub or AWS.

**The Windows EV code-signing certificate is a hard prerequisite.** Unsigned installers are blocked by SmartScreen and unsigned auto-update is a non-starter on managed hospital machines. Budget roughly $300 to $500 per year and buy it before desktop ships. Use a `stagingPercentage` in the feed so a bad build cannot reach every front desk at once.

### 2b.3 Mobile auto-update

```bash
pnpm --filter @hms/mobile exec eas update --branch production --message "fix queue polling"
```

```ts
// app.config.ts
updates: {
  url: 'https://u.expo.dev/<project-id>',
  checkAutomatically: 'ON_LOAD',
  fallbackToCacheTimeout: 0,      // never block launch on a network fetch
},
runtimeVersion: { policy: 'appVersion' },
```

Check on foreground, download in background, **`reloadAsync()` on next cold start only**, never while a live-queue screen is mounted. Native changes need a store build, prompted through Play In-App Updates and gated by the server's `minSupportedVersion`.

---

## 3. Docker

### 3.1 Two image strategies, both first-class

| Strategy | Dockerfile | Image | Used by |
|---|---|---|---|
| **Per-service** | `apps/<service>/Dockerfile` | `hms-<service>` (eight of them) | **Kubernetes, every environment** |
| **All-in-one** | `docker/Dockerfile` | `hms-platform` | Compose, `single-host`, disaster recovery, offline pilots, CI smoke |

Both build from the same commit in the same CI run and are **tagged with the same git SHA**.

That shared tag is what preserves the property worth having. The reason to prefer one image was "all eight services are provably the same code"; tagging every per-service image with the same SHA gives that without giving up per-service builds.

#### Per-service is the primary deployment

```bash
# build from the REPOSITORY ROOT, never from the service directory
docker build -f apps/scheduling/Dockerfile -t hms-scheduling:$(git rev-parse --short HEAD) .
docker run -p 5003:5003 --env-file envs/.env.container hms-scheduling:$SHA
```

What it buys:

- **Its own dependency graph.** `pnpm --filter "@hms/scheduling..." build` then `deploy --prod` prunes to that service alone, so `gateway` does not ship Prisma and `identity` does not ship the PDF renderer.
- **Independent lifecycle.** A `scheduling` hotfix rebuilds and restarts one Deployment, not eight.
- **Room to diverge.** `clinical` can embed the fonts its templates need without every other image carrying them.
- **A smaller blast radius.** A CVE in one service's dependency is one rebuild.

What it costs: eight build jobs instead of one, and a longer CI run. Buildx layer caching absorbs most of it, because the `deps` layer is shared until a `package.json` changes.

#### The all-in-one image

```bash
docker run -e SERVICE=scheduling -e PORT=5003 --env-file envs/.env.container hms-platform:$SHA
```

Not a fallback experiment. It is what makes the `single-host` profile and the recovery path possible: a one-hospital customer pulls one image rather than eight, and a disaster-recovery host comes up from one `docker save`. It ships from every commit and is exercised in CI.

### 3.2 A per-service Dockerfile: `apps/<service>/Dockerfile`

Each service owns one. They are near-identical today and are expected to diverge, which is the point.

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.20.0 --activate
WORKDIR /app

# manifests only, so this layer caches until a package.json changes
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/*/package.json apps/
COPY packages/*/package.json packages/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
# "@hms/scheduling..." builds this service AND its dependencies, nothing else
RUN pnpm --filter "@hms/scheduling..." build \
 && pnpm --filter "@hms/db" prisma:generate
# prune to this service's production graph alone
RUN pnpm --filter "@hms/scheduling" deploy --prod --legacy /out

FROM base AS runtime
ENV NODE_ENV=production APP_ENV=container SERVICE=scheduling PORT=5003
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs app
COPY --from=build --chown=app:nodejs /out /app
USER app
EXPOSE 5003
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["node", "dist/index.js"]
```

`gateway` omits the `prisma:generate` step, because it owns no schema.

**Build context is the repository root**, never the service directory. The build needs `pnpm-workspace.yaml` and the shared packages, neither of which is reachable from inside `apps/scheduling/`.

### 3.2b The all-in-one image: `docker/Dockerfile`

The file itself is not reproduced here, because a copy of a real file is a future
contradiction. Read [`docker/Dockerfile`](../docker/Dockerfile). It differs from a
per-service image in one way: it is **not pruned** to one dependency graph, since
any subset of services may be asked to run.

Its entrypoint is [`docker/all-in-one.mjs`](../docker/all-in-one.mjs), which decides
how much of the platform the container is:

| Set | Runs | Used by |
|---|---|---|
| `SERVICE=scheduling` `PORT=5003` | exactly that one | Kubernetes, and `dev.yml` |
| `SERVICES=gateway,identity,comms` | those three, one process | `single-host.yml` |
| `SERVICES=ai` | one service, isolated event loop | `single-host.yml` |
| neither | every service, one process | a demo, or recovery |

`SERVICE` wins when both are set, so the per-service form and Helm's
`image.mode: all-in-one` need no knowledge of `SERVICES`.

**The catalogue has one home.** The runner discovers services by reading
`hms.port` from each `apps/*/package.json`, which is already where the port is
declared. There is no service list and no port map in the entrypoint, so
extracting a ninth service out of `clinical` requires no edit to it.

Health checks are Kubernetes probes and Compose healthchecks against
`/health/live` and `/health/ready`. The image carries a `HEALTHCHECK` against
`HEALTH_PORT`, which defaults to the gateway, because which port is worth probing
depends on `SERVICES` and cannot be baked in.

**One process means one event loop.** Several services sharing a container share
it, so a CPU-bound service starves the others. That is why `SERVICES` is a list
rather than an all-or-nothing flag, and why `ai` is deployed separately. See
section 0.

### 3.3 Registries

| Registry | Status |
|---|---|
| **Docker Hub** | Active. Every image, every environment, plus customer self-hosting and offline pilots |
| **AWS ECR** | Future. The job is written and commented out in `main.yml` |

Tag by **git SHA, never `latest`**. `latest` makes "what is actually running?" unanswerable during an incident.

A customer-hosted deployment can mirror into Harbor, GHCR, or a local registry: the chart takes `image.repository` as a value and nothing else assumes a registry.

### 3.4 Compose: dependencies

`docker/compose/compose.deps.yml`, used by `pnpm deps:up`. Note that build contexts and env paths are relative to **this file's directory**, hence `../..`.

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment: { POSTGRES_USER: hms, POSTGRES_PASSWORD: hms, POSTGRES_DB: hms }
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck: { test: ["CMD-SHELL","pg_isready -U hms"], interval: 5s, retries: 10 }

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    healthcheck: { test: ["CMD","redis-cli","ping"], interval: 5s, retries: 10 }

  rabbitmq:
    # rabbitmq:3-management-alpine + rabbitmq_delayed_message_exchange
    build: ../../docker/rabbitmq
    ports: ["5672:5672","15672:15672"]
    healthcheck: { test: ["CMD","rabbitmq-diagnostics","-q","ping"], interval: 10s, retries: 10 }

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment: { MINIO_ROOT_USER: minioadmin, MINIO_ROOT_PASSWORD: minioadmin }
    ports: ["9000:9000","9001:9001"]
    volumes: [miniodata:/data]
    healthcheck:
      test: ["CMD","curl","-f","http://localhost:9000/minio/health/live"]
      interval: 5s
      retries: 10

  minio-init:                       # creates the private buckets, then exits
    image: minio/mc
    restart: "no"
    depends_on: { minio: { condition: service_healthy } }
    entrypoint: >
      sh -c "mc alias set local http://minio:9000 minioadmin minioadmin &&
             mc mb -p local/hms-documents local/hms-prescriptions local/hms-invoices local/hms-lab &&
             mc anonymous set none local/hms-documents local/hms-prescriptions local/hms-invoices local/hms-lab"

  mailpit:
    image: axllent/mailpit
    ports: ["1025:1025","8025:8025"]

volumes: { pgdata: {}, miniodata: {} }
```

`docker/rabbitmq/Dockerfile`:

```dockerfile
FROM rabbitmq:3-management-alpine
ARG PLUGIN_VERSION=3.13.0
ADD --chown=rabbitmq:rabbitmq \
  https://github.com/rabbitmq/rabbitmq-delayed-message-exchange/releases/download/v${PLUGIN_VERSION}/rabbitmq_delayed_message_exchange-${PLUGIN_VERSION}.ez \
  /opt/rabbitmq/plugins/
RUN rabbitmq-plugins enable --offline rabbitmq_delayed_message_exchange
```

This one image is used in Compose, in kind, and in every cluster including AWS. See [portability.md](./portability.md) for why Amazon MQ is not an option.

### 3.5 Compose: `single-host` production

`docker/compose/compose.single-host.yml`. One VM, no Kubernetes, no cloud account.

```yaml
x-service: &svc
  image: ${REGISTRY:-docker.io/atelierhealth}/hms-platform:${TAG:?set TAG to a git sha}
  restart: unless-stopped
  env_file: [../../envs/.env.container]
  depends_on:
    postgres: { condition: service_healthy }
    redis:    { condition: service_started }
    rabbitmq: { condition: service_healthy }
    migrate:  { condition: service_completed_successfully }

services:
  migrate:
    image: ${REGISTRY:-docker.io/atelierhealth}/hms-platform:${TAG}
    restart: "no"
    env_file: [../../envs/.env.container]
    entrypoint: ["sh","-c","pnpm db:migrate:deploy"]
    depends_on:
      postgres: { condition: service_healthy }

  gateway:    { <<: *svc, environment: [SERVICE=gateway,    PORT=4000], ports: ["4000:4000"] }
  identity:   { <<: *svc, environment: [SERVICE=identity,   PORT=5001] }
  directory:  { <<: *svc, environment: [SERVICE=directory,  PORT=5002] }
  scheduling: { <<: *svc, environment: [SERVICE=scheduling, PORT=5003] }
  clinical:   { <<: *svc, environment: [SERVICE=clinical,   PORT=5004] }
  commerce:   { <<: *svc, environment: [SERVICE=commerce,   PORT=5005] }
  comms:      { <<: *svc, environment: [SERVICE=comms,      PORT=5006] }
  ai:         { <<: *svc, environment: [SERVICE=ai,         PORT=5007] }

  web:
    image: ${REGISTRY:-docker.io/atelierhealth}/hms-web:${TAG}
    ports: ["3000:3000"]
    env_file: [../../envs/.env.container]
    restart: unless-stopped

  scheduler:                        # replaces Kubernetes CronJobs on this profile
    <<: *svc
    environment: [SERVICE=comms, PORT=5106, ROLE=scheduler]
```

Every service inherits the `migrate` dependency from the anchor, so none of them race the migration. `deploy.replicas` is deliberately absent: it is a Swarm key that plain Compose ignores. To scale on this profile, use `docker compose up -d --scale scheduling=2`.

```bash
TAG=$(git rev-parse --short HEAD) \
  docker compose -f docker/compose/compose.single-host.yml \
                 -f docker/compose/compose.deps.yml up -d
```

Only `gateway` and `web` publish ports. Everything else talks over the Compose network, the same posture as `ClusterIP`.

---

## 4. Kubernetes

### 4.1 Cluster shape (identical on and off AWS)

- **Namespaces:** `hms-dev`, `hms-staging`, `hms-production`
- **Ingress:** ingress-nginx to `gateway` only. Every other service is `ClusterIP`. **No ALB controller, on any profile**
- **TLS:** cert-manager with Let's Encrypt, or a customer-supplied certificate
- **Secrets:** delivered as process environment. Sourced by Sealed Secrets, or External Secrets against Vault, AWS Secrets Manager, GCP, or Azure. **Never in an image, a values file, or git**
- **Probes:** `/health/live` (process up), `/health/ready` (its own dependencies reachable: Postgres and Redis for most, plus RabbitMQ for `comms` and `scheduling`)
- **Migrations:** a Helm `pre-upgrade` Job running `prisma migrate deploy` from the same image. **Never on service startup**: eight replicas racing a migration is a bad afternoon
- **Autoscaling:** HPA on CPU everywhere, plus **KEDA** on RabbitMQ queue depth for `scheduling`. KEDA works on any cluster; a cloud-specific metrics adapter would not
- **PodDisruptionBudget:** `minAvailable: 1` on `gateway` and `scheduling`
- **NetworkPolicy:** default-deny, then explicit allows

### 4.2 Helm: one chart, three values files

```
infra/helm/hms/
├── values.yaml            base, cloud-neutral. No ARN, no annotation, no storage class
├── values-portable.yaml   in-cluster postgres, redis, minio
└── values-aws.yaml        RDS, ElastiCache, S3, IRSA
```

`values.yaml`:

```yaml
image:
  registry: docker.io/atelierhealth
  tag: ""                  # git SHA, set by CI. The SAME tag for every service
  pullPolicy: IfNotPresent
  # per-service -> registry/hms-<name>:tag      (default, what production runs)
  # all-in-one  -> registry/hms-platform:tag    with SERVICE=<name>
  mode: per-service

services:
  - { name: gateway,    port: 4000, replicas: 2, public: true }
  - { name: identity,   port: 5001, replicas: 2 }
  - { name: directory,  port: 5002, replicas: 2 }
  - { name: scheduling, port: 5003, replicas: 3, keda: { queue: queue.events, target: 100 } }
  - { name: clinical,   port: 5004, replicas: 2 }
  - { name: commerce,   port: 5005, replicas: 2 }
  - { name: comms,      port: 5006, replicas: 2 }
  - { name: ai,         port: 5007, replicas: 2 }

# every dependency is a URL or a secret reference, never a provider name
externalSecretBackend: kubernetes    # kubernetes | vault | aws | gcp | azure
```

`values-aws.yaml` adds only what AWS changes: the RDS and ElastiCache endpoints, the S3 bucket and region, the IRSA service-account annotation, and `externalSecretBackend: aws`. It changes **no template**.

One `deployment.yaml` loops `.Values.services`, rendering Deployment plus Service plus HPA per entry, and resolves the image from `image.mode`:

```yaml
{{- $img := printf "%s/hms-%s:%s" $.Values.image.registry .name $.Values.image.tag }}
{{- if eq $.Values.image.mode "all-in-one" }}
{{-   $img = printf "%s/hms-platform:%s" $.Values.image.registry $.Values.image.tag }}
{{- end }}
image: {{ $img }}
```

`SERVICE` is set in both modes, so the all-in-one entrypoint works and the per-service image still knows its own name for logs and metrics.

**Both modes take the same `image.tag`**, because CI builds all nine images from one commit and tags them identically. Switching a cluster from per-service to all-in-one is a one-line values change with no rebuild, which is exactly what you want during a recovery.

The chart is roughly 200 lines. **Adding a service is one values entry plus one `apps/<name>/Dockerfile`.**

```bash
helm upgrade --install hms infra/helm/hms -n hms-production --create-namespace \
  -f infra/helm/hms/values.yaml \
  -f infra/helm/hms/values-portable.yaml \
  --set image.tag=$(git rev-parse --short HEAD) \
  --wait --timeout 10m
```

### 4.3 kind: the portable profile, end to end

This sequence is complete and runnable. It is also what CI runs on every merge.

**Install**

```bash
# Windows
winget install Kubernetes.kind Kubernetes.kubectl Helm.Helm
# macOS
brew install kind kubectl helm
# Linux
[ "$(uname -m)" = x86_64 ] && curl -Lo ./kind https://kind.sigs.k8s.io/dl/latest/kind-linux-amd64
chmod +x ./kind && sudo mv ./kind /usr/local/bin/kind
curl -LO "https://dl.k8s.io/release/$(curl -sL https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

`scripts/k8s/kind-config.yaml`:

```yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
    extraPortMappings:
      - { containerPort: 80,  hostPort: 80,  protocol: TCP }
      - { containerPort: 443, hostPort: 443, protocol: TCP }
  - role: worker
  - role: worker
```

**Run** (`scripts/k8s/kind-up.sh` does all of this):

```bash
set -euo pipefail
SHA=$(git rev-parse --short HEAD)

# 1. cluster
kind create cluster --name hms --config scripts/k8s/kind-config.yaml

# 2. ingress
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
kubectl wait -n ingress-nginx --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller --timeout=180s

# 3. dependencies. Chart versions are PINNED on purpose: unpinned charts break silently
kubectl create namespace hms-dev
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add kedacore https://kedacore.github.io/charts
helm repo update

helm install pg    bitnami/postgresql --version 16.2.1 -n hms-dev \
  --set auth.username=hms,auth.password=hms,auth.database=hms
helm install redis bitnami/redis      --version 20.1.0 -n hms-dev --set auth.enabled=false
helm install minio bitnami/minio      --version 14.7.0 -n hms-dev \
  --set auth.rootUser=minioadmin,auth.rootPassword=minioadmin \
  --set defaultBuckets="hms-documents\,hms-prescriptions\,hms-invoices\,hms-lab"
helm install keda  kedacore/keda      --version 2.15.1 -n keda --create-namespace

# RabbitMQ uses OUR image, because the stock chart has no delayed-message plugin
docker build -t hms-rabbitmq:local docker/rabbitmq
kind load docker-image hms-rabbitmq:local --name hms
helm install rabbit bitnami/rabbitmq --version 14.6.6 -n hms-dev \
  --set image.registry=docker.io --set image.repository=library/hms-rabbitmq \
  --set image.tag=local --set image.pullPolicy=Never \
  --set auth.username=hms,auth.password=hms

# 4. SECRETS. Without this every pod CrashLoopBackOffs on a missing env var
kubectl create secret generic hms-env -n hms-dev \
  --from-env-file=envs/.env.container

# 5. build and load. No registry push needed: this is kind's advantage
docker build -f docker/Dockerfile -t hms-platform:$SHA .
kind load docker-image hms-platform:$SHA --name hms

# 6. deploy the PORTABLE profile
helm upgrade --install hms infra/helm/hms -n hms-dev \
  -f infra/helm/hms/values.yaml -f infra/helm/hms/values-portable.yaml \
  --set image.repository=hms-platform --set image.tag=$SHA \
  --set image.pullPolicy=Never \
  --set envSecretName=hms-env \
  --wait --timeout 10m

# 7. ingress for the app, then verify
kubectl apply -f infra/kubernetes/ingress/hms-dev.yaml
curl -H 'Host: hms.local' http://localhost/health/ready
kubectl get pods -n hms-dev
```

**Teardown:** `kind delete cluster --name hms`

> **On Bitnami charts.** The Bitnami public catalog changed distribution terms during 2025, so unpinned installs and `latest` tags can break without warning. Every chart above is version-pinned, and `scripts/k8s/kind-up.sh` is the single place to update them. If a chart becomes unavailable, the replacements we have validated are CloudNativePG for Postgres, the official Redis image with a small manifest, the MinIO operator, and the RabbitMQ cluster operator.

### 4.4 minikube

Closer to a real cluster (a real driver, addons, a dashboard). **Use it for autoscaling, storage classes, and the dashboard.** Heavier than kind.

```bash
# install
winget install Kubernetes.minikube      # or: brew install minikube

minikube start --cpus=4 --memory=8192 --driver=docker --profile hms
minikube addons enable ingress        -p hms
minikube addons enable metrics-server -p hms      # required for HPA

# build straight into minikube's daemon: no registry, no load step
eval $(minikube -p hms docker-env)                             # bash/zsh
# PowerShell: & minikube -p hms docker-env --shell powershell | Invoke-Expression

SHA=$(git rev-parse --short HEAD)
docker build -f docker/Dockerfile -t hms-platform:$SHA .
```

Then follow steps 3 through 7 of the kind sequence unchanged. Add `<minikube ip> hms.local` to your hosts file.

```bash
minikube dashboard -p hms
kubectl get hpa -n hms-dev -w        # watch autoscaling actually work
minikube delete -p hms
```

### 4.5 kind versus minikube

| | kind | minikube |
|---|---|---|
| Startup | ~30s | ~2 min |
| Resources | Low | Higher |
| Load a local image | `kind load docker-image` | `eval $(minikube docker-env)` |
| Addons (dashboard, metrics) | Manual | Built in |
| CI | **Yes** | No |
| Use for | Daily manifest work, CI | Autoscaling, storage, dashboard |

Neither is required for normal development. Modes 1 and 2 cover that.

### 4.6 Debugging

```bash
kubectl get pods -n hms-dev -w
kubectl logs -f deploy/hms-scheduling -n hms-dev
kubectl describe pod <pod> -n hms-dev            # events explain most failures
kubectl exec -it deploy/hms-scheduling -n hms-dev -- sh
kubectl port-forward svc/hms-gateway 4000:4000 -n hms-dev
kubectl get events -n hms-dev --sort-by=.lastTimestamp
helm history hms -n hms-dev
helm rollback hms <revision> -n hms-dev
```

---

## 5. Terraform: agnostic core, optional AWS layer

```
infra/terraform/
├── modules/
│   ├── kubernetes/         PROVIDER-AGNOSTIC. kubernetes + helm providers only
│   │   ├── namespaces/  ingress-nginx/  cert-manager/  sealed-secrets/
│   │   ├── postgres-cnpg/  redis/  rabbitmq/  minio/
│   │   ├── observability/  keda/
│   └── aws/                AWS ONLY
│       ├── vpc/  eks/  rds/  elasticache/  s3/  ecr/  iam-irsa/  secrets-manager/
└── environments/
    ├── local-kind/         kubernetes only
    ├── portable-example/   kubernetes only, against any kubeconfig
    ├── dev/  staging/  production/     aws + kubernetes
```

**A customer running `portable` needs only `modules/kubernetes` and a kubeconfig.** They never open an AWS module and never see a provider block they cannot satisfy.

An AWS environment composes both: `modules/aws` provisions the substrate, `modules/kubernetes` installs what runs inside it, minus what AWS supplies (RDS instead of CloudNativePG, ElastiCache instead of in-cluster Redis, S3 instead of MinIO). RabbitMQ and observability come from `modules/kubernetes` on **every** profile.

```bash
# portable, any cluster
cd infra/terraform/environments/portable-example
terraform init && terraform plan -out=tfplan && terraform apply tfplan

# aws
cd infra/terraform/environments/dev
terraform init && terraform plan -out=tfplan   # ALWAYS review the plan
terraform apply tfplan
aws eks update-kubeconfig --region ap-south-1 --name hms-dev
```

State lives in S3 with DynamoDB locking on AWS environments, and in any Terraform-supported backend (including a local file or Postgres) for portable ones. `production` requires a reviewed PR to apply. No resource is created by hand: a console-created resource is invisible to the next engineer.

---

## 6. CI/CD

| Workflow | Trigger | Does |
|---|---|---|
| `pr.yml` | every PR | install, lint, typecheck, **test**, contract validation, **portability lint**, docker build (no push). Required to merge |
| `main.yml` | merge to main | build **nine images** (eight per-service plus the all-in-one) tagged with the same git SHA, push to Docker Hub, deploy to `hms-dev`, **deploy the `portable` profile to kind and run the loop smoke test** |
| `release.yml` | tag `v*` | promote the **same digest** to staging, run the migration Job, integration tests, promote to production, record deployment metadata |
| `desktop.yml` | tag `desktop-v*` | build and sign Windows and macOS artifacts, publish to the update feed |
| `mobile.yml` | tag `mobile-v*` | EAS build, submit, and `eas update` |

**The promotion rule:** `release.yml` never rebuilds. Promoting a rebuild means testing something other than what you ship.

```
PR ──► lint · typecheck · test · portability-lint · build ──► merge
merge ──► 8 × hms-<service>:$SHA ─┐
      └─► hms-platform:$SHA ──────┼─► Docker Hub ──► hms-dev ──► smoke
                                  ├─► (ECR: written, commented out)
                                  └─► kind PORTABLE deploy ──► loop smoke test
tag ──► same digests ──► migrate ──► staging ──► integration ──► production
```

### 6.1 `main.yml`

```yaml
name: main
on:
  push: { branches: [main] }

jobs:
  # ---- eight service images -------------------------------------------------
  build-services:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        service: [gateway, identity, directory, scheduling,
                  clinical, commerce, comms, ai]
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ vars.DOCKERHUB_USER }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      # ── ECR: enable when production pulls move to AWS ──────────────────
      # - name: Configure AWS credentials
      #   uses: aws-actions/configure-aws-credentials@v4
      #   with:
      #     role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
      #     aws-region: ap-south-1
      #
      # - name: Log in to Amazon ECR
      #   id: ecr
      #   uses: aws-actions/amazon-ecr-login@v2
      # ───────────────────────────────────────────────────────────────────

      # eight per-service images, built in parallel, all on the SAME git SHA
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: apps/${{ matrix.service }}/Dockerfile
          push: true
          # add when the ECR block above is enabled:
          #   ${{ steps.ecr.outputs.registry }}/hms-${{ matrix.service }}:${{ github.sha }}
          tags: |
            ${{ vars.DOCKERHUB_USER }}/hms-${{ matrix.service }}:${{ github.sha }}
            ${{ vars.DOCKERHUB_USER }}/hms-${{ matrix.service }}:main
          cache-from: type=gha,scope=${{ matrix.service }}
          cache-to: type=gha,mode=max,scope=${{ matrix.service }}

  # ---- the all-in-one image, same commit, same tag --------------------------
  build-platform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          username: ${{ vars.DOCKERHUB_USER }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: docker/Dockerfile
          push: true
          tags: |
            ${{ vars.DOCKERHUB_USER }}/hms-platform:${{ github.sha }}
            ${{ vars.DOCKERHUB_USER }}/hms-platform:main
          cache-from: type=gha,scope=platform
          cache-to: type=gha,mode=max,scope=platform

      # prove all eight boot from the one digest
      - run: ./scripts/ci/smoke-all-in-one.sh ${{ github.sha }}

  # THE portability gate. If this breaks, cloud-agnosticism has broken.
  portable-deploy:
    needs: [build-services, build-platform]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: helm/kind-action@v1
        with: { cluster_name: hms, config: scripts/k8s/kind-config.yaml }
      - run: ./scripts/k8s/kind-up.sh --image-tag ${{ github.sha }} --pull
      - run: ./scripts/ci/check-portable-chart.sh
      - run: pnpm test:smoke -- --base-url http://localhost --host hms.local

  deploy-dev:
    needs: build-services
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          helm upgrade --install hms infra/helm/hms -n hms-dev \
            -f infra/helm/hms/values.yaml -f infra/helm/hms/values-aws.yaml \
            --set image.repository=${{ env.IMAGE }} \
            --set image.tag=${{ github.sha }} --wait --timeout 10m
      - run: ./scripts/deployment/smoke.sh
```

Keep the ECR block **commented in place**, not deleted. A commented job that already names the right action versions and outputs is worth far more than a TODO.

### 6.2 Portability gates in `pr.yml`

```yaml
- name: No cloud SDK outside platform-aws
  run: pnpm lint:portability        # eslint no-restricted-imports on @aws-sdk/*

- name: Base chart is cloud-neutral
  run: ./scripts/ci/check-portable-chart.sh
```

`check-portable-chart.sh` renders the chart with `values-portable.yaml` and fails if the output contains `amazonaws.com`, `eks.amazonaws.com/`, `alb.ingress`, `service.beta.kubernetes.io/aws-`, or a `gp2`/`gp3` storage class.

---

## 7. Environment configuration

### 7.1 One file per environment

```
envs/
├── .env.example        the ONLY file committed to git
├── .env.development    local native dev (Mode 1)
├── .env.testing        test runs and CI: throwaway DB, provider stubs
├── .env.container      Compose and Docker (Modes 2 and 3): service DNS names
└── .env.production     real cluster: placeholders only. Real values arrive as secrets
```

```gitignore
envs/.env.*
!envs/.env.example
```

Selection is by `APP_ENV`, defaulting to `development`. `packages/config` loads `envs/.env.${APP_ENV}` and validates the result through a zod schema. **A service that boots with a missing or malformed key must fail immediately at startup, not 404 at 3pm on a clinic day.**

`NODE_ENV` stays a build concern (`development` or `production`, for bundlers and library behaviour). `APP_ENV` is the deployment concern. They are separate on purpose and must not be conflated.

### 7.2 What differs between them

| Key | development | testing | container | production |
|---|---|---|---|---|
| `DATABASE_URL` host | `localhost` | `localhost` (`hms_test`) | `postgres` | RDS or in-cluster endpoint |
| `REDIS_URL` host | `localhost` | `localhost` (db 1) | `redis` | ElastiCache or in-cluster |
| `RABBITMQ_URL` host | `localhost` | `localhost` (vhost `test`) | `rabbitmq` | in-cluster |
| `S3_ENDPOINT` | `http://localhost:9000` | same | `http://minio:9000` | MinIO service or `https://s3.<region>.amazonaws.com` |
| Email | Mailpit | in-memory stub | Mailpit | SMTP relay |
| SMS | console stub | stub | console stub | real provider |
| Push, WhatsApp, Razorpay, LLM | sandbox keys | **stubs, never a real provider** | sandbox keys | live keys via secrets |
| `LOG_LEVEL` | `debug` | `silent` | `debug` | `info` |

`.env.example` documents **every** key with a fake value. CI fails if a service reads a key absent from `.env.example`, which is what keeps this table honest.

### 7.3 The keys

```bash
NODE_ENV=development
APP_ENV=development          # development | testing | container | production
PORT=5003
SERVICE=scheduling

DATABASE_URL=postgresql://hms:hms@localhost:5432/hms?schema=scheduling
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://guest:guest@localhost:5672

JWT_PRIVATE_KEY=             # identity ONLY
JWT_PUBLIC_KEY=              # every service
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=30d

# object storage: S3 API. Same keys for MinIO, S3, R2, Ceph
STORAGE_DRIVER=s3-compatible
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET_DOCUMENTS=hms-documents
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_FORCE_PATH_STYLE=true     # required by MinIO, harmless on S3
S3_PRESIGN_TTL=300

# notifications
SMS_DRIVER=console           # console | msg91 | gupshup | twilio | sns
SMS_API_KEY=
SMS_SENDER_ID=
SMS_DLT_TEMPLATE_OTP=

SMTP_URL=smtp://localhost:1025
[email protected]
EMAIL_FROM_NAME=Atelier Health

EXPO_ACCESS_TOKEN=
WHATSAPP_TOKEN=
WHATSAPP_PHONE_ID=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=

# payments
PAYMENT_DRIVER=razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# AI: any OpenAI-compatible endpoint, including a self-hosted one
LLM_BASE_URL=https://integrate.api.nvidia.com/v1
LLM_API_KEY=
LLM_MODEL=nvidia/nemotron-3-ultra

# clients
UPDATE_FEED_URL=
MIN_SUPPORTED_MOBILE_VERSION=1.0.0
MIN_SUPPORTED_DESKTOP_VERSION=1.0.0

OTEL_EXPORTER_OTLP_ENDPOINT=
LOG_LEVEL=debug
```

Note what is **not** here: no `AWS_*` key appears in any service's configuration. AWS credentials exist only where External Secrets talks to Secrets Manager, which is infrastructure, not application configuration.

In production these values arrive as a Kubernetes Secret projected into the pod environment. `JWT_PRIVATE_KEY` is bound only to the `identity` service account.

---

## 8. Conventions

**Branches:** `main` (always deployable), `feat/*`, `fix/*`, `chore/*`. No long-lived develop branch.

**Commits:** Conventional Commits, for example `feat(scheduling): add priority ordering to queue`.

**PRs:** one logical change, tests included, all checks green, one review. Reference the checklist ID in the title: `feat(scheduling): PAT-4.04 sequence-based token generation`.

**Code rules:**
- `packages/contracts` is the source of truth. Add the schema before the handler.
- The repository layer applies `hospitalId` scoping. Never a route handler's job.
- Every consumer is idempotent on `messageId`. Every critical write takes an idempotency key.
- No PHI in logs. Use `packages/logger`, never `console.log`.
- No cross-service database reads. Ever.
- **No cloud SDK outside `packages/platform-aws`.** Lint enforces it.
- Date and time on anything hospital-scoped derives from the hospital's timezone, never the server's.

**Definition of done** for a phase:

- [ ] Code merged, and every checklist ID in the phase closed or explicitly deferred
- [ ] Unit and integration tests pass
- [ ] Image reproducible, all 8 services boot from one digest
- [ ] Deployable through Helm on **both** the `portable` and `aws` profiles
- [ ] Metrics and logs visible in Grafana and Loki
- [ ] Authorization verified, **including the negative cases**
- [ ] Failure behaviour tested
- [ ] Documentation updated, including [traceability.md](./traceability.md)
- [ ] The end-to-end loop still passes

---

## 9. Verification: the checks that actually matter

Per phase, the check is a real run, not a green test suite.

```bash
SHA=$(git rev-parse --short HEAD)

# 1. Local: everything boots
pnpm deps:up && pnpm dev

# 2. Single-image sanity: all 8 boot from ONE digest, each on its own port
declare -A PORTS=( [gateway]=4000 [identity]=5001 [directory]=5002 [scheduling]=5003 \
                   [clinical]=5004 [commerce]=5005 [comms]=5006 [ai]=5007 )
for s in "${!PORTS[@]}"; do
  docker run -d --name "hms-$s" --network host \
    -e SERVICE=$s -e PORT=${PORTS[$s]} \
    --env-file envs/.env.container hms-platform:$SHA
done
for s in "${!PORTS[@]}"; do
  curl -fsS "http://localhost:${PORTS[$s]}/health/ready" >/dev/null \
    && echo "ok $s" || echo "FAIL $s"
done

# 3. Kubernetes, portable profile
./scripts/k8s/kind-up.sh --image-tag $SHA
kubectl get deploy -n hms-dev        # 8 deployments, 8 images, ONE git SHA

# 4. Auth negatives: these must FAIL
curl -H "x-user-role: ADMIN" http://localhost:4000/api/admin/hospitals            # 401
curl -H "Authorization: Bearer $PATIENT_A" \
     "http://localhost:4000/api/appointments?patientId=$PATIENT_B"                # 403
curl -H "Authorization: Bearer $HOSPITAL_ADMIN" \
     "http://localhost:4000/api/patients/$P/clinical"                             # 403 without break-glass
kubectl run t --rm -it --image=curlimages/curl -- \
     curl http://hms-clinical.hms-dev:5004/health                                 # blocked by NetworkPolicy

# 5. Portability gates
pnpm lint:portability
./scripts/ci/check-portable-chart.sh

# 6. THE LOOP TEST, the one that matters
pnpm test:e2e -- loop.spec.ts
#   walk-in on desktop → token on the phone within 2s → advance the queue
#   → position updates and push fires at N-away → patient sheet on the doctor screen
#   → consultation check-out → invoice → payment → dispense → stock decremented once

# 7. AI evals (P4)
pnpm --filter @hms/ai eval          # gated on allergy and current-medication recall
```

---

## 10. Disaster recovery

**Primary failure mode:** a deployment becomes unavailable, or Kubernetes is temporarily unusable.

**Recovery path:**

1. The image is built from every commit and pushed to Docker Hub, so it is always current.
2. It takes the same environment variables on every profile.
3. Bring the platform up on any Docker host:
   ```bash
   TAG=<last-known-good-sha> docker compose \
     -f docker/compose/compose.single-host.yml \
     -f docker/compose/compose.deps.yml up -d
   ```
4. Database and object storage stay **external** to the recovery host wherever possible. The fallback restores compute, never data.
5. **Test this quarterly**, on a clean VM with no cloud credentials present. An untested recovery path does not exist. This drill doubles as the portability check in [portability.md 6.4](./portability.md).

**Data recovery:**

| Asset | Mechanism | Works on |
|---|---|---|
| Postgres | pgBackRest or WAL-G, continuous archive plus PITR, to an S3-compatible target | MinIO and S3, identical configuration |
| Object storage | Bucket versioning plus scheduled replication to a second bucket | MinIO (`mc mirror --watch`) and S3 (replication rules) |
| Secrets | Backed up in the secret store, never in the cluster | Vault, Secrets Manager, or sealed-secret files in git |
| Configuration | Terraform state plus the Helm values files | Any profile |

**RPO 5 minutes. RTO 1 hour.** Both measured in the quarterly drill, not assumed.
