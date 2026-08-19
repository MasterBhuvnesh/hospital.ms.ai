# PROMPT — `@hms/db`

**Read [`.github/AGENT_PROMPT.md`](../../.github/AGENT_PROMPT.md) first.** It holds
the rules, the stack, the file shape, and the definition of done. This file holds
only what is specific to `packages/db`.

**Read [`.github/RULES.md`](../../.github/RULES.md) too.** It is binding.

Every backend service imports this package. A bug here is a bug in eight places at
once, which is why the test bar is higher here than in a service.

---

## What this package owns

The Prisma client cache, keyed by service and connection URL, and
`ScopedRepository` — the base class that applies `hospitalId` filtering.

**`ScopedRepository` is where multi-tenancy is enforced.** Not in route handlers,
not in service methods. If a query can be written that omits `hospitalId`, one
eventually will be, and a doctor at hospital A will see a patient from hospital B.

## State: built, 11 tests

The client cache works. It matters because `docker/all-in-one.mjs` boots up to
eight services in one process, and each needs its own client without opening eight
connection pools per service.

## What to build

1. **Harden `ScopedRepository`** as `directory`, the first heavily hospital-scoped
   service, starts using it in anger. It must be genuinely hard to bypass: a
   repository method that forgets the scope should fail to compile, or throw
   loudly in development.
2. **Transaction helpers** for the paths that need them — dispensing, payment,
   token generation.
3. **Per-service migration scripts.** `db:generate`, `db:migrate` and
   `db:migrate:dev` in this package are all hardcoded to
   `apps/identity/prisma/prisma.config.ts`. That works while identity is the only
   service with a schema and breaks the moment a second one appears. Every
   service needs its own, and this package should stop owning them.
4. **Migration ordering** across services sharing one cluster.

## Rules specific to this package

- **No RDS-only extension, no Aurora-only SQL.** The schema must apply cleanly to
  a plain `postgres:16` container, because that is what the portable and
  single-host profiles run.
- The connection URL is a secret. Never log it and never include it in an error
  message — errors get reported, and reports get pasted into issues.
- Identity tables are global and correctly do **not** use `ScopedRepository`. That
  is the only such exception in the platform.

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
