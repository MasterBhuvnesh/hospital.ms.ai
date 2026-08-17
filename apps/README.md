# apps

Everything that is deployed. Eight backend services and three clients.

## Services

**Each service owns its `Dockerfile`**, producing `hms-<service>`. They are also all included in the all-in-one image (`docker/Dockerfile`), which boots one of them by `SERVICE`. Both are built from the same commit and tagged with the same git SHA.

Each service README states its goal, the capabilities it must have, the conditions it must satisfy, and what it is and is not allowed to own. Read that before writing code in one.

| Folder | Port | Postgres schema | Goal in one line |
|---|---|---|---|
| [`gateway`](gateway/README.md) | 4000 | none | Be the single front door, and be boring |
| [`identity`](identity/README.md) | 5001 | `identity` | Answer who this person is, authoritatively |
| [`directory`](directory/README.md) | 5002 | `directory` | Hold what exists here and who is available when |
| [`scheduling`](scheduling/README.md) | 5003 | `scheduling` | Run the queue. This is the product |
| [`clinical`](clinical/README.md) | 5004 | `clinical` | Hold the medical truth, and control who may see it |
| [`commerce`](commerce/README.md) | 5005 | `commerce` | Take money correctly and account for stock honestly |
| [`comms`](comms/README.md) | 5006 | `comms` | Be the only thing that talks to a patient |
| [`ai`](ai/README.md) | 5007 | `ai` | Assist without becoming a source of clinical truth |

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
