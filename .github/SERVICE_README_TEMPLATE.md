# SERVICE README TEMPLATE

Copy the block below into `apps/<service>/README.md` when the service is finished, and fill it in before marking the service DONE in [`RECORD.md`](RECORD.md).

Delete any section that genuinely does not apply, and say why in one line. Do not leave a heading with `TODO` under it: an empty section reads as an oversight, a deleted one reads as a decision.

---

```markdown
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
- [ ] `XXX-0.00` <short label> — deferred to P<n>, see RECORD.md

## API surface

| Method | Path | Role | Ownership check | Notes |
|---|---|---|---|---|
| GET | `/v1/...` | `DOCTOR` | Active consultation or grant | |
| POST | `/v1/...` | `RECEPTIONIST` | Same hospital | Idempotency key required |

Every route is reached through the gateway. This service is `ClusterIP` and
is not addressable from outside the cluster.

## Events

**Publishes**

| Event | When | Payload summary |
|---|---|---|
| `domain.entity.verbed` | <trigger> | <fields> |

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
```

---

## NOTES ON FILLING THIS IN

**Goals.** Reference checklist ids, never restate the feature. `docs/features.md` already describes what the feature does, and two descriptions of one thing always diverge. An unchecked box in a service marked DONE is a lie: either check it, or move it out of scope and say where it went.

**Test status.** Never type a test count or a coverage percentage into prose. It is stale on the next merge, and a stale number is worse than none because people believe it. A badge updates itself; a threshold is a contract that does not decay. The **deliberately not covered** list is the most valuable part of this section, because a gap someone chose is information and a gap someone hid is a defect waiting to surface in production.

**Failure modes.** This is the section that gets read at 2am and the one most often skipped. Fill it in from the P6 failure tests rather than from imagination, and cite the test that proves each row. A row with no test behind it is a guess.

**Known limitations.** Every deliberate shortcut, with its ceiling and its upgrade path. Writing it down is what separates a decision from an accident, and it saves the next person the week it takes to rediscover why something is the way it is.

**Length.** If a section would be three words, it is fine at three words. The template is a checklist of questions to answer, not a word count to hit. A short honest README beats a long aspirational one.
