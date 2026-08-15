# apps/directory

**Port 5002.** Hospitals, departments, rooms, doctors, specializations, schedules, attendance, leave, fees, search.

Owns the `directory` Postgres schema and reads no other.

## Critical rules

- **Availability is computed, never configured:** scheduled hours, minus approved leave, intersected with actual attendance. A doctor who has not checked in is not available, whatever the calendar says.
- Every hospital carries a required IANA `timezone`. It defines the token day boundary and every reporting cut in the platform.
- Consultation fees are **versioned**, so a fee snapshot taken at consultation time stays resolvable after the fee changes.

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

This service has its own `Dockerfile`, producing the `hms-directory` image. Build from the **repository root**, because the build needs the workspace manifests and the shared packages:

```bash
docker build -f apps/directory/Dockerfile -t hms-directory:$(git rev-parse --short HEAD) .
docker run -p 5002:5002 --env-file envs/.env.container hms-directory:$SHA
```

The build prunes to this service's production dependency graph only, so the image carries nothing the other seven need.

It is also included in the all-in-one image (`docker/Dockerfile`), which boots this service with `SERVICE=directory`. That image is used for Compose, disaster recovery and offline pilots. Both are built from the same commit and tagged with the same git SHA.

```bash
pnpm dev --filter @hms/directory
```

See [`docs/architecture.md`](../../docs/architecture.md) and [`docs/traceability.md`](../../docs/traceability.md).
