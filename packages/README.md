# packages

Shared libraries. Nothing here is deployed on its own.

| Package | Purpose |
|---|---|
| `contracts` | Zod schemas and inferred types. The spine |
| `config` | tsconfig, ESLint, Prettier bases, and the validated env loader |
| `logger` | pino with PHI redaction paths |
| `middleware` | auth, error, validation, correlation id |
| `db` | Prisma factory and the tenancy-scoped repository base |
| `events` | RabbitMQ publish, consume, envelope, delayed publish |
| `auth` | JWT, RBAC, ownership checks, break-glass |
| `pdf` | Prescription, invoice and lab report templates |
| `api-client` | Typed client generated from contracts |
| `ui` | React components shared by web and the desktop renderer |
| `platform` | Infrastructure interfaces. **Interfaces only** |
| `platform-generic` | Implementations that work everywhere, including AWS |
| `platform-aws` | The only package allowed to import an AWS SDK |

## The three platform packages

This split is what makes the system cloud-agnostic. Business code depends on `platform`, never on a vendor SDK. `platform-generic` covers every profile including `aws`. `platform-aws` exists only for capabilities with no portable equivalent, and a lint rule fails the build if a cloud SDK is imported anywhere else.

See [`docs/portability.md`](../docs/portability.md).
