# docker/compose

| File | Purpose |
|---|---|
| `compose.deps.yml` | Postgres, Redis, RabbitMQ, MinIO, Mailpit. Used by `pnpm deps:up` |
| `compose.dev.yml` | Dependencies plus services with hot reload |
| `compose.single-host.yml` | Production on one VM, no Kubernetes |

## Watch the relative paths

Build contexts and `env_file` paths resolve **relative to this directory**, not to the repository root. That is why they read `../../docker/rabbitmq` and `../../envs/.env.container`.

## single-host is a product, not a convenience

A one-hospital customer with a single Linux box should never be told to learn Kubernetes. Every service inherits a `migrate` dependency from the shared anchor, so none of them race the migration. Only `gateway` and `web` publish ports; everything else talks over the Compose network, which is the same posture as `ClusterIP`.

`deploy.replicas` is deliberately absent, because it is a Swarm key that plain Compose ignores. Scale with `docker compose up -d --scale scheduling=2`.
