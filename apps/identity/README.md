# apps/identity

**Port 5001.** Users, credentials, roles, sessions, devices, OTP, JWT signing.

Owns the `identity` Postgres schema and reads no other.

## Goal

Answer one question authoritatively: who is this person, and what may they claim to be. Every other service trusts the token this service signs, which makes it the smallest and most heavily reviewed service in the system.

Its second job is the cross-service audit index. Eight schemas cannot be joined, so every service publishes `audit.recorded` and a read model here makes seven years of audit searchable in one place.

## What it must do

| Capability | Phase | Notes |
|---|---|---|
| Registration and login, staff and patient | P0 | Patients log in by phone and OTP, staff by password |
| argon2id password hashing | P0 | Any bcrypt hash from ported code is rehashed on next successful login |
| RS256 JWT signing, and a JWKS endpoint | P0 | The private key exists only here |
| Refresh tokens, rotation, and revocation | P0 | Rotation on every use, reuse detection revokes the family |
| Role and permission model | P0 | Eight roles, and a user may hold different roles at different hospitals |
| OTP issue and verify, with attempt limits | P0 | Rate limited hard, because it is the cheapest attack surface in the product |
| Device registration for push tokens | P1 | The device identity, not the notification. Delivery belongs to `comms` |
| Session listing and remote sign-out | P2 | A user can see and end their own sessions |
| Cross-service audit index | P2 | Read model built from `audit.recorded`, rebuildable from the stream |
| Break-glass grant issuing and expiry | P2 | With the reason recorded, and the patient notified |

## Conditions

- **Users are global.** One person, one login, across every hospital they visit. There is no `hospitalId` on `users`. Which hospitals a user has a role at is a separate, hospital-scoped relation.
- **The private signing key lives here and nowhere else.** Not in the gateway, not in a shared package, not in an image layer. Every other service verifies with the public key from the JWKS endpoint.
- **A role is not an access grant.** Holding `DOCTOR` does not imply access to a given patient. Access requires an active consultation or an explicit grant, and that decision is made by `clinical`, not here.
- **The token carries the roles held at the hospital in context**, not every role the user holds everywhere. A receptionist at hospital A must not arrive at hospital B carrying that authority.
- **The audit index is a convenience, never the legal record.** The per-service append-only table is the record. If the index and the table disagree, the table is right and the index gets rebuilt.
- **OTP is rate limited per phone, per IP, and per device**, with a lockout. An unthrottled OTP endpoint is an SMS bill and an account takeover in the same request.

## Allowed and not allowed

| Allowed | Not allowed |
|---|---|
| Store credentials, hashes, sessions, devices | Store any clinical fact, ever |
| Sign and verify tokens | Decide whether a doctor may open a patient record |
| Publish `user.registered` | Send the welcome message. That is `comms` |
| Maintain the audit read model | Delete or update an audit row, in any service |
| Hold phone numbers and emails as identifiers | Use them as a delivery channel directly |

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

## Build

```bash
docker build -f apps/identity/Dockerfile -t hms-identity:$(git rev-parse --short HEAD) .
docker run -p 5001:5001 --env-file envs/.env.container hms-identity:$SHA

pnpm dev --filter @hms/identity
```

Also included in the all-in-one image (`docker/Dockerfile`) with `SERVICE=identity`.

See [`docs/architecture.md`](../../docs/architecture.md) sections 5.2 and 7.
