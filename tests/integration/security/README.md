# tests/integration/security

The authorization negative tests. **Each one is a requirement, not a suggestion.**

A passing test proves a feature works. These prove that something does **not** work, which is the only kind of proof that matters for access control.

| # | Must fail |
|---|---|
| 1 | A forged `x-user-role: ADMIN` header is accepted |
| 2 | Patient A reads Patient B's appointment |
| 3 | A doctor with no active consultation and no grant reads a patient record |
| 4 | A hospital admin reads clinical content without break-glass |
| 5 | A platform admin reads clinical content, with or without break-glass |
| 6 | A non-gateway service is reachable from outside the cluster |
| 7 | An expired or reused refresh token still works |
| 8 | A lab result that is entered but not verified is visible to the patient |

Numbers 2 and 3 are the IDOR class that kills healthcare products: `/api/appointments?patientId=<anyone>`. Number 1 is the reason the gateway strips inbound identity headers.

Source: [`docs/architecture.md`](../../../docs/architecture.md) section 7.1.
