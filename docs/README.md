# Atelier Health

Multi-hospital Hospital Management System. Documentation set.

The product exists to make one loop fast and legible:

```
Check-in → Token → Live Queue → Patient Sheet → Consultation → Prescription → Billing → Pharmacy → Lab
```

## Naming (one name per thing)

| Thing | Name |
|---|---|
| Product | Atelier Health |
| Repository | `atelier-health` |
| Package scope | `@hms/*` |
| Container image | `hms-platform` |
| Kubernetes namespaces | `hms-dev`, `hms-staging`, `hms-production` |
| Postgres schemas | one per service: `identity`, `directory`, `scheduling`, `clinical`, `commerce`, `comms`, `ai` |

Anything using a different name is a bug in that file.

## The documents

| Document | Audience | Answers |
|---|---|---|
| [product-scope.md](./product-scope.md) | Clients, PMs, stakeholders | What are we building, for whom, and to what quality bar? |
| [features.md](./features.md) | Everyone | What does each role get, and what does it mean? |
| [traceability.md](./traceability.md) | Everyone | **Source of truth.** Feature area, owning service, events, surfaces, phase, checklist IDs |
| [role-checklist.md](./role-checklist.md) | Devs, QA, PM | Trackable per-role implementation checklist with stable IDs |
| [architecture.md](./architecture.md) | Engineers | Services, ownership boundaries, data model rules, events, security |
| [tech-stack.md](./tech-stack.md) | Engineers, CTO | What we use, why that, and what we rejected |
| [portability.md](./portability.md) | Engineers, DevOps, buyers | How this runs on AWS and off AWS with the same code |
| [developer.md](./developer.md) | Engineers, DevOps | Running it: Compose, kind, minikube, Helm, Terraform, CI/CD |
| [plan.md](./plan.md) | Everyone | Phases, capacity, exit criteria, risks |
| [Synopsis/](./Synopsis/) | Academic review | Two-page project synopsis, LaTeX source and built PDF |

Repository conventions and the implementation record live in [`.github/`](../.github/): [RULES.md](../.github/RULES.md) and [RECORD.md](../.github/RECORD.md).

**When two documents disagree, [traceability.md](./traceability.md) wins** for phase and ownership, and [architecture.md](./architecture.md) wins for technical boundaries.

## Reading order

- **New stakeholder:** product-scope, then features
- **New engineer:** architecture, tech-stack, developer
- **New DevOps:** portability, developer
- **Starting work:** plan, traceability, role-checklist

## Locked decisions

| | |
|---|---|
| **Release boundary** | **MVP = P0 through P3.** Commerce ships before AI |
| Deployment profiles | `local`, `single-host`, `portable` (any Kubernetes), `aws`. Same image, same code |
| Cloud posture | **Cloud-agnostic by construction.** No cloud SDK outside `packages/platform-*`. CI proves it |
| Broker | RabbitMQ only, self-hosted (events *and* delayed work). No BullMQ, no Kafka, no Amazon MQ |
| Object storage | MinIO by default, any S3-compatible endpoint by configuration |
| Registry | Docker Hub active. ECR written and commented out |
| Image strategy | **Per-service images are primary** (`apps/<svc>/Dockerfile`), plus an all-in-one image for Compose, single-host and recovery. All nine tagged with the same git SHA |
| Desktop | electron-vite (`pnpm create @quick-start/electron`, React) |
| Auto-update | Desktop (electron-updater) and Android (EAS Update) |
| Notification channels | in-app, push, **SMS**, email, WhatsApp |
| Payments | Razorpay behind `PaymentProvider` |
| Environments | `.env.example` plus `development`, `testing`, `container`, `production` |
| Not building | Waiting-room TV board, video consults, IPD/ward, TPA adjudication |

## The four rules

1. **Tenancy is explicit.** Users and patients are global. Everything about a visit is hospital-scoped and carries `hospitalId`. See [architecture.md 5.2](./architecture.md).
2. **AI never creates clinical truth.** Clinical facts are fetched from the owning service at request time, and every AI clinical write passes a human signature recorded in the audit log.
3. **The gateway is the only public surface and the only identity source.** Everything else is `ClusterIP`, and every service verifies the JWT itself.
4. **No component may depend on one cloud.** Every infrastructure dependency sits behind an interface with at least one AWS and one non-AWS implementation, and the non-AWS path runs in CI. See [portability.md](./portability.md).
