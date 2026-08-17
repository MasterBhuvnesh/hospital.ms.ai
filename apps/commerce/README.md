# apps/commerce

**Port 5005.** Billing, invoices, payments, pharmacy, inventory, dispensing.

Owns the `commerce` Postgres schema and reads no other.

## Goal

Take money correctly and account for stock honestly. Both halves are the same kind of problem: an operation that must happen exactly once, that a user will retry, and that a network will duplicate.

Billing and pharmacy live together because they share that discipline and because dispensing is a billable event. Splitting them would put a distributed transaction between a stock decrement and the invoice line that pays for it.

## What it must do

| Capability | Phase | Notes |
|---|---|---|
| Invoice generation from `consultation.completed` | P3 | Uses the `feeSnapshot` on the event, never a current fee lookup |
| Invoice PDF | P3 | |
| Razorpay order creation behind `PaymentProvider` | P3 | Idempotency key on creation |
| Payment webhook handling | P3 | HMAC verified against the raw body, idempotent on `razorpay_payment_id` |
| Cash and card at the counter | P3 | Not every payment is online |
| Refunds, full and partial | P3 | |
| Pharmacy catalogue and batch-level stock | P3 | Batch and expiry, not a single quantity per drug |
| Dispensing against a signed prescription | P3 | Idempotency key required |
| Stock receipt, adjustment, and write-off | P3 | Every movement is a row. Never an in-place quantity edit |
| Low-stock and expiry alerts | P3 | Published, not polled by a UI |
| No-show and cancellation policy application | P3 | Consumes `appointment.no_show` and `appointment.cancelled` |
| Day-close reconciliation | P3 | |

## Conditions

- **Bill the fee that applied on the day of the visit.** `consultation.completed` carries `feeSnapshot`. Looking up the current fee at invoice time silently rebills every unbilled visit whenever a price changes.
- **The payment webhook is verified against the raw request body.** Any body parsing before HMAC verification breaks the signature, which is why the gateway passes these bytes through untouched. A webhook accepted without verification is a free-money endpoint.
- **Every critical write takes an idempotency key**: payment initiation, refund, dispensing. Users retry payments. Networks duplicate webhooks. Neither may take money twice or dispense twice.
- **Stock is a ledger, not a counter.** Every receipt, dispense, adjustment and write-off is an append-only movement row, and the current level is derived. An in-place quantity update loses the audit trail exactly when someone asks where the missing stock went.
- **Stock is tracked per batch with an expiry.** A single quantity per drug cannot answer the only questions that matter at the counter: which batch, and is it still good.
- **Dispensing requires a signed prescription.** `prescription.signed` makes it available; nothing dispenses against a draft.
- **Money is integer minor units.** Never a float. Never a JavaScript `number` holding rupees and paise.
- **The payment provider sits behind an interface.** Razorpay is the first implementation, not the model the code is shaped around.

## Allowed and not allowed

| Allowed | Not allowed |
|---|---|
| Own invoices, payments, refunds, stock, dispensing records | Own the prescription itself. That is `clinical` |
| Consume `consultation.completed` and `prescription.signed` | Read the `clinical` schema |
| Answer an advisory stock query during prescribing | Block prescribing when it is unavailable |
| Publish `pharmacy.dispensed` | Mark the prescription fulfilled itself |
| Publish `payment.captured` | Close the visit. `scheduling` reacts to the event |
| Store the Razorpay payment id and order id | Store a card number, a CVV, or any raw instrument detail |
| Generate the invoice PDF | Deliver it. That is `comms` |

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
docker build -f apps/commerce/Dockerfile -t hms-commerce:$(git rev-parse --short HEAD) .
docker run -p 5005:5005 --env-file envs/.env.container hms-commerce:$SHA

pnpm dev --filter @hms/commerce
```

Also included in the all-in-one image (`docker/Dockerfile`) with `SERVICE=commerce`.

See [`docs/architecture.md`](../../docs/architecture.md) section 5.6 and [`docs/tech-stack.md`](../../docs/tech-stack.md) section 5.3.
