# docker/compose

| File | Purpose | Command |
|---|---|---|
| `deps.yml` | Postgres, Redis, RabbitMQ, MinIO, Mailpit | `pnpm deps:up` |
| `observability.yml` | Prometheus, Grafana, Loki, Tempo | `pnpm obs:up` |
| `dev.yml` | Dependencies plus services with hot reload | |
| `single-host.yml` | Production on one VM, no Kubernetes | |

No `compose.` prefix on the filenames. They already live in a directory called `compose`.

## Two files, not one

`deps.yml` is needed to run anything. `observability.yml` is not, and four extra containers on every `pnpm dev` is a tax paid by people debugging a route handler. Start it when you are looking at latency.

`observability.yml` joins the `deps.yml` network as an external network, so Prometheus can scrape RabbitMQ by name. **Start `deps.yml` first**, or the network does not exist yet.

## Watch the relative paths

Build contexts and `env_file` paths resolve **relative to this directory**, not to the repository root. That is why they read `../rabbitmq` and `../../envs/.env.container`.

## Ports

Every port binds to `127.0.0.1`. A development database reachable from the local network is a development database reachable from a coffee shop.

`3000` is left free for the Next.js dev server, which is why Grafana is on `3001`.

## single-host is a product, not a convenience

A one-hospital customer with a single Linux box should never be told to learn Kubernetes. Every service inherits a `migrate` dependency from the shared anchor, so none of them race the migration. Only `gateway` and `web` publish ports; everything else talks over the Compose network, which is the same posture as `ClusterIP`.

`deploy.replicas` is deliberately absent, because it is a Swarm key that plain Compose ignores. Scale with `docker compose up -d --scale scheduling=2`.
