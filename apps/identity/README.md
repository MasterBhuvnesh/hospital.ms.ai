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

There is no `Dockerfile` here. `docker/Dockerfile` builds every service and `SERVICE=identity` selects this entrypoint.

```bash
pnpm dev --filter @hms/identity
docker run -e SERVICE=identity -e PORT=5001 --env-file envs/.env.container hms-platform:$SHA
```

See [`docs/architecture.md`](../../docs/architecture.md) and [`docs/traceability.md`](../../docs/traceability.md).
