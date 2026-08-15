<div align="center">

## MULTI-HOSPITAL HOSPITAL MANAGEMENT SYSTEM

A queue-first hospital platform.

Most HMS products are record-keeping systems that happen to have a waiting room.<br/>
**This one is a waiting-room product that happens to keep records.**

Check-in · Token · Live Queue · Patient Sheet · Consultation · Prescription · Billing · Pharmacy · Laboratory

</div>

## STATUS

Design and documentation complete. Implementation starts at Phase 0. See [RECORD.md](RECORD.md) for what is done and what is not.

## THE PROMISE

| PROMISE | METRIC |
| ------- | ------ |
| The patient knows their queue position on their phone | Under 2 seconds end to end, p95 |
| The patient is warned before their turn | Push at N tokens away, default 3 |
| The doctor has read the patient before the patient sits down | Patient sheet on screen before the door opens |
| The patient leaves with everything digital | Prescription and invoice PDFs before they exit |

## DOCUMENTATION

The full set lives in [`docs/`](../docs/).

| DOCUMENT | ANSWERS |
| -------- | ------- |
| [product-scope.md](../docs/product-scope.md) | What are we building, for whom, to what quality bar |
| [features.md](../docs/features.md) | What each role gets |
| [traceability.md](../docs/traceability.md) | Source of truth: feature, service, event, phase, task id |
| [role-checklist.md](../docs/role-checklist.md) | 449 trackable tasks with stable ids |
| [architecture.md](../docs/architecture.md) | Services, ownership, data rules, events, security |
| [tech-stack.md](../docs/tech-stack.md) | What we use, why that, what we rejected |
| [portability.md](../docs/portability.md) | Running on AWS and without AWS, same code |
| [developer.md](../docs/developer.md) | Compose, kind, minikube, Helm, Terraform, CI/CD |
| [plan.md](../docs/plan.md) | Phases, capacity, exit criteria, risks |
| [Synopsis/](../docs/Synopsis/) | Academic project synopsis, LaTeX and PDF |

Contributors and agents read [RULES.md](RULES.md) before touching anything.

## ARCHITECTURE IN ONE TABLE

Eight deployable services, each with its own Dockerfile and image.

| SERVICE | PORT | OWNS |
| ------- | ---- | ---- |
| `gateway` | 4000 | Routing, JWT verification, header stripping, rate limiting, WebSocket fanout |
| `identity` | 5001 | Users, credentials, roles, sessions, devices, OTP, JWT signing |
| `directory` | 5002 | Hospitals, departments, rooms, doctors, schedules, attendance, leave, fees |
| `scheduling` | 5003 | Appointments, waitlists, queue tokens, priority, consultation state |
| `clinical` | 5004 | Patient records, consultation content, prescriptions, lab orders and results, consent |
| `commerce` | 5005 | Billing, invoices, payments, pharmacy, inventory, dispensing |
| `comms` | 5006 | In-app, push, SMS, email, WhatsApp, templates, preferences |
| `ai` | 5007 | Agents, memory, tool execution, evaluations |

`gateway` is the only publicly exposed service. Everything else is `ClusterIP`.

## STACK

TypeScript everywhere. Node.js 22, pnpm workspaces, Turborepo, Fastify, zod, Prisma, PostgreSQL 16, Redis 7, RabbitMQ, MinIO. Next.js 15 on web, Expo SDK 54 on mobile, electron-vite on desktop. Docker, Kubernetes, Helm, Terraform, GitHub Actions.

Full reasoning and rejected alternatives in [tech-stack.md](../docs/tech-stack.md).

## DEPLOYMENT PROFILES

Same commit, four ways to run it. Kubernetes profiles use the per-service images; Compose profiles use the all-in-one.

| PROFILE | RUNS ON | FOR |
| ------- | ------- | --- |
| `local` | Docker Compose on a laptop | Development |
| `single-host` | Docker Compose on one VM | One-hospital pilot, disaster recovery |
| `portable` | Any conformant Kubernetes | Self-hosting customers, CI |
| `aws` | EKS with RDS, ElastiCache, S3 | Our hosted service |

`portable` is the default. `aws` is a set of overrides on top of it. Patient data never has to leave a hospital's own infrastructure. See [portability.md](../docs/portability.md).

## THE FOUR RULES

1. **TENANCY IS EXPLICIT.** Users and patients are global. Everything about a visit is hospital-scoped and carries `hospitalId`.
2. **AI NEVER CREATES CLINICAL TRUTH.** Clinical facts come from the owning service at request time, and every AI clinical write passes a human signature recorded in the audit log.
3. **THE GATEWAY IS THE ONLY PUBLIC SURFACE AND THE ONLY IDENTITY SOURCE.** Every service also verifies the JWT itself.
4. **NO COMPONENT DEPENDS ON ONE CLOUD.** Every infrastructure dependency sits behind an interface with an AWS and a non-AWS implementation, and the non-AWS path runs in CI.

## GETTING STARTED

```bash
git clone <repo> atelier-health && cd atelier-health
pnpm install
cp envs/.env.example envs/.env.development

pnpm deps:up      # postgres, redis, rabbitmq, minio, mailpit
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Full instructions, including kind, minikube, Helm, and Terraform: [developer.md](../docs/developer.md).

## TEAM

| ROLL NO | NAME |
| ------- | ---- |
| 01 | Aarsh Vaidya |
| 03 | Abhay Mishra |
| 22 | Aryan Bokde |
| 28 | Bhuvnesh Verma |

Guide: Prof. Abhinay Gudadhe
