# packages/config

Shared configuration and environment loading.

Holds the tsconfig, ESLint and Prettier bases that every workspace extends, plus the environment loader.

The loader reads `envs/.env.${APP_ENV}` and validates the result through a zod schema. **A service that boots with a missing or malformed key must fail immediately at startup**, not 404 at 3pm on a clinic day.

`NODE_ENV` stays a build concern. `APP_ENV` is the deployment concern (`development`, `testing`, `container`, `production`). They are separate on purpose.

## Validate per service, not once per process

**Several services can run in one process.** The all-in-one image does exactly that in the single-host deployment ([`developer.md` section 0](../../docs/developer.md)).

So the loader takes the calling service's schema and returns that service's validated view of a shared environment. A single validated singleton would either reject a key that only `ai` needs, or accept a missing key that `clinical` requires, depending on which of the two got there first.

The environment is shared. The schema against which it is validated is not.

Imported as `@hms/config`.
