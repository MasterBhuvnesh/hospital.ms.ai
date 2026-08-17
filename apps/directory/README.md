# apps/directory

**Port 5002.** Hospitals, departments, rooms, doctors, schedules, attendance, leave, fees.

Owns the `directory` Postgres schema and reads no other.

## Goal

Hold the answer to "what exists here, and who is available when". It is the reference data behind every booking: which hospital, which department, which doctor, on which day, at what fee, in which room.

It is deliberately the least exciting service in the system. Everything it stores changes slowly and is read constantly, which makes it the easiest to cache and the most damaging to get wrong, because a bad schedule silently produces bad appointments for a week.

## What it must do

| Capability | Phase | Notes |
|---|---|---|
| Hospital records, with a required IANA timezone | P0 | The timezone is not optional. The whole queue day depends on it |
| Departments and rooms | P0 | |
| Doctor profiles, registration numbers, specialities | P0 | The registration number appears on every prescription attestation |
| Staff assignment to hospitals, with roles | P0 | A doctor may practise at more than one hospital |
| Recurring weekly schedules and slot templates | P1 | The source of what `scheduling` may book against |
| Schedule exceptions, leave, and holidays | P1 | An exception must win over the recurring rule |
| Attendance, check-in and check-out | P2 | Whether the doctor is physically present today |
| Consultation fees, with effective dates | P3 | Never a single current value. Fees change and old visits keep the old fee |
| Availability query used during booking | P1 | Synchronous, because the caller cannot answer without it |

## Conditions

- **Every hospital has a timezone, and it is required at creation.** `queue_tokens.tokenDate` derives from it. A hospital row without one is a data defect that surfaces days later as duplicate token numbers.
- **Fees are versioned by effective date, not overwritten.** `consultation.completed` carries a `feeSnapshot` precisely so a visit is billed at the fee that applied on the day it happened. Overwriting a fee row rewrites history for every unbilled visit.
- **Schedules are rules, not rows per day.** Store the recurring pattern plus exceptions. Materialising a year of slots creates a year of rows to correct when the doctor changes their Tuesday.
- **An exception always beats the recurring rule**, and leave always beats both. Get the precedence wrong and a doctor on leave keeps taking bookings.
- **This service says who is scheduled. It never says who is next.** Queue order is `scheduling`.
- **Availability is a read-heavy synchronous endpoint on the booking path.** Cache it, and invalidate on schedule and leave changes rather than on a timer.

## Allowed and not allowed

| Allowed | Not allowed |
|---|---|
| Store hospitals, departments, rooms, schedules, leave, fees | Store appointments, tokens or consultations |
| Answer "is this doctor available at this time" | Decide who gets the slot. That is `scheduling` |
| Hold the doctor's registration number | Sign anything with it |
| Publish schedule and fee change events | Reach into `scheduling` to cancel affected appointments. It publishes; `scheduling` reacts |
| Be cached aggressively | Be the source of a fee already used on a completed visit |

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
docker build -f apps/directory/Dockerfile -t hms-directory:$(git rev-parse --short HEAD) .
docker run -p 5002:5002 --env-file envs/.env.container hms-directory:$SHA

pnpm dev --filter @hms/directory
```

Also included in the all-in-one image (`docker/Dockerfile`) with `SERVICE=directory`.

See [`docs/architecture.md`](../../docs/architecture.md) sections 5.2 and 5.3.
