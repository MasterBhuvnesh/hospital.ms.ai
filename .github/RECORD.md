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
| Service README completion rule and template | BHUVNESH | DONE | 15-08-2026 |
| Academic synopsis in LaTeX with built PDF under `docs/Synopsis` | BHUVNESH | DONE | 15-08-2026 |
| Naming settled: product Atelier Health, repo `atelier-health`, scope `@hms/*`, images `hms-<service>` and `hms-platform` | BHUVNESH | DONE | 15-08-2026 |
| Review of the first documentation draft, 10 critical findings raised and closed | BHUVNESH | DONE | 15-08-2026 |
| pnpm workspace and Turborepo initialised, 21 packages building | BHUVNESH | DONE | 17-08-2026 |
| Repository conventions: TypeScript base config, ESLint flat config, Prettier | BHUVNESH | DONE | 17-08-2026 |
| Commit hooks | BHUVNESH | PLANNED | 17-08-2026 |
| Per-service specification in each service README: goal, capabilities, conditions, boundaries | BHUVNESH | DONE | 17-08-2026 |
| Service application template | BHUVNESH | PLANNED | 15-08-2026 |
| `envs/.env.example` completed, and `envs/CATALOGUE.md` with per-profile requirements and the procurement list | BHUVNESH | DONE | 17-08-2026 |
| `scripts/dev/generate-jwt-keys.sh`, writes the RS256 pair without printing it | BHUVNESH | DONE | 17-08-2026 |
| `packages/config` and `packages/db` specified as per-service factories, because several services share one process | BHUVNESH | DONE | 17-08-2026 |
| `DIRECT_URL` for managed Postgres, since Prisma migrations do not survive a pooler | BHUVNESH | DONE | 17-08-2026 |
| Env files: development, testing, container, production, created from the example | BHUVNESH | PLANNED | 15-08-2026 |

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
| Plan re-baselined for a team of four: 34 weeks, full scope retained, no feature cut | BHUVNESH | DONE | 17-08-2026 |
| Four ownership tracks defined, and review rules for AI-assisted work | BHUVNESH | DONE | 17-08-2026 |
| Assign the four tracks to named people, and agree who reviews whom | BHUVNESH | PLANNED | 17-08-2026 |
| Prescription signature defined as an attestation with a SHA-256 content hash | BHUVNESH | DONE | 15-08-2026 |
| Break-glass defined for administrative clinical access | BHUVNESH | DONE | 15-08-2026 |
| Event catalogue completed, 26 events with publishers, consumers and actions | BHUVNESH | DONE | 15-08-2026 |
| Verify that Amazon MQ cannot install the delayed-message plugin | BHUVNESH | PLANNED | 15-08-2026 |
| Verify whether any managed AMQP provider can enable `rabbitmq_delayed_message_exchange` | BHUVNESH | PLANNED | 17-08-2026 |

## PORTABILITY AND CLOUD INDEPENDENCE

| FEATURE | DEVELOPER | STATUS | DATE |
| ------- | --------- | ------ | ---- |
| Four deployment profiles defined: local, single-host, portable, aws | BHUVNESH | DONE | 15-08-2026 |
| Capability matrix, 22 dependencies each with an AWS and a non-AWS implementation | BHUVNESH | DONE | 15-08-2026 |
| `packages/platform` interfaces (storage, secrets, email, sms, push, whatsapp, payments, llm) | BHUVNESH | PLANNED | 19-08-2026 |
| `packages/platform-generic` implementations over S3 API, SMTP and HTTP | BHUVNESH | PLANNED | 19-08-2026 |
| `packages/platform-aws` isolated, the only package permitted an AWS SDK | BHUVNESH | PLANNED | 19-08-2026 |
| ESLint gate blocking cloud SDK imports, repository-wide | BHUVNESH | DONE | 19-08-2026 |
| `check-portable-chart.sh` rejecting AWS strings in the rendered base chart | BHUVNESH | PLANNED | 15-08-2026 |
| CI job deploying the portable profile to kind on every merge | BHUVNESH | PLANNED | 15-08-2026 |
| Terraform split into `modules/kubernetes` and `modules/aws` | BHUVNESH | PLANNED | 15-08-2026 |
| Helm values files for the portable and aws profiles | BHUVNESH | PLANNED | 15-08-2026 |
| Deployment owned by BHUVNESH; every other developer runs the `local` profile only | BHUVNESH | DONE | 19-08-2026 |
| `local` profile, Compose on a laptop, the development environment | BHUVNESH | IN PROGRESS | 19-08-2026 |
| `single-host` profile, Compose on one VM, built once the backend is complete | BHUVNESH | PLANNED | 19-08-2026 |
| `portable` profile, built after `single-host` | BHUVNESH | PLANNED | 19-08-2026 |
| `aws` profile, overrides on `portable`, built last | BHUVNESH | PLANNED | 19-08-2026 |

## INFRASTRUCTURE

| FEATURE | DEVELOPER | STATUS | DATE |
| ------- | --------- | ------ | ---- |
| Per-service `Dockerfile` in each of the eight services | BHUVNESH | DONE | 15-08-2026 |
| `docker/Dockerfile`, the all-in-one image for Compose and recovery | BHUVNESH | DONE | 17-08-2026 |
| `docker/all-in-one.mjs`: `SERVICES` runs any subset of services in one process, discovering ports from `hms.port` | BHUVNESH | DONE | 17-08-2026 |
| CI builds nine images from one commit, all on the same git SHA | BHUVNESH | PLANNED | 15-08-2026 |
| `docker/rabbitmq` image with the delayed-message plugin, broker pinned to 4.2 | BHUVNESH | DONE | 17-08-2026 |
| Compose dependency stack: Postgres, Redis, RabbitMQ, MinIO, Mailpit | BHUVNESH | DONE | 17-08-2026 |
| MinIO private bucket initialisation | BHUVNESH | PLANNED | 15-08-2026 |
| `docker/compose/dev.yml`: one container per service, every port published for Postman | BHUVNESH | DONE | 17-08-2026 |
| `docker/compose/single-host.yml`: whole backend in one container, `ai` split to keep the queue off a busy event loop | BHUVNESH | DONE | 17-08-2026 |
| Six ways to run documented as two axes: where services run, where the data plane lives | BHUVNESH | DONE | 17-08-2026 |
| `migrate` one-shot Compose service, so no service races the migration | BHUVNESH | PLANNED | 17-08-2026 |
| TLS for the local Kubernetes mode, cert-manager with a self-signed issuer | BHUVNESH | PLANNED | 17-08-2026 |
| A secret store for `single-host`, rather than a plain env file on the host | BHUVNESH | PLANNED | 17-08-2026 |
| Postgres backup schedule, retention, and a rehearsed restore | BHUVNESH | PLANNED | 17-08-2026 |
| Helm chart, one chart rendering all services from a values list | BHUVNESH | PLANNED | 15-08-2026 |
| `scripts/k8s/kind-up.sh` including secret creation and pinned chart versions | BHUVNESH | PLANNED | 15-08-2026 |
| `pr.yml` with lint, typecheck, tests and the portability gates | BHUVNESH | PLANNED | 15-08-2026 |
| `main.yml` publishing to Docker Hub, ECR job written and commented out | BHUVNESH | PLANNED | 15-08-2026 |
| `release.yml` promoting the same image digest, never rebuilding | BHUVNESH | PLANNED | 15-08-2026 |
| Prometheus, Grafana, Loki and Tempo, local Compose stack with provisioned datasources | BHUVNESH | DONE | 17-08-2026 |
| Prometheus, Grafana, Loki and Tempo in the Helm chart, self-hosted on every profile | BHUVNESH | PLANNED | 17-08-2026 |
| Grafana dashboards and alert rules | BHUVNESH | PLANNED | 17-08-2026 |

## SHARED PACKAGES

| FEATURE | DEVELOPER | STATUS | DATE |
| ------- | --------- | ------ | ---- |
| `packages/contracts`, zod schemas as the single contract source | BHUVNESH | DONE | 18-08-2026 |
| `packages/config`, `APP_ENV` loader with zod validation at boot | BHUVNESH | DONE | 18-08-2026 |
| `packages/logger`, pino with PHI redaction paths | BHUVNESH | DONE | 18-08-2026 |
| `packages/middleware`, health and readiness probes | BHUVNESH | DONE | 18-08-2026 |
| `packages/middleware`, auth, error, validation, correlation id | BHUVNESH | PLANNED | 19-08-2026 |
| `packages/db`, Prisma factory with tenancy-scoped repository base | BHUVNESH | DONE | 18-08-2026 |
| `packages/events`, RabbitMQ envelope, publish, consume, delayed publish | BHUVNESH | PLANNED | 19-08-2026 |
| `packages/auth`, RS256 JWT sign and verify, argon2id hashing, token hashing | BHUVNESH | DONE | 19-08-2026 |
| `packages/auth`, RBAC, ownership checks, break-glass | BHUVNESH | PLANNED | 19-08-2026 |
| `packages/pdf`, prescription, invoice and lab report templates with Noto Devanagari | BHUVNESH | PLANNED | 19-08-2026 |
| `packages/ui`, React components shared by web and the desktop renderer | BHUVNESH | PLANNED | 19-08-2026 |
| `packages/api-client`, typed client generated from contracts | BHUVNESH | PLANNED | 19-08-2026 |

The seven packages still marked PLANNED hold only a README. Their placeholder source and manifests were deleted on 19-08-2026: an empty package that builds is indistinguishable from a finished one, and seven of them made the workspace graph lie about what exists.

## BACKEND SERVICES

| FEATURE | DEVELOPER | STATUS | DATE |
| ------- | --------- | ------ | ---- |
| `gateway`: routing, JWT verification, `x-user-*` header stripping, rate limiting, WS upgrade | BHUVNESH | PLANNED | 15-08-2026 |
| `identity`: register, login, refresh rotation with reuse detection, logout, profile | BHUVNESH | DONE | 19-08-2026 |
| `identity`: OTP request and verify, hashed, single use, attempt limited | BHUVNESH | DONE | 19-08-2026 |
| `identity`: Prisma store written, no migration applied, never run against Postgres | BHUVNESH | IN PROGRESS | 19-08-2026 |
| `identity`: role granting, JWKS endpoint, device registration | BHUVNESH | PLANNED | 19-08-2026 |
| `identity`: SMS OTP delivery, blocking patient login until it exists | BHUVNESH | PLANNED | 19-08-2026 |
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
