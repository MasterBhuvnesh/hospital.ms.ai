# PROMPT — `@hms/identity`

**Read [`.github/AGENT_PROMPT.md`](../../.github/AGENT_PROMPT.md) first.** It holds
the rules, the stack, the file shape, and the definition of done. This file holds
only what is specific to `identity`.

**Read [`.github/RULES.md`](../../.github/RULES.md) too.** It is binding.

---

## What this service owns

Users, credentials, roles, sessions, devices, OTP, contact verification, and JWT
signing. **It is the only service that holds the private key.** Every other
service verifies with the public half.

Identity tables are **global**, not hospital-scoped. A user exists once across the
platform and may hold different roles at different hospitals through
`UserHospitalRole`. This is why `ScopedRepository` does not appear here, and it is
the only service where that is correct.

## State: partly built

Working and tested, 56 tests: `POST /auth/register`, `/auth/login`,
`/auth/otp/request`, `/auth/otp/verify`, `/auth/refresh`, `/auth/logout`, and
`GET /auth/me`.

argon2id passwords, RS256 access tokens with the algorithm pinned on verify,
refresh rotation with family revocation on reuse, hashed single-use OTPs, and
enumeration-resistant failures.

## What to build, in order

1. **A migration.** `prisma/migrations/` does not exist. The schema has never been
   applied and `PrismaAuthStore` has never run a single query against Postgres.
   Everything below depends on this. Run
   `pnpm --filter @hms/db db:migrate:dev --name init` against the local
   container, then write Testcontainers integration tests that exercise the
   Prisma store for real.
2. **Role granting.** `UserHospitalRole` has a table and a token claim and no
   write path, so every token issued today carries `hospitalId: null` and an empty
   `roles` array. Nothing downstream can authorise anything until this exists. It
   needs an admin-only endpoint and an audit entry per grant.
3. **A JWKS endpoint.** `GET /.well-known/jwks.json`, so the other seven services
   stop carrying `JWT_PUBLIC_KEY` in their environment. Put a `kid` in the token
   header so rotation is possible later.
4. **Publish `user.registered`.** `src/publishers/` is empty. `comms` consumes it
   for the welcome message.
5. **Password reset.** `RESET_PASSWORD` is already in the `OtpPurpose` enum with
   no endpoint that consumes it. Build the flow or remove the value.
6. **Device registration** (P1): the device identity for push tokens, not the
   notification. Delivery belongs to `comms`.

## Negative tests that must exist

- An unknown account and a wrong password return byte-identical responses, and the
  unknown case still spends a verify against a decoy hash so the timing matches.
- OTP request answers 202 for a destination that does not exist.
- A replayed refresh token revokes the entire family.
- `alg: none`, a token signed by another key, an expired token, and a wrong
  audience are all rejected with the same opaque `Invalid token`.
- A refresh token presented as a bearer token is rejected.

## Known problems to fix

- `AuditLog.actorId` has `onDelete: SetNull`. The audit log is append-only and
  retained seven years — a foreign key must not mutate it.
- `OTP_RESEND_COOLDOWN` and `OTP_LOCKOUT` are configured and unused. Implement
  them or delete them.
- The README claims bcrypt hashes are rehashed on next successful login. Nothing
  does that. Implement it or correct the README.

---

## Definition of done

The full checklist is in [`.github/AGENT_PROMPT.md`](../../.github/AGENT_PROMPT.md)
section 5. The short form:

1. `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm typecheck:tests`,
   `pnpm format:check` and `pnpm test` all pass.
2. Unit tests against the in-memory store, HTTP tests through `app.inject()`, and
   every negative test listed above.
3. `postman/identity.postman_collection.json` exists, is runnable top to bottom
   without editing, and has a "Security expectations" folder asserting the
   failures. No real credentials, no real patient data.
4. `docker build -f apps/identity/Dockerfile -t hms-identity:dev .` **actually builds**,
   the container starts, and `/health/live` and `/health/ready` both answer on
   port 5001:

   ```bash
   docker build -f apps/identity/Dockerfile -t hms-identity:dev .
   docker compose -f docker/compose/deps.yml up -d
   docker run --rm --network hms_default -p 5001:5001 \
     --env-file envs/.env.container hms-identity:dev
   curl -fsS http://localhost:5001/health/live
   ```

   The Dockerfile in this directory has **never been verified to build**. If it is
   broken, fix it and say what was wrong.
5. `README.md` follows [`SERVICE_README_TEMPLATE.md`](../../.github/SERVICE_README_TEMPLATE.md),
   with an honest Status column that does not claim unbuilt behaviour.
6. The matching rows in [`RECORD.md`](../../.github/RECORD.md) are updated in the
   same commit.

## What you may change

Your own directory, obviously. Beyond it, **change whatever you genuinely need to
make this service build, run, and be tested** — including these, which used to be
off limits:

| Path | What you may do |
|---|---|
| `apps/<yours>/Dockerfile` | Fix it, rewrite it, whatever makes it build |
| `docker/compose/*.yml` | Add or correct **your** service's entry and its dependencies |
| `docker/all-in-one.mjs` | Register your service so the combined image boots it |
| `envs/.env.example`, `envs/CATALOGUE.md` | Add the **key names** your service reads, with placeholder values |
| `scripts/dev/*` | Add a helper you need, if one does not already exist |

Anything you change outside your own directory must be **named in the pull
request description**, with a sentence on why. BHUVNESH reviews every pull
request and needs to see the shared-file edits without hunting for them.

If a shared file fights you, say so in the pull request rather than working
around it. A workaround inside your service becomes seven workarounds once the
other services hit the same wall.

## Do not

- **Write a real secret value anywhere.** Not in `.env.example`, not in a compose
  file, not in a Postman collection, not in a test fixture. Placeholders and
  obviously fake values only. This one has no exceptions.
- **Edit `.github/workflows/`, `CODEOWNERS`, `RULES.md`, or `AGENT_PROMPT.md`.**
  Those decide what gets merged and what the rules are. Changing them to make
  your branch pass defeats the point of having them. Propose the change instead.
- **Edit `infra/helm/`, `infra/terraform/`, or `infra/kubernetes/`.** Those are
  the deployment profiles, they are BHUVNESH's, and they are not built yet.
- Touch another service's directory, schema, or migrations.
- Read another service's tables. Use its API or an event.
- Modify a shared package to make this service compile — raise it instead.
- Weaken or delete a test to make a build pass.
- Claim it works without running it.
