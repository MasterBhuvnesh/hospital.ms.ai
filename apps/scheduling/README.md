# apps/scheduling

**Port 5003.** Appointments, waitlists, queue tokens, priority ordering, consultation state.

Owns the `scheduling` Postgres schema and reads no other.

## Goal

Run the queue. This is the product. Everything else in the system supports the promise that a patient knows their position, gets warned before their turn, and is seen in a defensible order.

That makes this the critical path in both senses: it is where the user-visible latency budget is spent, and it is where a correctness bug is worst, because two patients holding token 14 is a fight at the desk rather than a stack trace.

## What it must do

| Capability | Phase | Notes |
|---|---|---|
| Appointment booking, reschedule, cancel | P1 | Idempotency key required on every one |
| Walk-in registration | P1 | The desk path, must be fast under load |
| Queue token generation | P1 | Sequence-backed, never count-then-create |
| Live queue position and estimated wait | P1 | Published to Redis, fanned out by the gateway |
| Near-turn detection at N tokens away | P1 | Default 3, configurable per hospital |
| Skip, recall, and rejoin | P1 | A missed turn must have a defined way back |
| Priority ordering: emergency, elderly, appointment over walk-in | P1 | The rule must be explainable to a patient at the desk |
| Waitlist and promotion on cancellation | P2 | |
| Consultation state machine | P1 | `scheduled`, `started`, `paused`, `completed`, `no_show` |
| No-show marking after a delay | P2 | Published as a delayed message, not a polling job |
| Day-close, once every visit is financially closed | P3 | Consumes `payment.captured` |

## Conditions

- **This is the critical path.** Three replicas minimum, autoscaled on RabbitMQ queue depth rather than CPU alone.
- **Token generation must never be count-then-create.** Use a Postgres sequence per `(hospital, doctor, tokenDate)` or a bounded insert-retry loop, behind `@@unique([hospitalId, doctorId, tokenDate, tokenNumber])`. The constraint is the guarantee; the sequence is the optimisation. Load-tested in P1, not assumed.
- **`tokenDate` is the calendar date in the hospital's timezone**, not UTC and not the server's. A clinic running past midnight otherwise produces a unique constraint that means nothing.
- **This service owns consultation state and nothing clinical.** It knows a consultation started; it must never know what was said in it.
- **`consultation.completed` must carry `feeSnapshot`**, so `commerce` bills the fee that applied on the day of the visit rather than the fee that applies today.
- **The denormalised `patientName` and `doctorName` on `queue_tokens` are display copies**, refreshed on the owner's update event. They exist so the queue list renders without fanning out to two services on every poll. The authoritative value always stays with the owner, and nothing may join or filter on the copy.
- **Every critical write takes an idempotency key**: booking, walk-in registration, token generation. A double-tapped Book button must not produce two appointments.
- **Priority ordering is a documented, testable rule.** If it cannot be explained to the patient who was overtaken, it is not a rule, it is a bug.

## Allowed and not allowed

| Allowed | Not allowed |
|---|---|
| Own appointments, tokens, queue order, consultation state | Own consultation content, diagnosis, notes, prescriptions |
| Ask `directory` whether a doctor is available | Read the `directory` schema |
| Publish `consultation.completed` with `feeSnapshot` | Generate the invoice. That is `commerce` |
| Publish `queue.patient.near_turn` | Build the patient sheet. That is `clinical` |
| Keep display copies of patient and doctor names | Treat a display copy as authoritative, or query on it |
| Mark a visit financially closed on `payment.captured` | Take a payment, or know a payment method |

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

`app.ts` and `server.ts` are split so tests can drive the application without binding a port.

## Build

This service has its own `Dockerfile`, producing the `hms-scheduling` image. Build from the **repository root**, because the build needs the workspace manifests and the shared packages:

```bash
docker build -f apps/scheduling/Dockerfile -t hms-scheduling:$(git rev-parse --short HEAD) .
docker run -p 5003:5003 --env-file envs/.env.container hms-scheduling:$SHA
```

The build prunes to this service's production dependency graph only, so the image carries nothing the other seven need.

It is also included in the all-in-one image (`docker/Dockerfile`), which boots this service with `SERVICE=scheduling`. That image is used for Compose, disaster recovery and offline pilots. Both are built from the same commit and tagged with the same git SHA.

```bash
pnpm dev --filter @hms/scheduling
```

See [`docs/architecture.md`](../../docs/architecture.md) sections 5.3 and 5.5, and [`docs/traceability.md`](../../docs/traceability.md).
