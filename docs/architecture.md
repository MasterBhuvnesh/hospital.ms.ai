# Architecture

Technical authority for service boundaries, data ownership, events, and security. Phase authority is [traceability.md](./traceability.md). Cloud independence is [portability.md](./portability.md).

---

## 1. Monorepo, not polyrepo

A pnpm monorepo, for four reasons:

1. **Shared contracts.** One zod schema types the scheduling service, the gateway, the Next.js page, the Expo screen, and the Electron renderer. In a polyrepo that becomes a published package, a version bump, and a window where the mobile app and the backend disagree about what a token is, during a clinic day.
2. **Atomic cross-cutting changes.** Adding `priorityReason` to a queue token touches a service, the contracts, three clients, and a migration: one PR and one CI run, versus five repositories and a coordination meeting.
3. **One toolchain.** One lockfile, one tsconfig base, one lint config, one test runner, one CI.
4. **Turborepo caching.** A PR touching only `apps/mobile` does not rebuild eight services.

The cost (CI must be change-aware, the repository grows) is bounded and solved by tooling. Polyrepo costs are unbounded and solved by meetings.

**Structure by business domain, never by technical layer.**

```
apps/scheduling/src/modules/{appointment,queue,token,priority,consultation}/   yes
apps/scheduling/src/{controllers,services,repositories,models}/                no
```

---

## 2. Services

### 2.1 Eight deployable services

The domain has roughly thirteen bounded contexts. It ships as **eight deployable services**, because the latency-critical path is `queue → patient sheet → notify`, and every service boundary that path crosses is a network round trip and an independent failure mode on the one flow the user is actually watching.

| Service | Port | Schema | Owns | Merged from |
|---|---|---|---|---|
| `gateway` | 4000 | none | Routing, JWT verification, header stripping, rate limiting, WS upgrade and fanout | |
| `identity` | 5001 | `identity` | Users, credentials, roles, sessions, devices, OTP, verification, JWT signing | identity |
| `directory` | 5002 | `directory` | Hospitals, departments, rooms, doctors, specializations, schedules, attendance, leave, fees, search | hospital, doctor, search |
| `scheduling` | 5003 | `scheduling` | Appointments, waitlists, queue tokens, priority, consultation **state** | appointment, queue, consultation lifecycle |
| `clinical` | 5004 | `clinical` | Patient records, allergies, conditions, medications, consultation **content**, SOAP, prescriptions, lab orders and results, patient sheets, documents, consent grants | patient, clinical, laboratory, records |
| `commerce` | 5005 | `commerce` | Billing, invoices, payments, refunds, pharmacy catalog, inventory, orders, dispensing | billing, pharmacy, inventory |
| `comms` | 5006 | `comms` | Channel providers, templates, preferences, delivery state | notification |
| `ai` | 5007 | `ai` | Agents, memory, tool execution, evals, AI audit | ai |

> **`gateway` is the only publicly exposed service.** Every other service is `ClusterIP` and unreachable from outside the cluster.

**`scheduling` is the critical path.** Three replicas minimum, with autoscaling on RabbitMQ queue depth rather than CPU alone.

### 2.2 The consultation boundary

Two services carry the word "consultation." The split is precise and load-bearing:

| | `scheduling` | `clinical` |
|---|---|---|
| Owns | Consultation **state**: `scheduled`, `started`, `paused`, `completed`, `no_show` | Consultation **content**: complaint, vitals, examination, assessment, diagnosis, SOAP, follow-up |
| Keyed by | `consultationId` (it mints this) | The same `consultationId`, as a foreign reference |
| Knows about | Queue position, timers, doctor, token | Clinical facts, allergies, prescriptions |
| Never | Stores a clinical fact | Changes consultation state |

`scheduling` publishes `consultation.started` and `consultation.completed`. `clinical` consumes them to open and close the content record. Neither writes the other's tables.

**The fee snapshot.** `consultation.completed` carries `feeSnapshot` (amount, currency, the `directory` fee-config version it came from). `commerce` bills that snapshot. It must never look up the current fee at invoice time, because the fee may have changed between the visit and the invoice.

### 2.3 Splitting later is cheap

Under the single-image model, extracting `laboratory` from `clinical` is:

1. Move `src/modules/laboratory/` into a new app under `apps/`
2. Add a Prisma schema
3. Add one entry to `infra/helm/hms/values.yaml`

A new service is a new Deployment, not a new pipeline. **Splitting is an optimization to make with production data, not a design-time guess.** No split is scheduled; revisit after P6 with real latency and deploy-frequency numbers.

### 2.4 Inside a service

```
apps/scheduling/
├── src/
│   ├── modules/                    business domains, not layers
│   │   ├── appointment/
│   │   │   ├── appointment.routes.ts
│   │   │   ├── appointment.service.ts
│   │   │   ├── appointment.repository.ts    hospitalId scoping lives HERE
│   │   │   └── appointment.test.ts
│   │   ├── queue/
│   │   ├── token/
│   │   ├── priority/
│   │   └── consultation/           STATE only
│   ├── consumers/                  RabbitMQ inbound, idempotent on messageId
│   ├── publishers/                 RabbitMQ outbound
│   ├── infrastructure/
│   │   ├── redis/
│   │   └── postgres/
│   ├── app.ts                      builds the Fastify instance (testable)
│   └── server.ts                   binds the port (never imported by tests)
├── prisma/schema.prisma
├── package.json
└── tsconfig.json
```

There is no per-service `Dockerfile`. One parameterized build serves all eight ([developer.md 3](./developer.md)).

The `app.ts` and `server.ts` split exists so `supertest` can drive the application without binding a port.

---

## 3. Repository layout

```text
atelier-health/
│
├── apps/                              deployable services and clients
│   ├── gateway/                       @hms/gateway        :4000
│   ├── identity/                      @hms/identity       :5001
│   ├── directory/                     @hms/directory      :5002
│   ├── scheduling/                    @hms/scheduling     :5003
│   ├── clinical/                      @hms/clinical       :5004
│   ├── commerce/                      @hms/commerce       :5005
│   ├── comms/                         @hms/comms          :5006
│   ├── ai/                            @hms/ai             :5007
│   │
│   ├── web/                           Next.js 15, ONE app, role route groups
│   │   ├── app/
│   │   │   ├── (marketing)/
│   │   │   ├── (patient)/
│   │   │   ├── (doctor)/
│   │   │   └── (admin)/
│   │   ├── components/  features/  lib/
│   │
│   ├── mobile/                        Expo SDK 54, patient only
│   │   └── app/  components/  lib/
│   │
│   └── desktop/                       electron-vite (@quick-start/electron, React)
│       ├── electron.vite.config.ts
│       ├── electron-builder.yml
│       └── src/
│           ├── main/                  printer, updater, windows
│           ├── preload/               contextBridge only
│           └── renderer/src/modules/
│               ├── reception/
│               ├── doctor/
│               ├── nurse/             P3
│               ├── pharmacy/          P3
│               └── laboratory/        P3
│
├── packages/
│   ├── contracts/                     zod schemas and inferred types. The spine
│   ├── config/                        tsconfig, eslint, prettier bases, env loader + zod validation
│   ├── logger/                        pino factory with PHI redaction
│   ├── middleware/                    auth, error, validation, correlation id
│   ├── db/                            Prisma client factory, tenancy-scoped repository base
│   ├── events/                        RabbitMQ publish, consume, envelope, delayed publish
│   ├── auth/                          JWT sign and verify, RBAC, ownership, break-glass
│   ├── pdf/                           prescription, invoice, lab report templates
│   ├── api-client/                    typed client generated from contracts
│   ├── ui/                            React components shared by web and desktop renderer
│   │
│   ├── platform/                      INTERFACES ONLY. No SDK, no implementation
│   ├── platform-generic/              S3-compatible, SMTP, HTTP. Works everywhere
│   └── platform-aws/                  the only package allowed to import @aws-sdk/*
│
├── infra/
│   ├── terraform/
│   │   ├── modules/kubernetes/        provider-agnostic
│   │   ├── modules/aws/               AWS only
│   │   └── environments/{local-kind,portable-example,dev,staging,production}/
│   ├── kubernetes/                    namespaces, network policies, ExternalSecret manifests
│   └── helm/hms/                      ONE chart
│       ├── templates/                 deployment, service, hpa, migration-job, networkpolicy
│       ├── values.yaml                base, cloud-neutral
│       ├── values-portable.yaml       in-cluster dependencies
│       └── values-aws.yaml            RDS, ElastiCache, S3, IRSA
│
├── docker/
│   ├── Dockerfile                     ONE image, SERVICE selects the entrypoint
│   ├── Dockerfile.service             optional per-service build, not wired into CI
│   ├── Dockerfile.web
│   ├── rabbitmq/                      base image + delayed-message plugin
│   └── compose/
│       ├── compose.deps.yml           postgres, redis, rabbitmq, minio, mailpit
│       ├── compose.dev.yml            deps + services with hot reload
│       └── compose.single-host.yml    no-Kubernetes production on one VM
│
├── scripts/{dev,db,deployment,k8s,ci}/
├── docs/
├── tests/{e2e,integration,performance}/
├── envs/                              .env.example is the only file in git
│   ├── .env.example
│   └── (.env.development, .env.testing, .env.container, .env.production: gitignored)
│
├── .github/workflows/
│   ├── pr.yml                         lint, typecheck, test, portability lint, build
│   ├── main.yml                       build, push to Docker Hub, deploy dev, PORTABLE kind deploy
│   ├── release.yml                    promote the same digest to staging then production
│   ├── desktop.yml                    build and sign, publish the update feed
│   └── mobile.yml                     EAS build, submit, EAS Update
│
├── compose.yml                        → docker/compose/compose.dev.yml
├── pnpm-workspace.yaml  turbo.json  package.json  CLAUDE.md
```

### One web app, one desktop app

Three Next.js apps for patient, doctor, and admin would duplicate auth, routing, the API client, the component library, and the build pipeline to serve one design system. Route groups already give per-role layouts, middleware, and code splitting.

The same holds for desktop: reception, doctor, nurse, pharmacy, and laboratory are window modes of one electron-vite application, selected at launch by configuration. A hospital installs one MSI.

Mobile stays patient-only. Staff on mobile is a different product with a different threat model.

---

## 4. System diagram

```
   ┌────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
   │ Patient Mobile │   │       Web App       │   │     Desktop App     │
   │  Expo + OTA    │   │ patient/doctor/admin│   │ reception / doctor  │
   │                │   │      Next.js        │   │ /nurse/pharmacy/lab │
   └───────┬────────┘   └──────────┬──────────┘   └──────────┬──────────┘
           └───────────────────────┼─────────────────────────┘
                                   │  HTTPS + WSS
                        ┌──────────▼──────────┐
                        │  ingress-nginx      │  same on AWS and off it
                        └──────────┬──────────┘
                        ┌──────────▼──────────┐
                        │   GATEWAY  :4000    │  strip x-user-*, verify JWT,
                        │  the only public pod│  rate limit, route, WS fanout
                        └──────────┬──────────┘
       ┌──────────┬─────────┬──────┴──────┬──────────┬──────────┐
       ▼          ▼         ▼             ▼          ▼          ▼
  ┌────────┐ ┌─────────┐ ┌──────────┐ ┌────────┐ ┌────────┐ ┌──────┐
  │identity│ │directory│ │scheduling│ │clinical│ │commerce│ │  ai  │
  │  5001  │ │  5002   │ │ 5003  ★  │ │  5004  │ │  5005  │ │ 5007 │
  └───┬────┘ └────┬────┘ └────┬─────┘ └───┬────┘ └───┬────┘ └──┬───┘
      │           │           │           │          │         │
      │  sync HTTP for reads that must answer now    │         │
      └───────────┴───────────┼───────────┴──────────┴─────────┘
                              │  async events
                   ┌──────────▼──────────┐
                   │      RabbitMQ       │  topic exchange, per-consumer DLQs,
                   │  self-hosted always │  delayed-message plugin
                   └──────────┬──────────┘
                              ▼
                         ┌────────┐
                         │ comms  │ 5006 → in-app, push, SMS, email, WhatsApp
                         └───┬────┘        and WS publish back through gateway
                             │
  Shared state: PostgreSQL (schema per service) · Redis (cache, WS fanout)
                MinIO or any S3-compatible store · pgvector inside the ai schema

  ★ critical path: 3 replicas, autoscaled on queue depth
```

`ai` and `comms` are reachable both synchronously through the gateway (the copilot chat, the notification preferences UI) and asynchronously through RabbitMQ (agent triggers, notification fanout).

---

## 5. Data

### 5.1 One cluster, one schema per service

Each service connects with `?schema=<name>` and owns its tables exclusively. **No service reads another service's tables.** Cross-domain reads go through the owning service's API.

This gives database-per-service isolation without operating eight clusters, and lets any schema move to its own cluster later with a connection-string change and no application change.

### 5.2 Tenancy: what is and is not hospital-scoped

This is the most consequential data decision in the system. It is settled as follows.

**Global (no `hospitalId`):**

| Entity | Owner | Why |
|---|---|---|
| `users` | identity | One person, one login, across every hospital they visit |
| `patients` | clinical | One clinical identity. A patient's allergy list is not per-hospital |
| `allergies`, `conditions`, `medications` | clinical | Clinical truth about a person, not about a visit |
| `documents` | clinical | Owned by the patient, shared by grant |
| `ai_memories` | ai | Scoped by `userId`, which is the tenancy boundary there |

**Hospital-scoped (`hospitalId` required, indexed, applied in the repository layer):**

`patient_hospital_registrations`, `appointments`, `queue_tokens`, `consultations` (both state and content), `prescriptions`, `lab_orders`, `lab_results`, `invoices`, `payments`, `pharmacy_orders`, `stock_*`, `staff_assignments`, `schedules`, `attendance`, `leave`, `rooms`, `departments`, `notifications`, `audit_log`.

```prisma
@@index([hospitalId])
@@index([hospitalId, createdAt])
```

**The access rule that follows.** A hospital sees a patient's clinical history only through an active consultation at that hospital or an explicit patient grant. Global storage does not mean global visibility. Registering at hospital B does not expose the record from hospital A.

**Merging duplicates** (`HAD-5`) therefore merges *registrations* within one hospital, or *patient identities* globally with a two-person approval, a full before-and-after snapshot, and a reversal window. It is the highest-risk administrative operation in the product and is specified as such.

### 5.3 Time and the token day

Every hospital has a required `timezone` (IANA identifier). `queue_tokens.tokenDate` is the calendar date **in the hospital's timezone**, not UTC and not the server's zone.

Without this, a clinic running past midnight, or a chain across timezones, produces ambiguous token dates and a unique constraint that means nothing. All scheduling, reporting, and day-close boundaries derive from the same hospital timezone.

### 5.4 Deliberate denormalization on the critical path

`scheduling.queue_tokens` carries `patientName` and `doctorName` so the queue list renders without fanning out to `identity` and `directory` on every poll. These are display copies, refreshed on the owner's update event. The authoritative value always stays with the owning service.

### 5.5 Queue token integrity: the known race

Token generation must not be count-then-create. Under two simultaneous walk-ins, that hands two patients the same number.

```prisma
@@unique([hospitalId, doctorId, tokenDate, tokenNumber])
```

Generation uses a Postgres sequence per `(hospital, doctor, tokenDate)` or a bounded insert-retry loop on the unique-violation error. The constraint is the guarantee; the sequence is the optimization. Load-tested in P1, not assumed.

### 5.6 Idempotency

Every critical write carries a client-supplied idempotency key, stored with its result: appointment booking, walk-in registration, token generation, payment initiation, refund, dispensing.

Every RabbitMQ consumer is idempotent on `messageId`. Redelivery is normal operation, not an error.

### 5.7 Audit log

Append-only in every service: `actor`, `actorRole`, `action`, `resource`, `hospitalId`, `before`, `after`, `ip`, `timestamp`, `correlationId`, `reason` (break-glass only). Never updated, never deleted. Retained seven years.

**Cross-service audit search.** The audit viewer (`HAD-10`) cannot join across eight schemas. Every service also publishes `audit.recorded` to RabbitMQ, and a read model in `identity` maintains a searchable index. The per-service table remains the legal record; the index is a convenience and is rebuildable from the event stream.

### 5.8 Backups

Postgres via pgBackRest or WAL-G to an S3-compatible target (MinIO or S3, identical configuration). Object storage via bucket versioning plus scheduled replication to a second bucket. Both are restored in a scratch environment quarterly. RPO 5 minutes, RTO 1 hour.

---

## 6. Events

Naming: `<domain>.<entity>.<past-tense-verb>`.

Envelope: `{ messageId, correlationId, causationId, occurredAt, hospitalId, actorId, version, payload }`.

Delivery is at-least-once everywhere. **Every consumer is idempotent on `messageId`.**

| Event | Publisher | Consumers | Consumer action |
|---|---|---|---|
| `user.registered` | identity | comms | Welcome message |
| `appointment.created` | scheduling | comms | Confirmation, and schedule T-24h and T-2h reminders |
| `appointment.rescheduled` | scheduling | comms | Cancel old reminders, schedule new ones |
| `appointment.cancelled` | scheduling | comms, commerce | Notify; void any unpaid invoice |
| `appointment.no_show` | scheduling | comms, commerce | Notify; apply the no-show policy |
| `queue.token.created` | scheduling | comms | Token notification |
| `queue.token.updated` | scheduling | comms | WS fanout of the new position |
| `queue.token.skipped` | scheduling | comms | Missed-turn notification and rejoin instructions |
| `queue.token.recalled` | scheduling | comms | Your-turn notification |
| `queue.patient.near_turn` | scheduling | comms, clinical | Notify the patient; build the patient sheet |
| `patient_sheet.ready` | clinical | comms | Push to the doctor's desktop over WS |
| `consultation.started` | scheduling | clinical | Open the content record |
| `consultation.completed` | scheduling | clinical, commerce, ai | Close the record; generate the invoice from `feeSnapshot`; queue scribe extraction |
| `consultation.content.saved` | clinical | ai | Memory extraction candidate |
| `prescription.signed` | clinical | comms, commerce | Notify the patient with the PDF; make it available to the pharmacy counter (no stock movement) |
| `consent.granted` / `consent.revoked` | clinical | comms | Notify; invalidate cached access decisions |
| `lab.order.created` | clinical | comms | Notify the patient; start the SLA timer |
| `lab.sample.collected` | clinical | comms | Notify |
| `lab.result.released` | clinical | comms | Notify the patient and the ordering doctor. Released, never merely entered |
| `invoice.generated` | commerce | comms | Notify with the PDF |
| `payment.captured` | commerce | comms, scheduling | Notify; mark the visit financially closed so reception can complete day-close |
| `refund.completed` | commerce | comms | Notify |
| `pharmacy.dispensed` | commerce | comms, clinical | Notify; mark the prescription fulfilled |
| `stock.low` | commerce | comms | Alert the pharmacist and admin |
| `audit.recorded` | all | identity | Maintain the cross-service audit index |
| `phi.accessed` | clinical | identity | Audit index, and patient notification on break-glass |

**Sync versus async.** Synchronous HTTP only when the caller needs the result to answer: a slot check during booking, a stock check while prescribing (advisory, degrades on failure), prescription content at dispense time. Everything else is an event. The `queue → sheet → notify` chain is entirely event-driven, which is what keeps the critical path fast.

### 6.1 Delayed and scheduled work

Reminders, refill prompts, lab SLA checks, and no-show marking are published with a delay through RabbitMQ rather than a second job system ([tech-stack.md 5.6](./tech-stack.md)). Recurring sweeps are Kubernetes `CronJob`s that publish one message.

### 6.2 Patient sheet regeneration

`queue.patient.near_turn` can fire more than once for the same patient because of skip, recall, and reassignment. Sheet generation is idempotent on `(consultationId, tokenVersion)`. A newer `tokenVersion` supersedes an older sheet; an equal one is a no-op.

---

## 7. Auth and security

1. **Real tokens.** `identity` signs RS256 JWTs. The private key exists only in `identity`; every other service verifies with the public key. Rejected: HS256, because a shared secret across eight services means any one compromised service can mint an admin token.
2. **The gateway is the only identity source.** It **deletes every inbound `x-user-*` header** before verifying the JWT and setting its own. Without that one line, anyone can send `x-user-role: ADMIN` and satisfy every downstream role check.
3. **Defense in depth.** Services verify the JWT themselves rather than trusting headers. Header trust is a single point of total failure; signature verification costs microseconds.
4. **Service to service.** Short-lived internal token plus `NetworkPolicy` restricting which services may call which.
5. **RBAC at the route level.** `PATIENT`, `DOCTOR`, `NURSE`, `RECEPTIONIST`, `PHARMACIST`, `LAB_TECH`, `HOSPITAL_ADMIN`, `PLATFORM_ADMIN`.
6. **Ownership checks, not just role checks.** A `DOCTOR` role does not imply access to *this* patient. `clinical` requires an active consultation at that hospital or an explicit patient grant. This is the IDOR class that kills healthcare products: `/api/appointments?patientId=<anyone>`.
7. **Break-glass for administrative clinical access.** `HOSPITAL_ADMIN` has no standing clinical read. A break-glass request requires a typed reason, is limited to one patient for a bounded window, notifies the patient, and writes a distinct audit event reviewed weekly. `PLATFORM_ADMIN` has no clinical access at all, break-glass included.
8. **Session truth.** The refresh token is the session. `identity` stores refresh-token families in Postgres as the authoritative record; Redis caches only the revocation set for fast gateway checks and is rebuildable from Postgres. There is no separate session table and no separate denylist.
9. **Audit log** on every PHI access and mutation.
10. **PHI hygiene.** No patient names, emails, phone numbers, or tokens in logs, enforced by pino `redact` paths in `packages/logger` rather than by developer discipline.
11. **Compliance.** DPDP Act 2023 primarily, with HIPAA-shaped controls, because they overlap and matter in enterprise procurement.

### 7.1 Negative tests that must exist

These are requirements, not suggestions. Each is a test in `tests/integration/security/`:

- A forged `x-user-role: ADMIN` header is rejected
- Patient A requesting Patient B's appointment receives 403
- A doctor with no active consultation and no grant receives 403 for a patient record
- A hospital admin reading clinical content without break-glass receives 403
- A platform admin reading clinical content receives 403 with or without break-glass
- A request to a non-gateway service from outside the cluster fails to connect
- An expired or reused refresh token revokes the whole family
- A lab result that is entered but not verified is invisible to the patient

---

## 8. Portability

No business service depends on a cloud provider SDK. Every infrastructure dependency sits behind an interface in `packages/platform`, with implementations in `packages/platform-generic` (works everywhere, including AWS) and `packages/platform-aws` (the only package permitted to import an AWS SDK).

The full capability matrix, deployment profiles, and the CI gates that keep this true are in **[portability.md](./portability.md)**. The short version:

| Capability | App sees | Portable | AWS |
|---|---|---|---|
| Database | `DATABASE_URL` | CloudNativePG in-cluster | RDS |
| Cache and pub/sub | `REDIS_URL` | Redis in-cluster | ElastiCache |
| Broker | `RABBITMQ_URL` | RabbitMQ in-cluster | **RabbitMQ in-cluster** (Amazon MQ cannot run the delayed-message plugin) |
| Object storage | `StorageProvider` | MinIO | S3 |
| Secrets | process env | Sealed Secrets or Vault | Secrets Manager via External Secrets |
| Email | SMTP | Any relay | SES SMTP endpoint |
| SMS | `SmsProvider` | MSG91, Gupshup | Same, or SNS |
| Metrics, logs, traces | Prometheus, stdout, OTLP | Self-hosted | **Self-hosted**, not CloudWatch |
| Ingress | `Ingress` | ingress-nginx | **ingress-nginx**, not ALB |

**Rule:** a service depends on an interface and configuration, never on one provider's SDK, unless the capability genuinely has no portable equivalent. The `portable` profile is deployed to kind in CI on every merge, which is what stops this from decaying into a claim.
