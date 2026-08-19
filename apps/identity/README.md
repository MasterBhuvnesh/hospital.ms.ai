# apps/identity

**Port 5001.** Users, credentials, roles, sessions, devices, OTP, JWT signing.

Owns the `identity` Postgres schema and reads no other.

## Goal

Answer one question authoritatively: who is this person, and what may they claim to be. Every other service trusts the token this service signs, which makes it the smallest and most heavily reviewed service in the system.

Its second job is the cross-service audit index. Eight schemas cannot be joined, so every service publishes `audit.recorded` and a read model here makes seven years of audit searchable in one place.

## What it must do

| Capability | Phase | Status | Notes |
|---|---|---|---|
| Registration and login, staff and patient | P0 | Done | Patients log in by phone and OTP, staff by password |
| argon2id password hashing | P0 | Done | Any bcrypt hash from ported code is rehashed on next successful login |
| RS256 JWT signing | P0 | Done | The private key exists only here |
| JWKS endpoint | P0 | Not yet | Other services carry `JWT_PUBLIC_KEY` directly until this exists |
| Refresh tokens, rotation, and revocation | P0 | Done | Rotation on every use, reuse detection revokes the family |
| OTP issue and verify, with attempt limits | P0 | Done | Rate limited hard, because it is the cheapest attack surface in the product |
| Role and permission model | P0 | Partial | The schema and the token claim exist; there is no endpoint to grant a role yet |
| Device registration for push tokens | P1 | Not yet | The device identity, not the notification. Delivery belongs to `comms` |
| Session listing and remote sign-out | P2 | Not yet | A user can see and end their own sessions |
| Cross-service audit index | P2 | Not yet | Read model built from `audit.recorded`, rebuildable from the stream |
| Break-glass grant issuing and expiry | P2 | Not yet | With the reason recorded, and the patient notified |

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

## API

Base URL is `http://localhost:5001` directly, or `http://localhost:4000` through the gateway. The contract is identical either way — the gateway adds rate limiting and `x-user-*` headers, it does not change any route.

A ready-to-run Postman collection lives in [`postman/identity.postman_collection.json`](postman/identity.postman_collection.json). It captures tokens automatically between requests, and its `Security expectations` folder holds the requests that are supposed to fail, each asserting how.

| Method | Path | Auth | Success | Purpose |
|---|---|---|---|---|
| `GET` | `/health/live` | — | `200` | Is the process running |
| `GET` | `/health/ready` | — | `200` / `503` | Can it serve traffic |
| `POST` | `/auth/register` | — | `201` | Create an account, return tokens |
| `POST` | `/auth/login` | — | `200` | Password login |
| `POST` | `/auth/otp/request` | — | `202` | Issue an OTP to a phone or email |
| `POST` | `/auth/otp/verify` | — | `200` | Redeem an OTP for tokens |
| `POST` | `/auth/refresh` | — | `200` | Rotate the refresh token |
| `POST` | `/auth/logout` | — | `204` | Revoke the token family |
| `GET` | `/auth/me` | Bearer | `200` | The caller's profile and roles |

### The token pair

`register`, `login`, `otp/verify` and `refresh` all return the same body:

```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "8Jd2...opaque-base64url...",
  "expiresIn": 900,
  "tokenType": "Bearer"
}
```

The access token is an RS256 JWT carrying `sub`, `hospitalId`, `roles` and `sid`. `hospitalId` is `null` and `roles` is `[]` for a user who belongs to no hospital yet — which every patient is between registering and their first appointment. That is a valid token, not an error state.

`roles` holds the role at the user's **primary** hospital only. A receptionist at hospital A must not arrive at hospital B carrying that authority.

The refresh token is opaque random bytes, not a JWT. It is stored as a SHA-256 digest and is never a bearer credential.

### Errors

Every failure uses the shared envelope from `@hms/contracts`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request body is invalid",
    "details": [{ "path": ["password"], "message": "Too small: expected string to have >=12 characters" }]
  }
}
```

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | The body failed its zod schema. `details` names each path |
| `UNAUTHENTICATED` | 401 | Bad credentials, bad OTP, bad or replayed refresh token, bad bearer token |
| `CONFLICT` | 409 | The email or phone is already registered |
| `RATE_LIMITED` | 429 | A live OTP already exists, the attempt budget is spent, or the per-IP limit was hit |

### What these endpoints deliberately will not tell you

These are properties, not implementation details. Changing any of them is a security regression, and each has a test that fails if it changes.

- **An unknown account and a wrong password return the identical 401**, same code and same message. The service also verifies against a decoy argon2 hash when no user is found, so the two take the same time; a timing gap is an enumeration oracle even when the bodies match.
- **`POST /auth/otp/request` always returns `202` with an empty body**, whether or not the destination belongs to an account. It is unauthenticated, so a `404` for an unknown number would be a free enumeration endpoint.
- **A rejected bearer token always says `Invalid token`** — never expired versus bad signature versus wrong audience. The difference tells an attacker whether they hold something real.
- **`/health/ready` never names the dependency that failed.** That belongs in the log.
- **Replaying a rotated refresh token revokes the entire family**, including the token the previous refresh just issued. Rotation alone does not detect theft: the thief refreshes first and the victim looks like the anomaly. Killing the family means whoever refreshes second logs the other out, so a stolen session cannot outlive the real user's next request. Both parties re-authenticate, which is correct when one of them is an attacker.

### OTP delivery

`SMS_DRIVER` and `EMAIL_DRIVER` default to `console`. Nothing is sent anywhere: RULES.md forbids a real message from a development or test environment, and SMS additionally needs DLT template registration with weeks of lead time.

The code is written to the service's stdout, deliberately **not** through `@hms/logger`. That logger redacts `otp` and `code`, as it should, since those lines ship to Loki and are retained. Inventing a field name that slips past the redaction list would be the wrong fix, so the structured log records only that a code was issued and the human-readable copy never becomes a log record at all.

Read it with:

```bash
docker compose -f docker/compose/single-host.yml logs -f platform
# OTP for this phone: 123456
```

Selecting a console driver with `APP_ENV=production` is a **startup failure**, not a warning. Without that check, a production deploy on default configuration accepts registrations and silently never delivers a code, which looks like a working system until the first patient tries to log in.

## Configuration

Beyond the platform-wide keys in `envs/.env.example`, this service reads:

| Key | Default | Notes |
|---|---|---|
| `DATABASE_URL` | — | Required. `?schema=identity` is appended by `@hms/db` |
| `JWT_PRIVATE_KEY` | — | Required, and **required here only**. Its presence in any other service's environment is a misconfiguration |
| `ACCESS_TOKEN_TTL` | `15m` | Short because an access token cannot be revoked without a per-request lookup in all eight services |
| `REFRESH_TOKEN_TTL` | `30d` | Revocable, so it can be long |
| `OTP_TTL` | `5m` | |
| `OTP_LENGTH` | `6` | |
| `OTP_MAX_ATTEMPTS` | `5` | Once spent, even the correct code is refused |
| `RATE_LIMIT_AUTH` | `10` | Per window per IP, applied to every route in this service |
| `RATE_LIMIT_WINDOW` | `1m` | |

The rate limit is applied here and not only at the gateway because identity is reachable directly on the Compose network and inside the single-host process. The gateway is not the only way in, so it cannot be the only limit.

Generate the keypair with `bash scripts/dev/generate-jwt-keys.sh envs/.env.development`. It writes both halves into the env file without the values passing through stdout or shell history.

## Design notes

**`AuthService` talks to one `AuthStore` interface**, not to Prisma. Every rule worth testing — enumeration resistance, OTP attempt counting, refresh-family revocation — is logic in the service rather than in Postgres, so the unit tests run the real service and real cryptography against an in-memory store and need no database. `PrismaAuthStore` is the production implementation, covered separately by integration tests.

**One interface, not a repository per table.** The service is its only consumer and the second implementation is the test fake. Six ports with one production implementation each would be abstraction for its own sake.

**No `ScopedRepository` here.** The identity tables are global by design — a person is one person across hospitals (architecture 5.2) — so there is no `hospitalId` to scope by. `ScopedRepository` appears in the services that own hospital-scoped tables.

**`buildApp()` is synchronous** because `docker/all-in-one.mjs` calls it for up to eight services in a row. `PrismaAuthStore` opens its connection lazily on first use, so nothing connects at construction time.

## Tests

```bash
pnpm --filter @hms/identity test        # 56 tests, no database required
pnpm --filter @hms/auth test            # 18 tests over JWT and argon2
```

`packages/auth` carries the negative JWT cases: forged payload, `alg: none`, wrong key, wrong issuer, wrong audience, expired, and a well-signed token whose claims fail the schema. Each one is a token that must not be accepted.


## Build

```bash
docker build -f apps/identity/Dockerfile -t hms-identity:$(git rev-parse --short HEAD) .
docker run -p 5001:5001 --env-file envs/.env.container hms-identity:$SHA

pnpm dev --filter @hms/identity
```

Also included in the all-in-one image (`docker/Dockerfile`) with `SERVICE=identity`.

See [`docs/architecture.md`](../../docs/architecture.md) sections 5.2 and 7.
