# PROMPT — `@hms/logger`

**Read [`.github/AGENT_PROMPT.md`](../../.github/AGENT_PROMPT.md) first.** It holds
the rules, the stack, the file shape, and the definition of done. This file holds
only what is specific to `packages/logger`.

**Read [`.github/RULES.md`](../../.github/RULES.md) too.** It is binding.

Every backend service imports this package. A bug here is a bug in eight places at
once, which is why the test bar is higher here than in a service.

---

## What this package owns

pino, configured with PHI redaction paths, plus request context propagation.

**This package is why `console.log` is an ESLint error.** PHI protection is a
configuration array applied once here, not a discipline eight developers have to
remember at every call site.

## State: built, 29 tests

The logger, the redaction paths in `src/redact.ts`, and the async-local request
context all work.

## What to build

1. **Correlation id propagation** across HTTP calls and RabbitMQ messages, so one
   patient's journey can be traced end to end through all eight services.
2. **OpenTelemetry integration** for Tempo, once tracing is wired.
3. Extend the redaction paths as new PHI-bearing field names appear.

## Rules specific to this package

- **The redaction list is a security boundary.** When you add a field name that
  might carry PHI, add it here in the same change.
- If a field name evades the redaction list, fix the list — do not rename the
  field to something that slips past it. That mistake was made once in this
  repository already (`otp_code`, because `code` was redacted) and caught before
  it shipped.
- Test redaction by asserting on **captured log output**. A test that only checks
  the redaction array is configured proves nothing about what is actually written.

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
