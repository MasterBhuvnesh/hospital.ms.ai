# apps/gateway

**Port 4000.** Routing, JWT verification, header stripping, rate limiting, WebSocket fanout.

Owns no Postgres schema. It is the only service with a public address.

## Goal

Be the single front door, and be boring. Every request from every client enters here, gets its identity established once, and is forwarded inward. The gateway exists so that the other seven services never have to think about the public internet, and so that there is exactly one place to answer "who is this caller" rather than eight.

It also carries the realtime path: the WebSocket connections that make the queue live. That is the one place where the gateway is on the critical path for the product's core promise, so it is the one place where it is allowed to be interesting.

## What it must do

| Capability | Phase | Notes |
|---|---|---|
| Reverse proxy to the seven internal services | P0 | Route by path prefix, no business logic |
| RS256 JWT verification against the `identity` JWKS | P0 | Cached, with a refresh on unknown `kid` |
| Strip client-supplied identity headers, then inject its own | P0 | The single most important thing it does |
| Rate limiting, per IP and per user | P0 | Stricter on OTP and login than on reads |
| Request id and correlation id propagation | P0 | Generated here if absent, forwarded everywhere |
| CORS, helmet, body size limits | P0 | |
| WebSocket endpoint for queue subscriptions | P1 | Fans out from Redis pub/sub |
| Raw-body passthrough for payment webhooks | P3 | HMAC verification needs the untouched bytes |
| Health aggregation across the seven services | P6 | Reports which are ready, for the dashboard |

## Conditions

- **It strips before it injects.** `x-user-id`, `x-hospital-id`, `x-roles` and every other identity header arriving from a client are deleted unconditionally, then set from the verified token. Trusting a client-supplied `x-user-id` is total authentication bypass, and it is the kind of bug that is invisible until someone tries it.
- **It verifies, it does not decide.** The gateway proves who the caller is. Whether that caller may read this patient is decided by the owning service, which verifies the JWT again itself. Defence in depth is not optional here, because a misconfigured route would otherwise expose an unauthenticated service.
- **It holds no session state.** Every replica must be able to serve any request. WebSocket connections are the exception, and they are handled by each replica fanning out from Redis to its own sockets, never by pinning a user to a replica.
- **It stays stateless about the domain.** No database, no Prisma, no schema.
- **Realtime latency is a budget, not an aspiration.** Queue position must reach the patient's phone in under two seconds end to end, p95. That budget is measured here.

## Allowed and not allowed

| Allowed | Not allowed |
|---|---|
| Verify tokens, cache the JWKS | Sign tokens. Only `identity` holds the private key |
| Route, retry idempotent GETs, apply timeouts | Any business rule, any validation beyond shape and size |
| Rate limit, throttle, shed load | Read or write any Postgres schema |
| Terminate WebSocket connections | Own queue state. It fans out what `scheduling` publishes |
| Attach identity and correlation headers | Enrich a response by calling a second service. That is a client concern or a service concern, never a proxy concern |

## Layout

```
src/
  routes/         proxy route definitions, one file per upstream service
  middleware/     auth, header stripping, rate limiting, correlation ids
  ws/             websocket handling and redis fanout
  app.ts          builds the Fastify instance (testable)
  server.ts       binds the port (never imported by tests)
```

## Build

This service has its own `Dockerfile`, producing the `hms-gateway` image. Build from the **repository root**, because the build needs the workspace manifests and the shared packages:

```bash
docker build -f apps/gateway/Dockerfile -t hms-gateway:$(git rev-parse --short HEAD) .
docker run -p 4000:4000 --env-file envs/.env.container hms-gateway:$SHA
```

It is also included in the all-in-one image (`docker/Dockerfile`), which boots this service with `SERVICE=gateway`.

```bash
pnpm dev --filter @hms/gateway
```

See [`docs/architecture.md`](../../docs/architecture.md) section 7 and [`docs/traceability.md`](../../docs/traceability.md).
