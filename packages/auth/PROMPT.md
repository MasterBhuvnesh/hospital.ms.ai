# PROMPT — `@hms/auth`

**Read [`.github/AGENT_PROMPT.md`](../../.github/AGENT_PROMPT.md) first.** It holds
the rules, the stack, the file shape, and the definition of done. This file holds
only what is specific to `packages/auth`.

**Read [`.github/RULES.md`](../../.github/RULES.md) too.** It is binding.

Every backend service imports this package. A bug here is a bug in eight places at
once, which is why the test bar is higher here than in a service.

---

## What this package owns

RS256 JWT signing and verification via `jose`, argon2id password hashing, and
SHA-256 token hashing.

## State: partly built, 18 tests

Done: `signAccessToken`, `verifyAccessToken`, `hashPassword`, `verifyPassword`,
`randomToken`, `hashToken`.

Two decisions to understand before changing anything:

- **`algorithms: ['RS256']` is pinned on verify.** Without that pin, a token with
  `alg: none` and a token signed with HS256 using the public key as the secret are
  both accepted. This is the most common JWT vulnerability there is.
- **Refresh tokens and OTP codes are SHA-256, not argon2.** A 256-bit CSPRNG value
  has no brute-force surface for a slow hash to protect, and this runs on every
  refresh. argon2 there costs latency and buys nothing.

## What to build

1. **RBAC helpers** — the role and permission checks services share, so eight
   services do not each write a subtly different version.
2. **Ownership checks:** does this actor have access to this patient, through an
   active consultation or an explicit grant. `clinical` needs this, and it must
   not be reimplemented per service.
3. **Break-glass:** an emergency grant with a recorded reason, an expiry, and a
   patient notification.
4. **JWKS verification**, once `identity` exposes the endpoint, so services stop
   carrying the public key in their environment.

## Rules specific to this package

- The argon2 parameters are explicit (19456 KiB, timeCost 2, parallelism 1) so a
  library upgrade cannot silently weaken hashes already stored. Do not replace
  them with library defaults.
- Every new verification path needs its negative tests before its happy path.
- Never log a token, a hash, or a key.

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

## Do not

- Add a dependency without asking. Seven other services inherit it.
- Break an existing export. Every service imports this package.
- Put anything service-specific in here. If only one service needs it, it belongs
  in that service.
- Touch `infra/`, `docker/`, `envs/`, `scripts/`, or `.github/`.
