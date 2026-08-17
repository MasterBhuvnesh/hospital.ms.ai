# packages/db

Prisma client factory and the tenancy-scoped repository base.

Each service owns one Postgres schema and connects with `?schema=<name>`. **No service reads another service's tables.**

The repository base applies `hospitalId` scoping. **That is not a route handler's job**, because a handler that forgets it is a cross-tenant data leak rather than a bug.

See `docs/architecture.md` section 5.2 for exactly which entities are global and which are hospital-scoped.

## A factory, never a module-level singleton

**Several services can run in one process.** The all-in-one image does exactly that in the single-host deployment ([`developer.md` section 0](../../docs/developer.md)), so a client created once at module load and keyed off `process.env.SERVICE` would hand `clinical` the `scheduling` schema.

So the export is `clientFor(schema)`, and the caller names its own schema. Nothing here reads `SERVICE`.

This is cheap now and a refactor across eight services later, which is why it is written down before the first line of the implementation.

The same applies to the pool: `DATABASE_POOL_MAX` is per client, so a single process running seven services opens seven pools. Size it against the database's connection limit, not against one service.

## Two URLs when Postgres is managed

`DATABASE_URL` is the runtime endpoint. `DIRECT_URL` is set only when the runtime endpoint is a connection pooler, which every managed Postgres uses by default, and migrations use it because Prisma migrations and prepared statements do not survive a pooler in transaction mode. Empty against the local container.

Imported as `@hms/db`.
