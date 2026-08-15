# apps

Everything that is deployed. Eight backend services and three clients.

## Services

All eight build from **one image** (`docker/Dockerfile`); the `SERVICE` environment variable selects which one boots. That is why there is no per-service `Dockerfile` here.

| Folder | Port | Postgres schema |
|---|---|---|
| `gateway` | 4000 | none |
| `identity` | 5001 | `identity` |
| `directory` | 5002 | `directory` |
| `scheduling` | 5003 | `scheduling` |
| `clinical` | 5004 | `clinical` |
| `commerce` | 5005 | `commerce` |
| `comms` | 5006 | `comms` |
| `ai` | 5007 | `ai` |

## Clients

| Folder | Stack | Who |
|---|---|---|
| `web` | Next.js 15, one app with role route groups | Patients, doctors, administrators |
| `mobile` | Expo SDK 54 | Patients only |
| `desktop` | electron-vite | Hospital staff |

## Rules

- **A service owns its schema and reads no other.** Cross-domain reads go through the owning service's API.
- Structure by business domain, never by technical layer. `src/modules/appointment/`, not `src/controllers/`.
- One web app and one desktop app, not one per role. Route groups and window modes already give per-role separation without duplicating auth, routing and the component library.

See [`docs/architecture.md`](../docs/architecture.md).
