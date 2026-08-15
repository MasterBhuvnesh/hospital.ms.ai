# apps/clinical

**Port 5004.** Patient records, consultation content, SOAP, prescriptions, lab orders and results, patient sheets, documents, consent.

Owns the `clinical` Postgres schema and reads no other.

## Critical rules

- Owns consultation **content**, keyed by the `consultationId` that `scheduling` minted. It never changes consultation state.
- **Ownership checks, not role checks.** A `DOCTOR` role does not imply access to *this* patient: require an active consultation at this hospital or an explicit patient grant.
- Patient records are stored **globally** but are visible to a hospital only through a consultation or a grant. Global storage is not global visibility.
- Prescriptions become immutable on signature. A correction is a new superseding prescription, never an edit.
- Patient sheet generation is idempotent on `(consultationId, tokenVersion)`, because skip and recall can fire `queue.patient.near_turn` more than once.
- Lab results are visible to the patient only once **released**, never at entry.

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

There is no `Dockerfile` here. `docker/Dockerfile` builds every service and `SERVICE=clinical` selects this entrypoint.

```bash
pnpm dev --filter @hms/clinical
docker run -e SERVICE=clinical -e PORT=5004 --env-file envs/.env.container hms-platform:$SHA
```

See [`docs/architecture.md`](../../docs/architecture.md) and [`docs/traceability.md`](../../docs/traceability.md).
