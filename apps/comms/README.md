# apps/comms

**Port 5006.** In-app, push, SMS, email and WhatsApp delivery, templates, preferences, delivery state.

Owns the `comms` Postgres schema and reads no other.

## Critical rules

- One `notify(userId, event)` entry point. Preference resolution, template rendering, provider selection, retry and DLQ all live here. **No other service knows a channel exists.**
- Five channels: in-app, push, SMS, email, WhatsApp. SMS carries OTP and is the fallback when no push token is registered. Email carries the PDF attachments the other channels cannot.
- Until per-category preferences ship in P5, the default channel matrix in `docs/tech-stack.md` section 5.5 applies.
- Every consumer is idempotent on `messageId`. A redelivery must not send a second WhatsApp message or a second SMS.

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

This service has its own `Dockerfile`, producing the `hms-comms` image. Build from the **repository root**, because the build needs the workspace manifests and the shared packages:

```bash
docker build -f apps/comms/Dockerfile -t hms-comms:$(git rev-parse --short HEAD) .
docker run -p 5006:5006 --env-file envs/.env.container hms-comms:$SHA
```

The build prunes to this service's production dependency graph only, so the image carries nothing the other seven need.

It is also included in the all-in-one image (`docker/Dockerfile`), which boots this service with `SERVICE=comms`. That image is used for Compose, disaster recovery and offline pilots. Both are built from the same commit and tagged with the same git SHA.

```bash
pnpm dev --filter @hms/comms
```

See [`docs/architecture.md`](../../docs/architecture.md) and [`docs/traceability.md`](../../docs/traceability.md).
