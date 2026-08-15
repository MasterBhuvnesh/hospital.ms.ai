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

There is no `Dockerfile` here. `docker/Dockerfile` builds every service and `SERVICE=ai` selects this entrypoint.

```bash
pnpm dev --filter @hms/ai
docker run -e SERVICE=ai -e PORT=5007 --env-file envs/.env.container hms-platform:$SHA
```

See [`docs/architecture.md`](../../docs/architecture.md) and [`docs/traceability.md`](../../docs/traceability.md).
