# apps/gateway

**Port 4000.** Routing, JWT verification, header stripping, rate limiting, WebSocket upgrade and fanout.

Owns **no** database schema. It holds no business state.

## Critical rules

- **This is the only service exposed publicly.** Every other service is `ClusterIP` and unreachable from outside the cluster.
- **Strip every inbound `x-user-*` header before verifying the JWT and setting your own.** Without that one line anyone can send `x-user-role: ADMIN` and satisfy every downstream role check.
- It holds no business logic and owns no data. If a change here needs a database, it belongs in a service.
- WebSocket fanout reads from Redis pub/sub so that multiple replicas broadcast the same queue event to every connected client.

## Layout

```
src/
  modules/           business domains, not technical layers
  consumers/         RabbitMQ inbound, idempotent on messageId
  publishers/        RabbitMQ outbound
  infrastructure/    redis, postgres wiring
  app.ts             builds the Fastify instance (testable)
  server.ts          binds the port (never imported by tests)
```

`app.ts` and `server.ts` are split so `supertest` can drive the application without binding a port.

## Build

This service has its own `Dockerfile`, producing the `hms-gateway` image. Build from the **repository root**, because the build needs the workspace manifests and the shared packages:

```bash
docker build -f apps/gateway/Dockerfile -t hms-gateway:$(git rev-parse --short HEAD) .
docker run -p 4000:4000 --env-file envs/.env.container hms-gateway:$SHA
```

The build prunes to this service's production dependency graph only, so the image carries nothing the other seven need.

It is also included in the all-in-one image (`docker/Dockerfile`), which boots this service with `SERVICE=gateway`. That image is used for Compose, disaster recovery and offline pilots. Both are built from the same commit and tagged with the same git SHA.

```bash
pnpm dev --filter @hms/gateway
```

See [`docs/architecture.md`](../../docs/architecture.md) and [`docs/traceability.md`](../../docs/traceability.md).
