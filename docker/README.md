# docker

Container images and Compose stacks.

## Two image strategies, both real

| Strategy | Where the Dockerfile lives | Produces | Used by |
|---|---|---|---|
| **Per-service** | `apps/<service>/Dockerfile` | `hms-gateway`, `hms-identity`, `hms-directory`, `hms-scheduling`, `hms-clinical`, `hms-commerce`, `hms-comms`, `hms-ai` | **Kubernetes, every environment** |
| **All-in-one** | `docker/Dockerfile` | `hms-platform` | Compose, single-host, disaster recovery, offline pilots, CI smoke |

Both are built from the same commit in the same CI run and **tagged with the same git SHA**. That is what keeps the property worth having: an environment is provably running one commit, whichever strategy deployed it.

## Per-service is primary

Each service owns its Dockerfile, so each gets:

- **Its own dependency graph.** The build prunes to that service alone, so `gateway` does not ship Prisma and `identity` does not ship the PDF renderer.
- **Its own image, tag, rollback and scaling lifecycle.** A `scheduling` hotfix does not rebuild or restart the other seven.
- **Room to diverge.** `clinical` embeds the fonts its PDF templates need, `ai` can add whatever its model client requires, and none of that leaks into the other images.
- **A smaller blast radius.** A CVE in a dependency of one service is a rebuild of one image.

Build from the **repository root**, never from the service directory, because the build needs the workspace manifests and the shared packages:

```bash
docker build -f apps/scheduling/Dockerfile -t hms-scheduling:$(git rev-parse --short HEAD) .
```

## The all-in-one image

`docker/Dockerfile` contains every service, with `SERVICE` selecting which one boots:

```bash
docker run -e SERVICE=scheduling -e PORT=5003 --env-file envs/.env.container hms-platform:$SHA
```

It exists for the deployments where eight images are the wrong shape:

- **Compose and `single-host`.** A one-hospital customer with one Linux box pulls one image, not eight.
- **Disaster recovery.** Kubernetes is unavailable and the platform must come up on a plain VM.
- **Offline pilots.** One `docker save` onto a USB stick.
- **CI smoke.** Prove all eight services boot from one digest.

It is a **first-class deliverable, not a fallback experiment.** It ships from every commit and is exercised in CI.

## Files

| File or folder | Purpose |
|---|---|
| `Dockerfile` | The all-in-one image, `SERVICE` selects the entrypoint |
| `Dockerfile.web` | The Next.js application |
| `rabbitmq/` | RabbitMQ with the delayed-message plugin |
| `compose/` | Dependency, development and single-host stacks |

Per-service Dockerfiles are **not** here. They live next to the service they build, in `apps/<service>/Dockerfile`, because that is where someone changing the service will look for it.
