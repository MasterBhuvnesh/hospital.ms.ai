# packages/config

Shared configuration and environment loading.

Holds the tsconfig, ESLint and Prettier bases that every workspace extends, plus the environment loader.

The loader reads `envs/.env.${APP_ENV}` and validates the result through a zod schema. **A service that boots with a missing or malformed key must fail immediately at startup**, not 404 at 3pm on a clinic day.

`NODE_ENV` stays a build concern. `APP_ENV` is the deployment concern (`development`, `testing`, `container`, `production`). They are separate on purpose.

Imported as `@hms/config`.
