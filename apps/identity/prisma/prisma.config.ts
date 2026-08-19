import { defineConfig } from 'prisma/config';

/**
 * Connection URL for the `identity` schema, used by the Prisma CLI only:
 * `generate`, `migrate`, `db pull`. Nothing at runtime reads this file.
 *
 * It lives here rather than in schema.prisma because Prisma 7 rejects `url` and
 * `directUrl` in a schema file: "The datasource property `url` is no longer
 * supported in schema files."
 *
 * Prisma discovers this file relative to the current working directory, and the
 * commands that need it run from `packages/db` and from the Docker build
 * context, so both pass `--config` explicitly rather than relying on discovery.
 *
 * Prisma 7 has no `directUrl` here either: this datasource IS the migration
 * connection, so it takes DIRECT_URL. Every managed Postgres fronts the
 * database with a connection pooler and Prisma migrations do not survive one in
 * transaction mode. Against the local container there is no pooler and
 * DIRECT_URL equals DATABASE_URL, so the fallback costs nothing.
 */
export default defineConfig({
  schema: './schema.prisma',
  datasource: {
    url: process.env['DIRECT_URL'] ?? process.env['DATABASE_URL'] ?? '',
  },
});
