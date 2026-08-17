# docker/compose

| File | Purpose | Command |
|---|---|---|
| `deps.yml` | Postgres, Redis, RabbitMQ, MinIO, Mailpit | `pnpm deps:up` |
| `observability.yml` | Prometheus, Grafana, Loki, Tempo | `pnpm obs:up` |
| `dev.yml` | Dependencies plus one container per service | `pnpm compose:up` |
| `single-host.yml` | The whole backend in one container | `pnpm single:up` |

No `compose.` prefix on the filenames. They already live in a directory called `compose`.

## Two files, not one

`deps.yml` is needed to run anything. `observability.yml` is not, and four extra containers on every `pnpm dev` is a tax paid by people debugging a route handler. Start it when you are looking at latency.

`observability.yml` joins the `deps.yml` network as an external network, so Prometheus can scrape RabbitMQ by name. **Start `deps.yml` first**, or the network does not exist yet.

## Watch the relative paths

Build contexts and `env_file` paths resolve **relative to this directory**, not to the repository root. That is why they read `../rabbitmq` and `../../envs/.env.container`.

## Ports

Every port binds to `127.0.0.1`. A development database reachable from the local network is a development database reachable from a coffee shop.

`3000` is left free for the Next.js dev server, which is why Grafana is on `3001`.

## dev.yml and single-host.yml differ in two ways

Both run the same `hms-platform` image built from `docker/Dockerfile`.

**Container count.** `dev.yml` runs eight containers with `SERVICE=<name>`. `single-host.yml` runs two: one with `SERVICES=<everything except ai>` and one with `SERVICES=ai`. `ai` is split because one container is one Node event loop, and an embedding computed on the loop that serves the queue stalls every live token update.

**Published ports.** `dev.yml` publishes all eight, because its purpose is reaching a service directly from Postman. `single-host.yml` publishes only the gateway, which is the posture production should have.

## single-host.yml deliberately does not include deps.yml

So that one file serves both data planes:

```bash
docker compose -f deps.yml -f single-host.yml up -d   # local dependencies
docker compose -f single-host.yml up -d               # managed providers
```

The second form needs `DATABASE_URL`, `REDIS_URL`, `RABBITMQ_URL`, `S3_ENDPOINT` and `SMTP_URL` pointing at real endpoints, in `envs/.env.container`. Nothing else changes, which is the point of the platform adapters.

## single-host is a product, not a convenience

A one-hospital customer with a single Linux box should never be told to learn Kubernetes. Every service inherits a `migrate` dependency from the shared anchor, so none of them race the migration. Only `gateway` and `web` publish ports; everything else talks over the Compose network, which is the same posture as `ClusterIP`.

`deploy.replicas` is deliberately absent, because it is a Swarm key that plain Compose ignores. Scale with `docker compose up -d --scale scheduling=2`.
