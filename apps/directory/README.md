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

There is no `Dockerfile` here. `docker/Dockerfile` builds every service and `SERVICE=directory` selects this entrypoint.

```bash
pnpm dev --filter @hms/directory
docker run -e SERVICE=directory -e PORT=5002 --env-file envs/.env.container hms-platform:$SHA
```

See [`docs/architecture.md`](../../docs/architecture.md) and [`docs/traceability.md`](../../docs/traceability.md).
