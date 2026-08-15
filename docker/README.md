# docker

Container images and Compose stacks.

| File or folder | Purpose |
|---|---|
| `Dockerfile` | **The image.** All eight services, `SERVICE` selects the entrypoint |
| `Dockerfile.service` | Optional per-service build. **Not wired into CI, Helm or Compose** |
| `Dockerfile.web` | The Next.js application |
| `rabbitmq/` | RabbitMQ with the delayed-message plugin |
| `compose/` | Dependency, development and single-host stacks |

## Why one image

One build, one push, one digest per commit, so all eight services in an environment are provably the same code. One CI pipeline instead of eight, and rollback is a single tag change.

The cost is that every service's dependencies ship everywhere and any service change rebuilds the shared image. At eight services that is the right trade. At thirty it would not be, and that is the signal to revisit.

`Dockerfile.service` exists for the day one service needs genuine dependency isolation. Nothing depends on it today, so do not assume it is in use.
