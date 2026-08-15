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

There is no `Dockerfile` here. `docker/Dockerfile` builds every service and `SERVICE=gateway` selects this entrypoint.

```bash
pnpm dev --filter @hms/gateway
docker run -e SERVICE=gateway -e PORT=4000 --env-file envs/.env.container hms-platform:$SHA
```

See [`docs/architecture.md`](../../docs/architecture.md) and [`docs/traceability.md`](../../docs/traceability.md).
