# PROMPT — `@hms/middleware`

**Read [`.github/AGENT_PROMPT.md`](../../.github/AGENT_PROMPT.md) first.** It holds
the rules, the stack, the file shape, and the definition of done. This file holds
only what is specific to `packages/middleware`.

**Read [`.github/RULES.md`](../../.github/RULES.md) too.** It is binding.

Every backend service imports this package. A bug here is a bug in eight places at
once, which is why the test bar is higher here than in a service.

---

## What this package owns

The Fastify plugins every service registers.

## State: barely started

Only `health.ts` exists — `/health/live` and `/health/ready`. Everything below is
unwritten, and `identity` currently carries local versions of some of it.

## What to build, in order

1. **The error handler.** One place that maps a domain error to the
   `@hms/contracts` envelope and a status code, so eight services do not each
   invent their own error shape. `apps/identity/src/modules/auth/routes.ts` has a
   local version — that is the behaviour to generalise. It must **never** leak a
   stack trace, a SQL fragment, or an internal message to a client.
2. **The auth middleware.** Reads the verified `x-user-*` headers the gateway
   sets, populates the request context, and enforces per-route role requirements.
   It must **not** re-verify the JWT, because the gateway already did. It must
   also not blindly trust those headers when a service is reached directly, so
   decide and document how a service knows it is behind the gateway.
3. **Correlation id.** Read it from the inbound header, generate one when absent,
   put it into the logger context, and pass it downstream over both HTTP and
   RabbitMQ.
4. **Request validation** wiring for zod, so a route declares its schema once and
   gets validation, serialization, and types from that one declaration.

## Rules specific to this package

- A change here changes the security posture of all eight services at once.
- The error handler is the single place where a mistake becomes an information
  leak everywhere simultaneously. Test what it does **not** say.

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
