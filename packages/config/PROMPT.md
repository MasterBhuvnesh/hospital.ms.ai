# PROMPT — `@hms/config`

**Read [`.github/AGENT_PROMPT.md`](../../.github/AGENT_PROMPT.md) first.** It holds
the rules, the stack, the file shape, and the definition of done. This file holds
only what is specific to `packages/config`.

**Read [`.github/RULES.md`](../../.github/RULES.md) too.** It is binding.

Every backend service imports this package. A bug here is a bug in eight places at
once, which is why the test bar is higher here than in a service.

---

## What this package owns

Environment loading, validated with zod at boot, failing fast and loudly. A
service that starts with a missing or malformed variable and falls over an hour
later under load is the exact failure this package exists to prevent.

## State: built, 31 tests

`createConfigLoader`, the base schema, and `durationSchema` (which converts
`"15m"` into milliseconds) all work. Services extend the base with the keys they
actually read — `apps/identity/src/config.ts` is the model.

## What to build

1. Keys for services as they are built. Add them to the **service's** schema, not
   the base, unless every service genuinely reads them.
2. Keep `envs/.env.example` and `envs/CATALOGUE.md` in step with the schema. A key
   that exists in code and not in the example file is a key the next developer
   spends an afternoon discovering.

## Rules specific to this package

- **Never log a value.** Log the key name and, if you must, its length.
- Fail at boot, not at first use. A validated config is worthless if half of it is
  validated lazily.
- Every duration key goes through `durationSchema`. This package once validated
  duration strings and never converted them, so every service received `"15m"`
  where it expected a number. Do not reintroduce that by declaring a raw string.

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
