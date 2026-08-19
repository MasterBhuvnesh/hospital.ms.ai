# PROMPT — `@hms/commerce`

**Read [`.github/AGENT_PROMPT.md`](../../.github/AGENT_PROMPT.md) first.** It holds
the rules, the stack, the file shape, and the definition of done. This file holds
only what is specific to `commerce`.

**Read [`.github/RULES.md`](../../.github/RULES.md) too.** It is binding.

---

## What this service owns

Billing, invoices, payments, refunds, the pharmacy catalog, inventory, orders, and
dispensing. Merged from billing, pharmacy, and inventory.

**This service moves money and controlled stock.** Both are auditable and both are
unforgiving of a race condition.

## State: a stub

16 lines and a health route.

## What to build, in order

1. **Invoices from the fee snapshot.** Consume `consultation.completed` and bill
   the `feeSnapshot` it carries. **Never look up the current fee at invoice
   time** — the price may have changed between the visit and the invoice, and
   billing a patient a price that did not exist on their visit day is a dispute
   you lose.
2. **Razorpay orders and webhook verification.** Verify the HMAC over the **raw
   request body**; a parsed and re-serialised body will not verify. The gateway
   preserves the raw bytes for you. An unverified webhook changes nothing.
3. **Idempotency keys** on payment, refund, and dispensing. Razorpay retries
   webhooks, and a double capture or double refund is a real financial incident.
4. **Publish** `invoice.generated`, `payment.captured`, `refund.completed`.
5. **Pharmacy catalog and inventory.**
6. **Transactional dispensing.** The stock decrement and the dispense record are
   one `$transaction`. If they can diverge, they will, and the ledger stops
   matching the shelf. Publish `pharmacy.dispensed`; `clinical` marks the
   prescription fulfilled.
7. **`stock.low`** alerts for the pharmacist and the admin.
8. **Consume `appointment.cancelled` and `appointment.no_show`** to void unpaid
   invoices and apply the no-show policy.

## Negative tests that must exist

- A webhook with a bad or absent signature changes nothing and is logged as a
  rejection.
- The same webhook delivered twice captures once.
- A refund cannot exceed the captured amount.
- Concurrent dispensing of the last unit of stock succeeds exactly once.
- A failed dispense leaves stock exactly as it was, with no partial decrement.
- Hospital A cannot read hospital B's invoices or inventory.

## A note on money

Store amounts as integer minor units — paise, not rupees. Never a float. Always
carry the currency alongside the amount.

---

## Definition of done

The full checklist is in [`.github/AGENT_PROMPT.md`](../../.github/AGENT_PROMPT.md)
section 5. The short form:

1. `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm typecheck:tests`,
   `pnpm format:check` and `pnpm test` all pass.
2. Unit tests against the in-memory store, HTTP tests through `app.inject()`, and
   every negative test listed above.
3. `postman/commerce.postman_collection.json` exists, is runnable top to bottom
   without editing, and has a "Security expectations" folder asserting the
   failures. No real credentials, no real patient data.
4. `docker build -f apps/commerce/Dockerfile -t hms-commerce:dev .` **actually builds**,
   the container starts, and `/health/live` and `/health/ready` both answer on
   port 5005:

   ```bash
   docker build -f apps/commerce/Dockerfile -t hms-commerce:dev .
   docker compose -f docker/compose/deps.yml up -d
   docker run --rm --network hms_default -p 5005:5005 \
     --env-file envs/.env.container hms-commerce:dev
   curl -fsS http://localhost:5005/health/live
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
