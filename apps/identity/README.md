# apps/identity

**Port 5001.** Users, credentials, roles, sessions, devices, OTP, RS256 token signing.

Owns the `identity` Postgres schema and reads no other.

## Critical rules

- **The JWT private key exists here and nowhere else.** Every other service verifies with the public key.
- Refresh tokens rotate, and reuse detection revokes the whole family. The refresh-token family in Postgres is the session; Redis only caches the revocation set and is rebuildable.
- Passwords are argon2id. Any bcrypt hash carried over from earlier code is rehashed on the next successful login.
- OTP is delivered by SMS through `SmsProvider`. Push cannot deliver a first-time OTP because there is no app session yet.
- Users are **global**. Nothing here is hospital-scoped.

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

This service has its own `Dockerfile`, producing the `hms-identity` image. Build from the **repository root**, because the build needs the workspace manifests and the shared packages:

```bash
docker build -f apps/identity/Dockerfile -t hms-identity:$(git rev-parse --short HEAD) .
docker run -p 5001:5001 --env-file envs/.env.container hms-identity:$SHA
```

The build prunes to this service's production dependency graph only, so the image carries nothing the other seven need.

It is also included in the all-in-one image (`docker/Dockerfile`), which boots this service with `SERVICE=identity`. That image is used for Compose, disaster recovery and offline pilots. Both are built from the same commit and tagged with the same git SHA.

```bash
pnpm dev --filter @hms/identity
```

See [`docs/architecture.md`](../../docs/architecture.md) and [`docs/traceability.md`](../../docs/traceability.md).
