# PROMPT — `@hms/comms`

**Read [`.github/AGENT_PROMPT.md`](../../.github/AGENT_PROMPT.md) first.** It holds
the rules, the stack, the file shape, and the definition of done. This file holds
only what is specific to `comms`.

**Read [`.github/RULES.md`](../../.github/RULES.md) too.** It is binding.

---

## What this service owns

Channel providers, templates, preferences, and delivery state across five
channels: in-app, push (Expo), SMS, email (SMTP), and WhatsApp Cloud API.

**It is the biggest consumer in the system.** Almost every event published
anywhere ends up here as a notification.

## The rule that matters most

**Never send a real message from a development or test environment.** Not one SMS,
not one email. The console driver exists for this, and `assertDeliverable()` in
`apps/identity/src/infrastructure/delivery.ts` is the pattern: refuse to boot in
production with a console driver, and refuse to send for real outside production.

A test that accidentally texts a real patient at 3am is the kind of mistake that
ends a pilot.

## State: a stub

16 lines and a health route.

## What to build, in order

1. **One `notify` entry point** behind which all five channels sit. Callers ask
   for a notification; they do not choose a transport.
2. **Templates**, versioned, with the rendered output tested. Devanagari must
   render correctly — this is not an English-only product.
3. **Delivery state** per message: queued, sent, delivered, failed, with the
   provider's id recorded so a delivery can be traced when a patient says they
   never got it.
4. **Consumers for the event catalogue** in `docs/architecture.md` §6. That table
   is the specification; work through it row by row. Every consumer is idempotent
   on `messageId`, because a duplicate "your turn" notification sends a patient to
   a room that is not ready.
5. **Per-category preferences** (P5): a patient can mute marketing without muting
   "your turn is next".
6. **Retry and dead-letter handling.** A provider outage must not lose the
   message, and it must not retry forever.

## PHI in notifications

A notification body is the easiest place to leak PHI, because it leaves the system
by design. "Your lab result is ready" is fine; the result value is not. Templates
carry the minimum that makes the message useful, and the detail lives behind an
authenticated screen.

## Negative tests that must exist

- With `APP_ENV` unset or non-production, no real provider is ever called.
- The same `messageId` consumed twice sends one message.
- A provider failure is retried and then dead-lettered, never silently dropped.
- No template renders a diagnosis, a result value, or a full patient record.
- A muted category is not delivered, and a non-mutable category still is.

---

## Definition of done

The full checklist is in [`.github/AGENT_PROMPT.md`](../../.github/AGENT_PROMPT.md)
section 5. The short form:

1. `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm typecheck:tests`,
   `pnpm format:check` and `pnpm test` all pass.
2. Unit tests against the in-memory store, HTTP tests through `app.inject()`, and
   every negative test listed above.
3. `postman/comms.postman_collection.json` exists, is runnable top to bottom
   without editing, and has a "Security expectations" folder asserting the
   failures. No real credentials, no real patient data.
4. `docker build -f apps/comms/Dockerfile -t hms-comms:dev .` **actually builds**,
   the container starts, and `/health/live` and `/health/ready` both answer on
   port 5006:

   ```bash
   docker build -f apps/comms/Dockerfile -t hms-comms:dev .
   docker compose -f docker/compose/deps.yml up -d
   docker run --rm --network hms_default -p 5006:5006 \
     --env-file envs/.env.container hms-comms:dev
   curl -fsS http://localhost:5006/health/live
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
