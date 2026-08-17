# envs

One environment file per deployment context. **Only `.env.example` is committed.**

[**CATALOGUE.md**](CATALOGUE.md) is the reference: every key, who reads it, which profile needs it, and which values have to be obtained from a third party rather than generated. Start there.

| File | Context |
|---|---|
| `.env.example` | The template. Every key, fake values. **The only file in git** |
| `.env.development` | Local native development |
| `.env.testing` | Test runs and CI. Throwaway database, provider stubs |
| `.env.container` | Compose and Kubernetes. Service DNS names |
| `.env.production` | Real cluster. Placeholders only; real values arrive as secrets |

## How selection works

`APP_ENV` chooses the file, defaulting to `development`. `packages/config` loads it and validates through a zod schema, so **a service with a missing or malformed key fails at startup rather than at 3pm on a clinic day**.

`NODE_ENV` stays a build concern. `APP_ENV` is the deployment concern. They are separate on purpose and must not be conflated.

## Rules

- Never commit a real value. `.gitignore` covers `envs/.env.*` with an exception for the example.
- **Never print a secret value** into a terminal, a log or a transcript. Print key names and value lengths instead.
- CI fails if a service reads a key absent from `.env.example`. That check is what keeps the example honest.
- No `AWS_*` key appears in any service's configuration. Cloud credentials exist only where External Secrets talks to a secret store, which is infrastructure rather than application config.
