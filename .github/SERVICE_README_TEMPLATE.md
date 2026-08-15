# SERVICE README TEMPLATE

Copy the block below into `apps/<service>/README.md` when the service is finished, and fill it in before marking the service DONE in [`RECORD.md`](RECORD.md).

Delete any section that genuinely does not apply, and say why in one line. Do not leave a heading with `TODO` under it: an empty section reads as an oversight, a deleted one reads as a decision.

The block is fenced with four tildes because it contains fenced code blocks of its own. Copy everything between the tilde lines, not the tilde lines themselves.

~~~~markdown
# apps/<service>

**Port <port>.** <One line: what it owns.>

Owns the `<schema>` Postgres schema and reads no other.

<One paragraph: the boundary. What this service deliberately does NOT own,
and which service owns that instead. This paragraph prevents the next
person from putting code in the wrong place.>

## Goals

Checklist ids from [`docs/role-checklist.md`](../../docs/role-checklist.md).

- [x] `XXX-0.00` <short label>
- [x] `XXX-0.00` <short label>
- [ ] `XXX-0.00` <short label>, deferred to P<n>, see RECORD.md

## API surface

Every route is reached through the gateway. This service is `ClusterIP` and is
not addressable from outside the cluster. The gateway strips client-supplied
identity headers and injects `x-user-id`, `x-hospital-id` and `x-roles` after
verifying the JWT; this service verifies the JWT again itself.

### Conventions

| Concern | Rule |
|---|---|
| Base path | `/v1` |
| Auth | `Authorization: Bearer <jwt>` on every route unless marked public |
| Tenancy | `hospitalId` comes from the token, never from the body or the query |
| Idempotency | Writes marked idempotent require `Idempotency-Key: <uuid>`, replay returns the original response with `200` |
| Pagination | `?limit=` (default 20, max 100) and `?cursor=`, response carries `nextCursor` |
| Content type | `application/json` in and out |
| Errors | `{ "error": { "code": "...", "message": "...", "details": [...] } }` |

**Status codes used by this service**

| Code | Meaning here |
|---|---|
| 400 | Body or query failed zod validation, `details` lists the failing paths |
| 401 | Missing, expired or unverifiable token |
| 403 | Authenticated, but the ownership check failed |
| 404 | Not found, or found in another hospital (never distinguish the two) |
| 409 | Conflict, for example <the real conflict this service has> |
| 422 | Valid shape, invalid domain state, for example <example> |
| 429 | Rate limited, `Retry-After` in seconds |

### Route index

| Method | Path | Role | Ownership check | Idempotent |
|---|---|---|---|---|
| GET | `/v1/<collection>` | `RECEPTIONIST` | Same hospital | n/a |
| POST | `/v1/<collection>` | `RECEPTIONIST` | Same hospital | Yes, key required |
| GET | `/v1/<collection>/:id` | `DOCTOR` | Active consultation or grant | n/a |

### `POST /v1/<collection>`

<One line: what it does and what it changes.>

**Path parameters**

| Name | Type | Required | Notes |
|---|---|---|---|
| `<name>` | `uuid` | yes | <what it identifies> |

**Query parameters**

| Name | Type | Required | Default | Notes |
|---|---|---|---|---|
| `<name>` | `string` | no | | <allowed values> |

**Headers**

| Name | Required | Notes |
|---|---|---|
| `Authorization` | yes | `Bearer <jwt>` |
| `Idempotency-Key` | yes | uuid v4, retained 24h |

**Request body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `<field>` | `string` | yes | <length, enum, format> |
| `<field>` | `integer` | no | <range> |

```json
{
  "field": "value",
  "other": 1
}
```

**Response `201`**

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | |
| `<field>` | `string` | |
| `createdAt` | `ISO 8601` | In the hospital's timezone, not the server's |

```json
{
  "id": "0d7f...",
  "field": "value",
  "createdAt": "2026-01-01T09:00:00+05:30"
}
```

**Errors specific to this route**

| Code | `error.code` | Cause |
|---|---|---|
| 409 | `<CODE>` | <the real conflict> |
| 422 | `<CODE>` | <the real invalid state> |

**Example**

```bash
curl -X POST http://localhost:4000/v1/<collection> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{"field":"value"}'
```

<Repeat this block per route. Routes that only read can drop the request body,
the idempotency header and the conflict rows.>

## Events

**Publishes**

| Event | When | Payload summary |
|---|---|---|
| `domain.entity.verbed` | <trigger> | <fields> |

```json
{
  "messageId": "uuid",
  "occurredAt": "2026-01-01T09:00:00+05:30",
  "hospitalId": "uuid",
  "data": { }
}
```

**Consumes**

| Event | Action taken | Idempotent on |
|---|---|---|
| `domain.entity.verbed` | <what it does> | `messageId` |

## Data owned

| Table | Scope | Notes |
|---|---|---|
| `<table>` | Hospital-scoped | `@@index([hospitalId])` |
| `<table>` | Global | Not a visit record |

<Any non-obvious constraint, and why it exists. A unique constraint that
prevents a real race deserves a sentence, because someone will otherwise
try to remove it.>

## Configuration

Only the keys **this** service reads. Full list in [`envs/.env.example`](../../envs/.env.example).

| Key | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | yes | | `?schema=<schema>` |
| `REDIS_URL` | yes | | |

## Dependencies

| Depends on | Kind | If it is down |
|---|---|---|
| PostgreSQL | Sync | Readiness fails, pod leaves the load balancer |
| Redis | Sync | <degrade or fail> |
| RabbitMQ | Async | <queue locally, or fail the write> |
| `<other service>` | Sync HTTP | <degrade to what> |

## How to run

```bash
# development, hot reload
pnpm dev --filter @hms/<service>

# tests
pnpm test --filter @hms/<service>
pnpm test:integration --filter @hms/<service>

# container, built from the REPOSITORY ROOT
docker build -f apps/<service>/Dockerfile -t hms-<service>:$(git rev-parse --short HEAD) .
docker run -p <port>:<port> --env-file envs/.env.container hms-<service>:$SHA
```

Requires `pnpm deps:up` first (Postgres, Redis, RabbitMQ, MinIO, Mailpit).

## Test status

![CI](https://github.com/<org>/atelier-health/actions/workflows/pr.yml/badge.svg)

| Level | Threshold | Runs in |
|---|---|---|
| Unit | 80% lines, 100% on authorization paths | Every PR |
| Integration | Real Postgres, Redis, RabbitMQ via Testcontainers | Every PR |
| Security negatives | Cases <n>, <n> in `tests/integration/security` | Every PR |

**Deliberately not covered**

- <what, and why. "Provider SDK retry behaviour: exercised in staging,
  not worth a fake in unit tests.">

## Failure modes

| Scenario | Behaviour | Verified by |
|---|---|---|
| Database unavailable | Readiness fails, no traffic routed, no data loss | <test> |
| RabbitMQ unavailable | <buffer / reject / degrade> | <test> |
| Downstream service unavailable | <degrade to what, never a 500> | <test> |
| Duplicate event delivery | No duplicate side effect | <test> |

## Known limitations

| Limitation | Impact | Upgrade path |
|---|---|---|
| <deliberate shortcut> | <what it costs today> | <what replaces it, and when> |

## Runbook

| Alert | First check | Action |
|---|---|---|
| `<alert name>` | <what to look at> | <what to do> |
~~~~

---

## NOTES ON FILLING THIS IN

**API surface.** The conventions table exists so the per-route blocks stay short. Auth, tenancy, pagination and the error envelope are identical on every route, so state them once and never repeat them. A route block only documents what is different about that route.

Document the request and the response as **tables of fields with types and constraints**, then one example of each. The table is what an integrator reads to build a client; the example is what they paste to check they got it right. An example alone is not documentation, because it does not say which fields are optional or what the bounds are.

The constraints column is not optional. `string` tells the caller nothing. `string, 1 to 64 chars` or `enum: SCHEDULED | CHECKED_IN | DONE` tells them what a 400 will be about before they trigger one.

**Errors.** List only the codes this route can actually return for domain reasons. The shared 400, 401, 403 and 429 are in the conventions table already. A route that has no domain-specific error says so and drops the table.

**Do not hand-maintain the route index if the service emits an OpenAPI document.** Generate it from the zod schemas and link the generated file. Hand-written API tables drift within two sprints, which is the same failure as pasting a test count.

**Goals.** Reference checklist ids, never restate the feature. `docs/features.md` already describes what the feature does, and two descriptions of one thing always diverge. An unchecked box in a service marked DONE is a lie: either check it, or move it out of scope and say where it went.

**Test status.** Never type a test count or a coverage percentage into prose. It is stale on the next merge, and a stale number is worse than none because people believe it. A badge updates itself; a threshold is a contract that does not decay. The **deliberately not covered** list is the most valuable part of this section, because a gap someone chose is information and a gap someone hid is a defect waiting to surface in production.

**Failure modes.** This is the section that gets read at 2am and the one most often skipped. Fill it in from the P6 failure tests rather than from imagination, and cite the test that proves each row. A row with no test behind it is a guess.

**Known limitations.** Every deliberate shortcut, with its ceiling and its upgrade path. Writing it down is what separates a decision from an accident, and it saves the next person the week it takes to rediscover why something is the way it is.

**Length.** If a section would be three words, it is fine at three words. The template is a checklist of questions to answer, not a word count to hit. A short honest README beats a long aspirational one.
