# tests

Cross-service tests. Unit tests live beside the code they test, inside each service.

| Folder | Scope | Tool |
|---|---|---|
| `integration` | Service boundaries against real dependencies | Vitest plus Testcontainers |
| `e2e` | Full user journeys through the running system | Playwright |
| `performance` | Load and soak | k6 |

## The one test that must always pass

`e2e/loop.spec.ts`: walk-in, token, mobile update, doctor call, patient sheet, consultation, prescription, invoice, payment, dispense.

If that breaks, the product is broken, whatever else is green.
