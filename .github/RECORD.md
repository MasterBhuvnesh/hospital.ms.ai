# RECORD

Implementation record for Atelier Health. Each row is a feature, so any person or agent can see what is done and what is not. Update this table whenever a feature changes state and commit it with the change.

Developer names are written in capitals (BHUVNESH, AARSH, ABHAY, ARYAN, or the relevant person).

Status values: PLANNED, IN PROGRESS, DONE, BLOCKED, DROPPED.
Date is the date the status last changed, in DD-MM-YYYY.

Phase and task ids come from [`docs/traceability.md`](../docs/traceability.md) and [`docs/role-checklist.md`](../docs/role-checklist.md).

## PROCESS AND REPOSITORY

| FEATURE | DEVELOPER | STATUS | DATE |
| ------- | --------- | ------ | ---- |
| Project documentation set under `docs` (10 documents, 3799 lines) | BHUVNESH | DONE | 15-08-2026 |
| `.github` folder with README, RULES and RECORD | BHUVNESH | DONE | 15-08-2026 |
| Academic synopsis in LaTeX with built PDF under `docs/Synopsis` | BHUVNESH | DONE | 15-08-2026 |
| Naming settled: product Atelier Health, repo `atelier-health`, scope `@hms/*`, images `hms-<service>` and `hms-platform` | BHUVNESH | DONE | 15-08-2026 |
| Review of the first documentation draft, 10 critical findings raised and closed | BHUVNESH | DONE | 15-08-2026 |
| pnpm workspace and Turborepo initialised | BHUVNESH | PLANNED | 15-08-2026 |
| Repository conventions: lint, format, commit hooks | BHUVNESH | PLANNED | 15-08-2026 |
| Service application template | BHUVNESH | PLANNED | 15-08-2026 |
| Env files: `.env.example` plus development, testing, container, production | BHUVNESH | PLANNED | 15-08-2026 |

## ARCHITECTURE DECISIONS

| FEATURE | DEVELOPER | STATUS | DATE |
| ------- | --------- | ------ | ---- |
| Eight deployable services confirmed, thirteen domains merged | BHUVNESH | DONE | 15-08-2026 |
| Consultation boundary settled: `scheduling` owns state, `clinical` owns content | BHUVNESH | DONE | 15-08-2026 |
| Tenancy settled: users and patients global, visits hospital-scoped | BHUVNESH | DONE | 15-08-2026 |
| Per-service images primary, all-in-one retained for Compose, single-host and recovery | BHUVNESH | DONE | 15-08-2026 |
| RabbitMQ self-hosted on every profile, Amazon MQ rejected for plugin support | BHUVNESH | DONE | 15-08-2026 |
| BullMQ dropped, delayed work moved onto the RabbitMQ delayed-message exchange | BHUVNESH | DROPPED | 15-08-2026 |
| Waiting-room TV and queue-display board removed from v1 | BHUVNESH | DROPPED | 15-08-2026 |
| Release order changed: Commerce (P3) now precedes AI (P4), MVP is P0 to P3 | BHUVNESH | DONE | 15-08-2026 |
| Prescription signature defined as an attestation with a SHA-256 content hash | BHUVNESH | DONE | 15-08-2026 |
| Break-glass defined for administrative clinical access | BHUVNESH | DONE | 15-08-2026 |
| Event catalogue completed, 26 events with publishers, consumers and actions | BHUVNESH | DONE | 15-08-2026 |
| Verify that Amazon MQ cannot install the delayed-message plugin | BHUVNESH | PLANNED | 15-08-2026 |

## PORTABILITY AND CLOUD INDEPENDENCE

| FEATURE | DEVELOPER | STATUS | DATE |
| ------- | --------- | ------ | ---- |
| Four deployment profiles defined: local, single-host, portable, aws | BHUVNESH | DONE | 15-08-2026 |
| Capability matrix, 22 dependencies each with an AWS and a non-AWS implementation | BHUVNESH | DONE | 15-08-2026 |
| `packages/platform` interfaces (storage, secrets, email, sms, push, whatsapp, payments, llm) | BHUVNESH | PLANNED | 15-08-2026 |
| `packages/platform-generic` implementations over S3 API, SMTP and HTTP | BHUVNESH | PLANNED | 15-08-2026 |
| `packages/platform-aws` isolated, the only package permitted an AWS SDK | BHUVNESH | PLANNED | 15-08-2026 |
| ESLint gate blocking cloud SDK imports outside `platform-aws` | BHUVNESH | PLANNED | 15-08-2026 |
| `check-portable-chart.sh` rejecting AWS strings in the rendered base chart | BHUVNESH | PLANNED | 15-08-2026 |
| CI job deploying the portable profile to kind on every merge | BHUVNESH | PLANNED | 15-08-2026 |
| Terraform split into `modules/kubernetes` and `modules/aws` | BHUVNESH | PLANNED | 15-08-2026 |
| Helm values files for the portable and aws profiles | BHUVNESH | PLANNED | 15-08-2026 |

## INFRASTRUCTURE

| FEATURE | DEVELOPER | STATUS | DATE |
| ------- | --------- | ------ | ---- |
| Per-service `Dockerfile` in each of the eight services | BHUVNESH | DONE | 15-08-2026 |
| `docker/Dockerfile`, the all-in-one image for Compose and recovery | BHUVNESH | PLANNED | 15-08-2026 |
| CI builds nine images from one commit, all on the same git SHA | BHUVNESH | PLANNED | 15-08-2026 |
| `docker/rabbitmq` image with the delayed-message plugin | BHUVNESH | PLANNED | 15-08-2026 |
| Compose dependency stack: Postgres, Redis, RabbitMQ, MinIO, Mailpit | BHUVNESH | PLANNED | 15-08-2026 |
| MinIO private bucket initialisation | BHUVNESH | PLANNED | 15-08-2026 |
| `compose.single-host.yml` for the no-Kubernetes deployment | BHUVNESH | PLANNED | 15-08-2026 |
| Helm chart, one chart rendering all services from a values list | BHUVNESH | PLANNED | 15-08-2026 |
| `scripts/k8s/kind-up.sh` including secret creation and pinned chart versions | BHUVNESH | PLANNED | 15-08-2026 |
| `pr.yml` with lint, typecheck, tests and the portability gates | BHUVNESH | PLANNED | 15-08-2026 |
| `main.yml` publishing to Docker Hub, ECR job written and commented out | BHUVNESH | PLANNED | 15-08-2026 |
| `release.yml` promoting the same image digest, never rebuilding | BHUVNESH | PLANNED | 15-08-2026 |
| Prometheus, Grafana, Loki and Tempo, self-hosted on every profile | BHUVNESH | PLANNED | 15-08-2026 |

## SHARED PACKAGES

| FEATURE | DEVELOPER | STATUS | DATE |
| ------- | --------- | ------ | ---- |
| `packages/contracts`, zod schemas as the single contract source | BHUVNESH | PLANNED | 15-08-2026 |
| `packages/config`, `APP_ENV` loader with zod validation at boot | BHUVNESH | PLANNED | 15-08-2026 |
| `packages/logger`, pino with PHI redaction paths | BHUVNESH | PLANNED | 15-08-2026 |
| `packages/middleware`, auth, error, validation, correlation id | BHUVNESH | PLANNED | 15-08-2026 |
| `packages/db`, Prisma factory with tenancy-scoped repository base | BHUVNESH | PLANNED | 15-08-2026 |
| `packages/events`, RabbitMQ envelope, publish, consume, delayed publish | BHUVNESH | PLANNED | 15-08-2026 |
| `packages/auth`, JWT sign and verify, RBAC, ownership, break-glass | BHUVNESH | PLANNED | 15-08-2026 |
| `packages/pdf`, prescription, invoice and lab report templates with Noto Devanagari | BHUVNESH | PLANNED | 15-08-2026 |
| `packages/ui`, React components shared by web and the desktop renderer | BHUVNESH | PLANNED | 15-08-2026 |
| `packages/api-client`, typed client generated from contracts | BHUVNESH | PLANNED | 15-08-2026 |

## BACKEND SERVICES

| FEATURE | DEVELOPER | STATUS | DATE |
| ------- | --------- | ------ | ---- |
| `gateway`: routing, JWT verification, `x-user-*` header stripping, rate limiting, WS upgrade | BHUVNESH | PLANNED | 15-08-2026 |
| `identity`: users, roles, sessions, refresh rotation, argon2id, device registration | BHUVNESH | PLANNED | 15-08-2026 |
| `identity`: SMS OTP delivery, blocking patient login until it exists | BHUVNESH | PLANNED | 15-08-2026 |
| `directory`: hospitals, departments, rooms, doctors, schedules, attendance, leave | BHUVNESH | PLANNED | 15-08-2026 |
| `directory`: availability computed from schedule, attendance and leave | BHUVNESH | PLANNED | 15-08-2026 |
| `scheduling`: appointments, waitlists, rescheduling, cancellation | BHUVNESH | PLANNED | 15-08-2026 |
| `scheduling`: queue tokens with a unique constraint and sequence generation | BHUVNESH | PLANNED | 15-08-2026 |
| `scheduling`: priority ordering and consultation state machine | BHUVNESH | PLANNED | 15-08-2026 |
| `clinical`: patient records, allergies, conditions, medications | BHUVNESH | PLANNED | 15-08-2026 |
| `clinical`: deterministic patient sheet generation | BHUVNESH | PLANNED | 15-08-2026 |
| `clinical`: consultation content, SOAP notes, signed prescriptions | BHUVNESH | PLANNED | 15-08-2026 |
| `clinical`: consent grants and revocation | BHUVNESH | PLANNED | 15-08-2026 |
| `clinical`: laboratory orders, results and the verification workflow | BHUVNESH | PLANNED | 15-08-2026 |
| `commerce`: billing, invoices, Razorpay orders and webhook verification | BHUVNESH | PLANNED | 15-08-2026 |
| `commerce`: pharmacy catalog, inventory and transactional dispensing | BHUVNESH | PLANNED | 15-08-2026 |
| `comms`: in-app, push, SMS, email channels behind one `notify` entry point | BHUVNESH | PLANNED | 15-08-2026 |
| `comms`: WhatsApp Business Cloud API and per-category preferences | BHUVNESH | PLANNED | 15-08-2026 |
| `ai`: agents, pgvector memory, typed tools, evaluation harness | BHUVNESH | PLANNED | 15-08-2026 |

## CLIENTS

| FEATURE | DEVELOPER | STATUS | DATE |
| ------- | --------- | ------ | ---- |
| `apps/web`: one Next.js app with patient, doctor and admin route groups | BHUVNESH | PLANNED | 15-08-2026 |
| `apps/mobile`: Expo patient app with the live queue screen | BHUVNESH | PLANNED | 15-08-2026 |
| `apps/mobile`: push notifications, Android channels and deep links | BHUVNESH | PLANNED | 15-08-2026 |
| `apps/mobile`: EAS Update OTA, applied on next cold start only | BHUVNESH | PLANNED | 15-08-2026 |
| `apps/desktop`: scaffolded with `pnpm create @quick-start/electron`, React template | BHUVNESH | PLANNED | 15-08-2026 |
| `apps/desktop`: reception module with intake, tokens and queue control | BHUVNESH | PLANNED | 15-08-2026 |
| `apps/desktop`: doctor module with queue, patient sheet and consultation | BHUVNESH | PLANNED | 15-08-2026 |
| `apps/desktop`: thermal token printing over ESC/POS with a browser fallback | BHUVNESH | PLANNED | 15-08-2026 |
| `apps/desktop`: offline read cache and write replay with idempotency keys | BHUVNESH | PLANNED | 15-08-2026 |
| `apps/desktop`: signed auto-update, applied on quit, staged rollout | BHUVNESH | PLANNED | 15-08-2026 |
| `apps/desktop`: nurse, pharmacy and laboratory modules | BHUVNESH | PLANNED | 15-08-2026 |

## TESTING AND QUALITY

| FEATURE | DEVELOPER | STATUS | DATE |
| ------- | --------- | ------ | ---- |
| Vitest unit suite per service | BHUVNESH | PLANNED | 15-08-2026 |
| Testcontainers integration suite against real Postgres, Redis and RabbitMQ | BHUVNESH | PLANNED | 15-08-2026 |
| The eight required authorization negative tests | BHUVNESH | PLANNED | 15-08-2026 |
| Playwright: patient booking flow and reception intake flow | BHUVNESH | PLANNED | 15-08-2026 |
| The loop test: walk-in through token, sheet, consultation, invoice, payment, dispense | BHUVNESH | PLANNED | 15-08-2026 |
| k6 load test at 500 concurrent queue watchers per hospital | BHUVNESH | PLANNED | 15-08-2026 |
| AI evaluation harness gated on allergy and current-medication recall | BHUVNESH | PLANNED | 15-08-2026 |

## EXTERNAL DEPENDENCIES WITH LEAD TIME

These block other work and were started before implementation.

| FEATURE | DEVELOPER | STATUS | DATE |
| ------- | --------- | ------ | ---- |
| SMS provider selection and DLT template registration, blocks patient login | BHUVNESH | PLANNED | 15-08-2026 |
| WhatsApp Business API application, needed by P5, applied for in P0 | BHUVNESH | PLANNED | 15-08-2026 |
| Hosting decision for the managed service, needed before P0 provisions it | BHUVNESH | PLANNED | 15-08-2026 |
| Windows EV code-signing certificate purchase, blocks desktop auto-update | BHUVNESH | PLANNED | 15-08-2026 |
| Razorpay account, KYC and settlement configuration, needed before P3 | BHUVNESH | PLANNED | 15-08-2026 |
| ABDM and ABHA integration evaluation, deferred until after the MVP | BHUVNESH | PLANNED | 15-08-2026 |
