# apps/comms

**Port 5006.** In-app, push, SMS, email, WhatsApp, templates, preferences.

Owns the `comms` Postgres schema and reads no other.

## Goal

Be the only thing in the system that talks to a patient, and be the only thing that knows how. Every other service publishes a fact; this service decides whether that fact becomes a push, an SMS, an email, a WhatsApp message, or nothing at all.

Centralising it is what makes preferences, quiet hours, deduplication and opt-out enforceable. Eight services each sending their own SMS is eight places to get consent wrong.

## What it must do

| Capability | Phase | Notes |
|---|---|---|
| In-app notification feed | P1 | The channel that always works |
| Push to mobile and desktop | P1 | Queue position and near-turn warnings |
| Templates, versioned, with variables | P5 | Never string concatenation at the call site |
| Multi-language templates | P5 | Patient names and content arrive in Indian scripts |
| SMS behind `SmsProvider` | P5 | DLT-registered templates required in India |
| Email behind `EmailProvider` over SMTP | P5 | Carries the prescription and invoice PDFs |
| WhatsApp behind `WhatsAppProvider` | P5 | Approved templates only, outside the session window |
| Per-user channel preferences and quiet hours | P5 | |
| Delayed and scheduled sends | P1 | Through the RabbitMQ delayed exchange, not a second job system |
| Delivery status tracking and retry | P5 | |
| Opt-out, honoured across every channel | P5 | |

## Conditions

- **Never send automatically from development or test.** Development uses Mailpit and a console SMS stub. Testing uses provider stubs and never contacts a real provider. A test suite that texts a real patient is a single mistaken environment variable away, so the guard is in the provider selection, not in the caller.
- **Every provider sits behind an interface.** SMS, email and WhatsApp each have one, with a stub implementation used everywhere except production. SES is used through its SMTP endpoint, never its SDK, so email has no AWS dependency.
- **Delivery is at-least-once, so sends must be deduplicated.** Idempotent on `messageId`, and on a per-recipient content key for the channels where a duplicate is expensive rather than merely annoying.
- **Templates are versioned records, not code.** An SMS body assembled in a handler cannot be reviewed, translated, or DLT-registered.
- **Quiet hours and opt-out are enforced here, at send time.** Not by the publisher, which cannot know them, and not by the provider, which does not care.
- **Queue notifications are time-critical and everything else is not.** Near-turn warnings ride a separate queue from receipts and reminders, so a marketing backlog cannot delay the message a patient is standing in a corridor waiting for.
- **A failed send is a logged, retried, visible failure.** Silently dropping a notification is worse than a visible error, because the patient never learns their turn passed.

## Allowed and not allowed

| Allowed | Not allowed |
|---|---|
| Own notifications, templates, preferences, delivery status | Own users, phone numbers, or email addresses as identity |
| Consume events from every other service | Call another service to enrich a message. The event carries what it needs |
| Attach a PDF that `clinical` or `commerce` produced | Generate a PDF |
| Decide the channel, the language, and the timing | Decide whether the underlying thing happened |
| Hold provider credentials | Log a message body containing PHI |
| Retry a failed send | Retry by republishing the source event |

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
docker build -f apps/comms/Dockerfile -t hms-comms:$(git rev-parse --short HEAD) .
docker run -p 5006:5006 --env-file envs/.env.container hms-comms:$SHA

pnpm dev --filter @hms/comms
```

Also included in the all-in-one image (`docker/Dockerfile`) with `SERVICE=comms`.

See [`docs/architecture.md`](../../docs/architecture.md) sections 6 and 6.1, and [`docs/tech-stack.md`](../../docs/tech-stack.md).
