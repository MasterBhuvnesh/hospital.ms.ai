# PROMPT — `@hms/events`

**Read [`.github/AGENT_PROMPT.md`](../../.github/AGENT_PROMPT.md) first.** It holds
the rules, the stack, the file shape, and the definition of done. This file holds
only what is specific to `packages/events`.

**Read [`.github/RULES.md`](../../.github/RULES.md) too.** It is binding.

Every backend service imports this package. A bug here is a bug in eight places at
once, which is why the test bar is higher here than in a service.

---

## What this package owns

The RabbitMQ envelope, publish, consume, and delayed publish.

**This package does not exist yet — only a README.** Its placeholder source was
deleted on 19-08-2026, because an empty package that builds is indistinguishable
from a finished one.

**It blocks more work than anything else in the repository.** Every service
publishes or consumes something. `scheduling` cannot do reminders without it, and
`comms` has almost nothing to do until it exists. Build it early.

## What to build

1. **The envelope**, exactly as specified in `docs/architecture.md` §6:

   ```
   { messageId, correlationId, causationId, occurredAt,
     hospitalId, actorId, version, payload }
   ```

   `version` exists so a payload can change without breaking consumers. Use it
   from the first message, not from the first breaking change.

2. **Publish and consume**, with the naming convention enforced:
   `<domain>.<entity>.<past-tense-verb>`.

3. **Idempotency on `messageId`,** provided by this package rather than
   reimplemented in every consumer. Delivery is at-least-once everywhere, so a
   consumer that is idempotent only by accident is a bug waiting for load. Make
   the correct thing the easy path.

4. **Delayed publish** through the `rabbitmq_delayed_message_exchange` plugin:

   ```ts
   publish('reminders', 'appointment.reminder.due', payload, {
     headers: { 'x-delay': msUntil(appointment.startsAt - hours(24)) },
   })
   ```

   Where the plugin is unavailable, the fallback is **one queue per TTL bucket**
   with a dead-letter exchange, **not** a shared queue with per-message TTL. TTL
   queues expire in head-of-line order, so a 24-hour message queued before a
   2-hour message blocks it, and the 2-hour reminder arrives 22 hours late.

5. **Dead-letter handling and retry with backoff.** A poison message must not loop
   forever, and a transient outage must not lose a notification.

6. **A test harness** that lets a service test its consumers without a broker, in
   the same spirit as the in-memory store pattern the services use.

## Rules specific to this package

- The client library is **not yet chosen**. Decide, justify it in the pull
  request, and get BHUVNESH's approval before building on it.
- No BullMQ, and no second job system. RabbitMQ already does this, and a second
  queue means a second dashboard, a second retry semantic, and a second place to
  look during an incident.
- The envelope carries `hospitalId`. A consumer that ignores it and writes
  unscoped is a tenancy breach.
- **No PHI in a payload** beyond what the consumer genuinely needs. Message bodies
  land in broker logs and dead-letter queues, which are far less guarded than the
  database.

---

## Definition of done

The full checklist is in [`.github/AGENT_PROMPT.md`](../../.github/AGENT_PROMPT.md)
section 5. A package has no Postman collection and no Dockerfile, so the bar is
higher instead on two things:

1. **Tests.** Every service depends on this code. Test the edges and the failures,
   not the happy path.
2. **The README.** It is the only documentation a service developer reads before
   using this package. Show the actual call, not a description of it.

`pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm typecheck:tests`,
`pnpm format:check` and `pnpm test` must all pass, and the matching rows in
[`RECORD.md`](../../.github/RECORD.md) must be updated in the same commit.

## What you may change

This package, and the shared configuration it genuinely needs: `envs/.env.example`
and `envs/CATALOGUE.md` for key names, and `scripts/dev/*` for a helper that does
not exist yet.

Name every out-of-package edit in the pull request description. BHUVNESH reviews
all of them and needs to see the shared-file changes without hunting.

## Do not

- **Write a real secret value anywhere.** Placeholders only, no exceptions.
- **Edit `.github/workflows/`, `CODEOWNERS`, `RULES.md`, or `AGENT_PROMPT.md`.**
  Those decide what gets merged and what the rules are. Propose changes instead
  of making them.
- **Edit `infra/helm/`, `infra/terraform/`, or `infra/kubernetes/`.**
- Add a dependency without asking. Seven other services inherit it.
- Break an existing export. Every service imports this package.
- Put anything service-specific in here. If only one service needs it, it belongs
  in that service.
- Weaken or delete a test to make a build pass.
