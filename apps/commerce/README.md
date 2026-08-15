# apps/commerce

**Port 5005.** Billing, invoices, payments, refunds, pharmacy catalogue, inventory, orders, dispensing.

Owns the `commerce` Postgres schema and reads no other.

## Critical rules

- **Payment status changes only from the verified webhook**, never from a client callback. A client callback is a claim, not a fact.
- Verify the webhook HMAC against the **raw** request body. A parsed-then-restringified body breaks the signature.
- **Stock decrements on dispense, never on prescribe**, and the write is transactional so two counters cannot dispense the same last unit.
- Invoices bill the `feeSnapshot` carried on `consultation.completed`. Never look up the current fee at invoice time.
- Razorpay sits behind `PaymentProvider`. A hospital with a different processor is a configuration change.

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

`app.ts` and `server.ts` are split so `supertest` can drive the application without binding a port.

## Build

There is no `Dockerfile` here. `docker/Dockerfile` builds every service and `SERVICE=commerce` selects this entrypoint.

```bash
pnpm dev --filter @hms/commerce
docker run -e SERVICE=commerce -e PORT=5005 --env-file envs/.env.container hms-platform:$SHA
```

See [`docs/architecture.md`](../../docs/architecture.md) and [`docs/traceability.md`](../../docs/traceability.md).
