# tests/e2e

Playwright, against a running stack.

## The loop test

`loop.spec.ts` drives the whole product: a walk-in registered at reception produces a token, the token appears on the patient's phone within two seconds, advancing the queue updates the position and fires the near-turn push, the patient sheet reaches the doctor's screen, the consultation produces a signed prescription, the invoice is generated and paid, and the medicine dispenses with stock decremented exactly once.

Required before any merge that touches `scheduling`, `clinical` or `commerce`.

## The two web flows

1. **Patient booking:** search, select a doctor, book, confirm, watch the live queue position change.
2. **Reception intake:** register a walk-in, generate a token, call next, skip, recall, confirm the audit entries.
