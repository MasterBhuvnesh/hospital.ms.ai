# packages/db

Prisma client factory and the tenancy-scoped repository base.

Each service owns one Postgres schema and connects with `?schema=<name>`. **No service reads another service's tables.**

The repository base applies `hospitalId` scoping. **That is not a route handler's job**, because a handler that forgets it is a cross-tenant data leak rather than a bug.

See `docs/architecture.md` section 5.2 for exactly which entities are global and which are hospital-scoped.

Imported as `@hms/db`.
