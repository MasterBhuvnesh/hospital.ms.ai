# PROMPT — `@hms/scheduling`

**Read [`.github/AGENT_PROMPT.md`](../../.github/AGENT_PROMPT.md) first.** It holds
the rules, the stack, the file shape, and the definition of done. This file holds
only what is specific to `scheduling`.

**Read [`.github/RULES.md`](../../.github/RULES.md) too.** It is binding.

---

## What this service owns

Appointments, waitlists, queue tokens, priority ordering, and consultation
**state**. Merged from appointment, queue, and the consultation lifecycle.

**This is the critical path.** Three replicas minimum, autoscaled on RabbitMQ
queue depth. The live queue screen is the flagship of the product and is watched
continuously by every waiting patient at once.

## The consultation boundary, which is load-bearing

| | `scheduling` (you) | `clinical` (not you) |
|---|---|---|
| Owns | Consultation **state**: scheduled, started, paused, completed, no_show | Consultation **content**: complaint, vitals, SOAP, diagnosis |
| Keyed by | `consultationId` — **this service mints it** | The same id, as a foreign reference |
| Never | Stores a clinical fact | Changes consultation state |

You publish `consultation.started` and `consultation.completed`; `clinical`
consumes them. Neither writes the other's tables.

## State: a stub

16 lines and a health route.

## What to build, in order

1. **Appointments** — create, reschedule, cancel — calling `directory`
   synchronously for the slot check, because the caller needs the answer to
   respond.
2. **Queue tokens.** Read `docs/architecture.md` §5.5 before writing a line of
   this. Token numbers are unique per hospital per day and are generated
   concurrently at a reception desk with several terminals. A read-then-write
   loses under load. Use a database sequence or a unique constraint with a retry,
   not an application-level check.
3. **Idempotency keys** on booking and token generation. A reception desk with a
   flaky connection retries, and two tokens for one patient is a real incident.
4. **Priority ordering** and the **consultation state machine**. Illegal
   transitions are rejected by the model, not by a route handler: `completed`
   cannot go back to `started`.
5. **Events:** `appointment.created`, `appointment.rescheduled`,
   `appointment.cancelled`, `appointment.no_show`, `queue.token.created`,
   `queue.token.updated`, `queue.token.skipped`, `queue.token.recalled`,
   `queue.patient.near_turn`, `consultation.started`, `consultation.completed`.
6. **The fee snapshot.** `consultation.completed` carries
   `feeSnapshot { amount, currency, feeConfigVersion }`, read from `directory` at
   the time of the visit. `commerce` bills exactly that and must never look up the
   current fee, because the price may have changed since.
7. **Delayed reminders** through the RabbitMQ delayed-message exchange, T-24h and
   T-2h. No BullMQ, no node-cron.
8. **Consume `payment.captured`** to mark a visit financially closed, so reception
   can complete day-close.

## Negative tests that must exist

- Concurrent token generation under load produces no duplicate number for a
  hospital-day. Write this as a real concurrency test, not a sequential loop.
- A replayed request with the same idempotency key returns the original result and
  creates nothing new.
- Every illegal state transition is rejected.
- A consumer that receives the same `messageId` twice acts once.
- Hospital A cannot see or modify hospital B's queue.

---

## Definition of done

The full checklist is in [`.github/AGENT_PROMPT.md`](../../.github/AGENT_PROMPT.md)
section 5. The short form:

1. `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm typecheck:tests`,
   `pnpm format:check` and `pnpm test` all pass.
2. Unit tests against the in-memory store, HTTP tests through `app.inject()`, and
   every negative test listed above.
3. `postman/scheduling.postman_collection.json` exists, is runnable top to bottom
   without editing, and has a "Security expectations" folder asserting the
   failures. No real credentials, no real patient data.
4. `docker build -f apps/scheduling/Dockerfile -t hms-scheduling:dev .` **actually builds**,
   the container starts, and `/health/live` and `/health/ready` both answer on
   port 5003:

   ```bash
   docker build -f apps/scheduling/Dockerfile -t hms-scheduling:dev .
   docker compose -f docker/compose/deps.yml up -d
   docker run --rm --network hms_default -p 5003:5003 \
     --env-file envs/.env.container hms-scheduling:dev
   curl -fsS http://localhost:5003/health/live
   ```

   The Dockerfile in this directory has **never been verified to build**. If it is
   broken, fix it and say what was wrong.
5. `README.md` follows [`SERVICE_README_TEMPLATE.md`](../../.github/SERVICE_README_TEMPLATE.md),
   with an honest Status column that does not claim unbuilt behaviour.
6. The matching rows in [`RECORD.md`](../../.github/RECORD.md) are updated in the
   same commit.

## Do not

- Touch another service's directory, schema, or migrations.
- Read another service's tables. Use its API or an event.
- Modify a shared package to make this service compile — raise it instead.
- Touch `infra/`, `docker/`, `envs/`, `scripts/`, or `.github/`.
- Claim it works without running it.
