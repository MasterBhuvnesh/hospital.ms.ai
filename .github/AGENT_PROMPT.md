# AGENT PROMPT — the shared contract

Every `PROMPT.md` in this repository points here. This file holds what is true
for all of them; the `PROMPT.md` holds what is true for one.

Read this file, then the `PROMPT.md` for your target, then
[`.github/RULES.md`](./RULES.md). Do not start writing code before all three.

## Find your file

| Target | Prompt |
|---|---|
| `gateway` | [`apps/gateway/PROMPT.md`](../apps/gateway/PROMPT.md) |
| `identity` | [`apps/identity/PROMPT.md`](../apps/identity/PROMPT.md) |
| `directory` | [`apps/directory/PROMPT.md`](../apps/directory/PROMPT.md) |
| `scheduling` | [`apps/scheduling/PROMPT.md`](../apps/scheduling/PROMPT.md) |
| `clinical` | [`apps/clinical/PROMPT.md`](../apps/clinical/PROMPT.md) |
| `commerce` | [`apps/commerce/PROMPT.md`](../apps/commerce/PROMPT.md) |
| `comms` | [`apps/comms/PROMPT.md`](../apps/comms/PROMPT.md) |
| `ai` | [`apps/ai/PROMPT.md`](../apps/ai/PROMPT.md) |
| `@hms/contracts` | [`packages/contracts/PROMPT.md`](../packages/contracts/PROMPT.md) |
| `@hms/config` | [`packages/config/PROMPT.md`](../packages/config/PROMPT.md) |
| `@hms/logger` | [`packages/logger/PROMPT.md`](../packages/logger/PROMPT.md) |
| `@hms/db` | [`packages/db/PROMPT.md`](../packages/db/PROMPT.md) |
| `@hms/auth` | [`packages/auth/PROMPT.md`](../packages/auth/PROMPT.md) |
| `@hms/middleware` | [`packages/middleware/PROMPT.md`](../packages/middleware/PROMPT.md) |
| `@hms/events` | [`packages/events/PROMPT.md`](../packages/events/PROMPT.md) |

**Suggested order.** `@hms/events` first — it blocks the most. Then `identity`
finished (it needs a migration before anything can authorise), then `directory`
(it is the tenancy root every other service references), then `gateway`,
`scheduling`, `clinical`, `commerce`, `comms`, and `ai` last.

---

## 1. What this project is

**Atelier Health** — a multi-hospital management system. Eight backend services
in one monorepo, one Postgres cluster with one schema per service, RabbitMQ
between them, and three client applications that are not your concern.

The system exists to make one flow fast and correct:

> a patient walks in → gets a queue token → the queue moves → the doctor is
> handed a prepared patient sheet → the consultation is recorded → a
> prescription is signed → an invoice is paid → medicine is dispensed.

That is the loop. Everything else supports it.

**This is healthcare software.** A bug here is not a bad user experience, it is
the wrong patient's allergy list on a doctor's screen. Behave accordingly.

---

## 2. The rules that get code rejected

[`.github/RULES.md`](./RULES.md) is the full list and it is binding. These are
the ones that come up constantly, restated so you cannot miss them.

### Data and privacy

- **No PHI in logs. Ever.** Use `@hms/logger`, which applies pino redaction
  paths. `console.log` is an ESLint error, not a style preference.
- Do not invent a log field name that dodges the redaction list. If you find
  yourself naming a field `otp_code` because `code` is redacted, stop — you are
  building the leak, not avoiding it.
- **Never print a secret value** into a terminal, a log, or a transcript. When
  inspecting an env file, print key names and value lengths.
- **Never commit credentials, API keys, tokens, or `.env` files.** Before
  committing anything that touches configuration, read the staged diff for the
  values themselves, not just the filenames.
- If a secret is exposed anyway, say so immediately and plainly, and say it must
  be rotated. Do not bury it.

### Tenancy

- **`hospitalId` scoping is applied in the repository layer**, never in a route
  handler. Use `ScopedRepository` from `@hms/db`.
- Users and patients are **global**. Everything about a visit is
  **hospital-scoped**. If your table has a `hospitalId`, every query needs it.
- A `doctor` role does not imply access to a given patient. Access requires an
  active consultation or an explicit grant.

### Service boundaries

- **No cross-service database reads.** A service owns its schema. Cross-domain
  reads go through the owning service's API or an event.
- **Every RabbitMQ consumer is idempotent on `messageId`.** Redelivery is normal
  operation, not an error.
- **Every critical write takes an idempotency key**: booking, token generation,
  payment, refund, dispensing.
- Dates and times on anything hospital-scoped derive from the **hospital's**
  configured timezone, never the server's.

### Development environment

- **Never send a real email, SMS, push notification, or WhatsApp message from a
  development or test environment.** The console driver exists for this reason.
- **Never use `git stash`.** Commit instead.
- Do not commit to `main`. Branch first. Every branch ends in a pull request,
  and **BHUVNESH reviews all of them**.
- Ask before destructive git actions (`reset --hard`, `push --force`, history
  rewrites).

---

## 3. The stack, which is not up for discussion

| Layer | Choice |
|---|---|
| Language | TypeScript, ESM (`"type": "module"`) |
| Runtime | Node.js 22 LTS |
| HTTP | Fastify 5 |
| Validation | zod 4 |
| ORM | Prisma 7, one Postgres schema per service |
| Cache | ioredis |
| Broker | RabbitMQ with the delayed-message exchange |
| Crypto | `jose` for RS256, `argon2` for passwords |
| Tests | Vitest, `app.inject()` for HTTP, Testcontainers for integration |

Do not add a dependency that duplicates one of these. Do not add BullMQ,
node-cron, Express, class-validator, or an ORM that is not Prisma. If you think
you need a new dependency, say why in the pull request and let BHUVNESH decide.

### The six shared packages

Every service imports all six:

```
@hms/contracts   error envelope, roles, pagination — the wire format
@hms/config      zod env schema, validated at boot, fails fast
@hms/logger      pino with PHI redaction        (this is why console.log is banned)
@hms/db          Prisma client cache, ScopedRepository
@hms/auth        RS256 verify, argon2id
@hms/middleware  /health/live and /health/ready
```

---

## 4. The shape every service repeats

`apps/identity` is the reference implementation. When something here is
ambiguous, open that service and copy what it does.

```
apps/<service>/
  src/
    server.ts                 ~9 lines: buildApp() then listen
    app.ts                    SYNCHRONOUS. plugins, config, routes
    config.ts                 the env keys THIS service reads
    modules/<domain>/
      schemas.ts              zod request and response shapes
      service.ts              domain logic. takes its store as an interface
      store.ts                that interface
      memory-store.ts         in-memory implementation, so tests need no database
      routes.ts               HTTP only: parse, call the service, map errors
    infrastructure/
      prisma-store.ts         the real store
    publishers/               events this service emits
    consumers/                events this service handles
  prisma/schema.prisma
  postman/<service>.postman_collection.json
  Dockerfile
  README.md
  PROMPT.md
```

### Three structural rules

**`buildApp()` must stay synchronous.** `docker/all-in-one.mjs` calls it for up
to eight services in one process. Prisma connects lazily, so nothing needs
`await` at construction. An `async buildApp()` breaks the all-in-one image.

**The store is an interface with two implementations.** One in memory, one on
Prisma. This is what lets the domain tests run real logic with no database, and
it is not optional. `apps/identity/src/modules/auth/store.ts` is the model.

**Routes do no domain work.** A route parses the request, calls one service
method, and maps the error to a status code. If there is a business rule in a
route handler, it is in the wrong file and it is untestable without HTTP.

---

## 5. Definition of done

A service or package is **not** complete until every line below is true. Do not
report it as finished otherwise. If one item is blocked, finish the rest and say
plainly which one you left and why.

### Code

- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes with no warnings suppressed by an inline disable
- [ ] `pnpm typecheck` and `pnpm typecheck:tests` both pass
- [ ] `pnpm format:check` passes — run `pnpm format` before you finish
- [ ] `pnpm test` passes, and the new tests actually exercise the new code

### Tests

Unit tests against the in-memory store, HTTP tests through `app.inject()`.

Test the failures, not just the happy path. For anything touching auth, access
control, or money, the negative test is the one that matters:

- wrong hospital cannot read another hospital's row
- expired, forged, and wrong-audience tokens are all rejected
- a replayed request with the same idempotency key does not double-charge
- an unknown record and an unauthorised record return the **same** response

### Postman collection

`apps/<service>/postman/<service>.postman_collection.json`, schema v2.1.0.

- One folder per domain area, plus a **"Security expectations"** folder
- Requests use `{{baseUrl}}` and `{{accessToken}}` variables, never a hardcoded
  host or a pasted token
- Login and refresh requests capture their tokens into collection variables in a
  test script, so the collection is runnable top to bottom without editing
- The Security folder asserts the **failures**: the 401s that must be identical,
  the 403 a wrong-hospital token gets, the 400 envelope shape
- **No real credentials, no real patient data, no real phone number or email.**
  Use `example.com` and obviously fake values.
- Prettier-formatted like every other file in the repository

### Dockerfile

Every service already has one at `apps/<service>/Dockerfile`. It has **never
been verified to build**. Yours must actually work:

```bash
# Build from the REPOSITORY ROOT, never from the service directory.
docker build -f apps/<service>/Dockerfile -t hms-<service>:dev .

# Run it against the local dependency stack.
docker compose -f docker/compose/deps.yml up -d
docker run --rm --network hms_default -p <port>:<port> \
  --env-file envs/.env.container hms-<service>:dev

# Prove it is alive.
curl -fsS http://localhost:<port>/health/live
curl -fsS http://localhost:<port>/health/ready
```

Requirements:

- Multi-stage, `node:22-alpine`, non-root user, `HEALTHCHECK` present
- The build prunes to this service's dependency graph
  (`pnpm --filter "@hms/<service>..." build`), so it does not ship the other
  seven services' dependencies
- The image starts, answers both health endpoints, and serves at least one real
  request
- If the existing Dockerfile is broken, **fix it**. Say what was wrong.

### Documentation

- [ ] `README.md` follows [`SERVICE_README_TEMPLATE.md`](./SERVICE_README_TEMPLATE.md),
      with an endpoint table, the error codes, the configuration keys, and a
      **Status** column that is honest about what is not built
- [ ] Every row you changed in [`RECORD.md`](./RECORD.md) is updated in the same
      commit, with the real status and today's date
- [ ] The README does not claim behaviour that is not implemented

---

## 6. How to work

**Read before you write.** The docs are accurate and they are the specification:

| Document | What it settles |
|---|---|
| [`docs/architecture.md`](../docs/architecture.md) | Service boundaries, the event catalogue, tenancy, the consultation split |
| [`docs/features.md`](../docs/features.md) | What each role can do, by phase |
| [`docs/tech-stack.md`](../docs/tech-stack.md) | Every technology choice and what was rejected |
| [`docs/traceability.md`](../docs/traceability.md) | Phase and task ids |
| [`.github/RULES.md`](./RULES.md) | The binding rules |

**Work in vertical slices.** One endpoint, complete — schema, service, store,
routes, tests, Postman entry — before starting the next. Eight half-built
endpoints is worse than two finished ones, because nothing can be reviewed.

**Do not scaffold for later.** No interface with one implementation, no config
key nothing reads, no abstraction for a second case that does not exist yet. We
deleted seven placeholder packages for exactly this reason.

**When you are unsure about a domain rule, ask.** Do not guess at clinical
behaviour, billing behaviour, or an access control rule. Guessing produces code
that looks finished and is wrong, which is the most expensive kind.

**Report honestly.** If tests fail, say so and paste the output. If you skipped
a step, say which. Never describe something as working when you have not run it.

---

## 7. What "do not do" means here

- Do not touch `infra/`, `docker/`, `envs/`, `scripts/`, `.github/`, or the root
  configuration. Those are BHUVNESH's, enforced by
  [`CODEOWNERS`](./CODEOWNERS).
- Do not edit another service's directory. If you need something from it, you
  need an API call or an event.
- Do not modify a shared package to make your service compile. Raise it instead
  — a change in `packages/` affects seven other services.
- Do not add a migration for another service's schema.
- Do not weaken a test to make it pass.
