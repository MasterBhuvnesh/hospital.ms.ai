# apps/ai/prisma

The `ai` Postgres schema. **This service owns these tables exclusively.**

## Rules

- **No service reads another service's tables.** Cross-domain reads go through the owning service's API. This is the boundary that lets a schema move to its own cluster later with a connection-string change and no application change.
- Hospital-scoped tables carry `hospitalId`, indexed, applied in the repository layer. See [`docs/architecture.md`](../../../docs/architecture.md) section 5.2 for exactly which entities are global and which are not.
- No RDS-only extension and no Aurora-only SQL. The schema must apply cleanly to a plain `postgres:16` container, or the portable profile breaks.
- Migrations run as a Helm `pre-upgrade` Job, **never on service startup**.
