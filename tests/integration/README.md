# tests/integration

Vitest with Testcontainers, against **real** Postgres, Redis and RabbitMQ. Not mocks: the failures worth catching here are the ones mocks hide, such as constraint violations, transaction behaviour and redelivery.

## The security suite

`security/` holds the eight negative cases from [`docs/architecture.md`](../../docs/architecture.md) section 7.1. Each is a requirement, not a suggestion:

- A forged `x-user-role: ADMIN` header is rejected
- Patient A requesting Patient B's appointment receives 403
- A doctor with no active consultation and no grant receives 403
- A hospital admin reading clinical content without break-glass receives 403
- A platform admin reading clinical content receives 403, break-glass or not
- A non-gateway service is unreachable from outside the cluster
- An expired or reused refresh token revokes the whole family
- A lab result that is entered but not verified is invisible to the patient
