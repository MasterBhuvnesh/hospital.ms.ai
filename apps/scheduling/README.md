# apps/scheduling

**Port 5003.** Appointments, waitlists, queue tokens, priority ordering, consultation state.

Owns the `scheduling` Postgres schema and reads no other.

## Critical rules

- **This is the critical path.** Three replicas minimum, autoscaled on RabbitMQ queue depth rather than CPU alone.
- Token generation must **never** be count-then-create. Use a Postgres sequence per `(hospital, doctor, tokenDate)` or a bounded insert-retry loop, behind `@@unique([hospitalId, doctorId, tokenDate, tokenNumber])`.
- `tokenDate` is the calendar date **in the hospital's timezone**, not UTC and not the server's.
- This service owns consultation **state** (`scheduled`, `started`, `paused`, `completed`, `no_show`) and nothing clinical.
- `consultation.completed` must carry `feeSnapshot`, so `commerce` bills the fee that applied on the day of the visit.

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

This service has its own `Dockerfile`, producing the `hms-scheduling` image. Build from the **repository root**, because the build needs the workspace manifests and the shared packages:

```bash
docker build -f apps/scheduling/Dockerfile -t hms-scheduling:$(git rev-parse --short HEAD) .
docker run -p 5003:5003 --env-file envs/.env.container hms-scheduling:$SHA
```

The build prunes to this service's production dependency graph only, so the image carries nothing the other seven need.

It is also included in the all-in-one image (`docker/Dockerfile`), which boots this service with `SERVICE=scheduling`. That image is used for Compose, disaster recovery and offline pilots. Both are built from the same commit and tagged with the same git SHA.

```bash
pnpm dev --filter @hms/scheduling
```

See [`docs/architecture.md`](../../docs/architecture.md) and [`docs/traceability.md`](../../docs/traceability.md).
