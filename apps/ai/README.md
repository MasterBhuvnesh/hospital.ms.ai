# apps/ai

**Port 5007.** Agents, per-user memory, typed tool execution, evaluation harness.

Owns the `ai` Postgres schema and reads no other.

## Critical rules

- **Clinical facts are never generated.** They are retrieved from the owning service at request time through typed tools that enforce the caller's authorization in code, not in the prompt.
- **No clinical write without a human signature** recorded in the audit log.
- `WHERE user_id = $1` is applied in the repository layer. A memory query not scoped by `user_id` is a PHI breach, so the scoping lives where no prompt can reach it.
- Memory holds preferences and context, never lab values or diagnoses. A stale embedding of a lab result is a patient-safety issue.
- A provider outage degrades to the deterministic path. It never blocks a consultation.
- The model endpoint is any OpenAI-compatible URL, so a data-residency customer can point it at a model inside their own network.

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

This service has its own `Dockerfile`, producing the `hms-ai` image. Build from the **repository root**, because the build needs the workspace manifests and the shared packages:

```bash
docker build -f apps/ai/Dockerfile -t hms-ai:$(git rev-parse --short HEAD) .
docker run -p 5007:5007 --env-file envs/.env.container hms-ai:$SHA
```

The build prunes to this service's production dependency graph only, so the image carries nothing the other seven need.

It is also included in the all-in-one image (`docker/Dockerfile`), which boots this service with `SERVICE=ai`. That image is used for Compose, disaster recovery and offline pilots. Both are built from the same commit and tagged with the same git SHA.

```bash
pnpm dev --filter @hms/ai
```

See [`docs/architecture.md`](../../docs/architecture.md) and [`docs/traceability.md`](../../docs/traceability.md).
