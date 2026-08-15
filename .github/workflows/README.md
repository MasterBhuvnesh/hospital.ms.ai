# WORKFLOWS

GitHub Actions. Five workflows, each with one job.

| WORKFLOW | TRIGGER | DOES |
| -------- | ------- | ---- |
| `pr.yml` | Every pull request | install, lint, typecheck, **test**, contract validation, portability gates, docker build with no push. Required to merge |
| `main.yml` | Merge to `main` | Build and tag by git SHA, push to Docker Hub, deploy to `hms-dev`, **deploy the portable profile to kind and run the loop smoke test** |
| `release.yml` | Tag `v*` | Promote the **same digest** to staging, run the migration Job, run integration tests, promote to production, record deployment metadata |
| `desktop.yml` | Tag `desktop-v*` | Build and **sign** Windows and macOS artifacts, publish to the update feed |
| `mobile.yml` | Tag `mobile-v*` | EAS build, submit, and `eas update` |

## THE THREE RULES

**1. Tests are a required check.** The previous version of this project had CI that never ran a test. `pnpm test` in `pr.yml` is not optional.

**2. Release never rebuilds.** `release.yml` moves the digest that already passed CI. Promoting a rebuild means testing something other than what you ship.

**3. The portable deploy is the portability gate.** `main.yml` deploys the `portable` profile to a kind cluster with in-cluster Postgres, Redis, RabbitMQ and MinIO, then drives the loop. Everything written about cloud independence is documentation; this job is the test. If it breaks, cloud independence has broken.

## REGISTRIES

Docker Hub is active. The ECR job is **written and commented out in place**, not deleted, so enabling it later is uncommenting rather than authoring. Images are tagged by git SHA, never `latest`, because `latest` makes "what is actually running?" unanswerable during an incident.

## CLIENT PIPELINES

`desktop.yml` and `mobile.yml` are tag-triggered so a client release is deliberate rather than a side effect of merging.
