# PROMPT — `@hms/gateway`

**Read [`.github/AGENT_PROMPT.md`](../../.github/AGENT_PROMPT.md) first.** It holds
the rules, the stack, the file shape, and the definition of done. This file holds
only what is specific to `gateway`.

**Read [`.github/RULES.md`](../../.github/RULES.md) too.** It is binding.

---

## What this service owns

Routing, JWT verification, header stripping, rate limiting, WebSocket upgrade and
fanout. **No database, no schema, no domain logic.**

**This is the only publicly exposed service.** The other seven are `ClusterIP` and
unreachable from outside the cluster. Everything an attacker can reach, they reach
through here.

## State: a stub

16 lines and a health route. Nothing below is built.

## What to build, in order

1. **JWT verification.** Verify the RS256 access token once, here, with
   `algorithms: ['RS256']` pinned. Reject with an opaque message. Fetch the key
   from identity's JWKS endpoint when it exists; until then read `JWT_PUBLIC_KEY`.
2. **Header stripping, before anything else.** The gateway sets `x-user-id`,
   `x-user-roles` and `x-hospital-id` from verified claims, and **strips any
   inbound header with those names first**. A client that sends `x-user-id` must
   not be able to impersonate anyone. This is the most important code in the
   service — write the test that proves it before you write the feature.
3. **Proxy routing** to the seven internal services by path prefix. Preserve the
   correlation id, generate one when absent, and pass it downstream so a request
   can be traced across services.
4. **Rate limiting** per IP and per authenticated user, stricter on auth routes.
   Backed by Redis, because there are three replicas and a per-process counter
   lets an attacker have three times the budget.
5. **WebSocket upgrade and fanout** for the live queue, with Redis pub/sub behind
   it so a message published by any replica reaches clients connected to all of
   them. This is the flagship patient screen: a dropped connection must reconnect
   and resync position, not silently stall on a stale number.
6. **The raw-body hook** for payment webhook HMAC verification. Razorpay signs the
   raw bytes, and a parsed then re-serialised body will not verify.

## Negative tests that must exist

- A request carrying a forged `x-user-id` header arrives upstream with that header
  **replaced**, never passed through.
- An expired, wrong-audience, wrong-issuer, `alg: none`, or foreign-key token is
  rejected before any proxying happens.
- An authenticated route returns 401 with no detail when the header is absent,
  malformed, or carries a refresh token.
- Rate limits hold across replicas, not per process.

## Notes

`gateway` has no Prisma dependency and must not gain one. If you need the database
here, the logic belongs in a service.

---

## Definition of done

The full checklist is in [`.github/AGENT_PROMPT.md`](../../.github/AGENT_PROMPT.md)
section 5. The short form:

1. `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm typecheck:tests`,
   `pnpm format:check` and `pnpm test` all pass.
2. Unit tests against the in-memory store, HTTP tests through `app.inject()`, and
   every negative test listed above.
3. `postman/gateway.postman_collection.json` exists, is runnable top to bottom
   without editing, and has a "Security expectations" folder asserting the
   failures. No real credentials, no real patient data.
4. `docker build -f apps/gateway/Dockerfile -t hms-gateway:dev .` **actually builds**,
   the container starts, and `/health/live` and `/health/ready` both answer on
   port 4000:

   ```bash
   docker build -f apps/gateway/Dockerfile -t hms-gateway:dev .
   docker compose -f docker/compose/deps.yml up -d
   docker run --rm --network hms_default -p 4000:4000 \
     --env-file envs/.env.container hms-gateway:dev
   curl -fsS http://localhost:4000/health/live
   ```

   The Dockerfile in this directory has **never been verified to build**. If it is
   broken, fix it and say what was wrong.
5. `README.md` follows [`SERVICE_README_TEMPLATE.md`](../../.github/SERVICE_README_TEMPLATE.md),
   with an honest Status column that does not claim unbuilt behaviour.
6. The matching rows in [`RECORD.md`](../../.github/RECORD.md) are updated in the
   same commit.

## Do not

- Touch another service's directory, schema, or migrations.
- Read another service's tables. Use its API or an event.
- Modify a shared package to make this service compile — raise it instead.
- Touch `infra/`, `docker/`, `envs/`, `scripts/`, or `.github/`.
- Claim it works without running it.
