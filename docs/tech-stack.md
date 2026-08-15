# Tech Stack

Every choice has a **why** and a **rejected alternative**. A row with neither does not belong in the stack.

Two governing biases:

1. **Boring, portable, one language.** A deployment can be EKS in Mumbai or one Linux box in a basement in Indore. Anything that only works in one of those is disqualified.
2. **Open protocol over vendor API.** SMTP over an email SDK. AMQP over a proprietary queue. The Postgres wire protocol over a data API. This is what makes [portability.md](./portability.md) achievable rather than aspirational.

---

## 0. At a glance

| Layer | Choice |
|---|---|
| Language | TypeScript everywhere |
| Runtime | Node.js 22 LTS |
| Monorepo | pnpm workspaces plus Turborepo |
| API framework | Fastify plus zod |
| Database | PostgreSQL 16 plus Prisma, one schema per service |
| Cache, WS fanout | Redis 7 |
| Broker, delayed work | RabbitMQ, self-hosted, delayed-message plugin |
| Object storage | MinIO, or any S3-compatible endpoint |
| Vector and full-text | pgvector and `pg_trgm` inside Postgres |
| Web | Next.js 15, Tailwind v4, shadcn/ui, TanStack Query |
| Mobile | Expo SDK 54, Expo Router, EAS Update |
| Desktop | electron-vite (`@quick-start/electron`, React), electron-updater |
| PDF | `@react-pdf/renderer` |
| Thermal print | ESC/POS from the Electron main process |
| Payments | Razorpay behind `PaymentProvider` |
| Notifications | in-app, Expo Push, SMS, SMTP, WhatsApp Cloud API |
| Auth | RS256 JWT via `jose`, argon2id |
| AI | LangChain and LangGraph, OpenAI-compatible endpoint |
| Testing | Vitest, supertest, Testcontainers, Playwright, k6 |
| Observability | Prometheus, Grafana, Loki, Tempo, OpenTelemetry, pino |
| Infra | Docker, Kubernetes, Helm, Terraform, GitHub Actions, Docker Hub |

---

## 1. Language and runtime

### TypeScript everywhere

A hospital domain is full of near-miss types: `patientId` versus `patientRecordId`, `tokenNumber` versus `tokenId`, `Date` versus date-string. One language means the same zod schema validates the API request, types the React form, and types the Expo screen. A field rename becomes a compile error across the whole product instead of a runtime 500 discovered by a receptionist.

*Rejected:* Go or Java for services. Both are fine, and both cost the shared-contract property, which is the largest velocity lever in this repository.

### Node.js 22 LTS

LTS through 2027. Native `fetch`, `node:test`, stable `AbortSignal`, `--env-file`.

*On Bun:* good for the Next.js dev loop and worth using there. Not the production service runtime yet, because Prisma engine support on Alpine and native-module edge cases are the class of problem you do not want to debug during a clinic day. Bun is a runtime choice for one app, never a second package manager.

### pnpm workspaces plus Turborepo

pnpm gives a content-addressed store, strict `node_modules` (a package cannot import what it did not declare, which catches real bugs), fast CI installs, and one lockfile. Turborepo gives content-hash task caching, so a PR touching only `apps/mobile` does not rebuild eight services.

*Rejected:* Nx (more configuration than this repository needs), Lerna (unmaintained for this purpose), polyrepo (see [architecture.md 1](./architecture.md)).

---

## 2. Backend services

### Fastify

- Roughly two to three times Express throughput on JSON, which matters on queue-poll endpoints
- Schema-first: zod via `fastify-type-provider-zod` validates, serializes, and types the handler from one declaration
- Plugin encapsulation gives real per-route scoping for auth
- First-class `@fastify/websocket`, `@fastify/rate-limit`, `@fastify/helmet`, and a raw-body hook (needed for payment webhook HMAC)

*Rejected:* Express, the ecosystem default and genuinely fine, but validation, serialization, and types stay three hand-maintained things. NestJS, whose decorator and DI layer buys structure we already get from a service-per-domain layout, at the cost of a framework everyone must learn.

### zod

One schema in `packages/contracts` produces runtime validation, the TypeScript request and response types, client-side form validation, and the OpenAPI document. A contract change fails CI in every consumer at once.

*Rejected:* Joi (no type inference), class-validator (decorators plus DTO classes), hand-written OpenAPI (drifts within a month).

### Prisma

Typed client from schema, migrations as a Helm pre-upgrade job, multi-schema support so each service owns a Postgres schema in one cluster, `$transaction` for the inventory and payment paths.

*Rejected:* Drizzle, a legitimate alternative that is lighter and closer to SQL, but Prisma's migration tooling and multi-schema story are more mature for migrations that run unattended in a cluster. Raw SQL with Kysely is used for the analytics queries specifically, not everywhere.

**Portability constraint:** no RDS-only extension, no Aurora-only SQL. The schema must apply cleanly to a plain `postgres:16` container.

### pino

Chosen over Winston for one reason: `redact`. PHI protection becomes a configuration array applied in the logger, not a discipline every developer must remember.

```ts
pino({ redact: ['req.headers.authorization', '*.email', '*.phone', '*.patientName', '*.dob'] })
```

Structured JSON to stdout, roughly five times faster than Winston, and the container never writes a log file.

---

## 3. Data

### PostgreSQL 16, one cluster, one schema per service

Each service connects with `?schema=<name>` and owns its tables. Cross-domain reads go through the owning service's API. This gives database-per-service isolation without operating eight clusters.

Deployment-agnostic by construction: CloudNativePG in-cluster, RDS, Neon, Supabase, or a plain container all satisfy `DATABASE_URL`.

**Also used for full-text search** (`pg_trgm` plus `tsvector` with a GIN index) for hospital, doctor, and medicine lookup with typo tolerance. *Rejected:* Elasticsearch or OpenSearch, an entire additional stateful system for a search box over tens of thousands of rows, and one more thing a self-hosting customer would have to run.

**Also used for vectors,** via pgvector in the `ai` schema. *Rejected for now:* Qdrant, a better dedicated vector database, but a second datastore to run, back up, and secure for a memory table that will be small for a long time. The repository interface makes the swap mechanical if recall latency ever justifies it.

### Redis 7

Live queue state (the hot read on every poll), doctor availability cache, rate-limit counters, the refresh-token revocation set, and **pub/sub fanout so multiple gateway replicas broadcast the same queue event to every connected client**. That last one stops being optional the moment the gateway has two replicas.

**Redis is a cache, never a system of record.** Everything in it is rebuildable from Postgres. A cold Redis costs latency, never data.

### RabbitMQ, self-hosted in every profile

Topic exchange, durable queues, per-consumer dead-letter queues, publisher confirms, and the `rabbitmq_delayed_message_exchange` plugin.

Chosen over **Redis Streams**, which would avoid one moving part, because notification delivery genuinely needs per-consumer DLQs, retry with backoff, and visible queue depth for alerting. Rebuilding those on Streams is rebuilding RabbitMQ badly.

Chosen over **Kafka** because we need routing and retries, not log replay at scale. Kafka is the right answer at ten times this volume and the wrong operational burden today.

> **Why not Amazon MQ, even on AWS.** Amazon MQ for RabbitMQ runs a managed broker with a fixed plugin set, so the delayed-message plugin cannot be installed. All scheduled work depends on it. Rather than run two different mechanisms on two profiles, RabbitMQ is self-hosted in-cluster **everywhere, including AWS**. One deployment shape, one set of failure modes, one runbook. The cost is that we operate it; the benefit is that the `portable` profile is not a second-class path.

Event naming, envelope, and the full catalogue: [architecture.md 6](./architecture.md).

### MinIO and the S3 API

**The application speaks the S3 HTTP API, never an SDK-only feature.** MinIO is the default implementation in `local`, `single-host`, and `portable`; Amazon S3 is the implementation on `aws`; Cloudflare R2, Wasabi, and Ceph all work unchanged. One `StorageProvider` interface, one code path, and the endpoint is configuration.

Private buckets, presigned URLs, short TTL.

*Explicitly rejected:* any public CDN URL for a medical record. A prescription on a guessable public URL is a reportable breach. Also rejected: S3 Select and Object Lambda, which would work only on AWS.

---

## 4. Clients

### Web: Next.js 15, App Router

Server Components for the read-heavy dashboards, Server Actions for mutations, streaming for slow analytics panels, and one deployable serving patient, doctor, and admin as route groups.

**One app, not three.** Three Next.js apps means three auth integrations, three API clients, three component libraries, and three build pipelines to serve one design system.

| Concern | Choice | Why |
|---|---|---|
| Styling | Tailwind v4 | Oxide engine, CSS-first config |
| Components | shadcn/ui | Source you own, in `packages/ui`, shared with the desktop renderer |
| Server state | TanStack Query | Cache invalidation, retries, and the polling fallback for the queue view |
| Client state | Zustand | Small, no boilerplate, and there is little global client state |
| Animation | Framer Motion | Queue position changes should be legible, not jumpy |
| Icons | Lucide | Tree-shakeable |
| Charts | Recharts | Adequate for the analytics dashboards, no hand-rolled d3 |

**Auth on web:** httpOnly refresh cookie plus in-memory access token. **Never `localStorage`**: an XSS on any page becomes full account takeover, and tokens in `localStorage` survive logout on a shared reception machine.

### Mobile: Expo SDK 54

Expo Router (file-based, matching the web mental model), EAS Build (no local Xcode or Android Studio requirement), `expo-secure-store` for tokens (Keychain and Keystore), `expo-notifications` with EAS Push.

Android notification **channels per category** so a patient can mute billing without muting "your turn." Deep links from a notification to the exact screen (`/queue/[tokenId]`).

*Rejected:* bare React Native (build infrastructure we would maintain forever), Flutter (a second language and a second component library).

### Desktop: electron-vite

```bash
pnpm create @quick-start/electron
# project name: desktop · framework: React · TypeScript: yes
```

**Why electron-vite over hand-wiring Electron and Vite:** it ships the three-process build (`main`, `preload`, `renderer`) already configured, HMR in the renderer and hot reload in main, correct externalization of Node built-ins and native modules, `electron-builder` wired in, and a preload setup that is `contextIsolation`-safe by default. That is a week of build configuration we do not write, and build configuration is the part of an Electron app that rots.

Electron is here for three things a browser cannot do:

1. **Thermal printer access:** raw ESC/POS bytes to a USB or serial printer
2. **Barcode scanner and HID access** for patient ID cards
3. **Controlled auto-update** on unattended machines no hospital IT department manages

Security posture: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, every privileged operation behind a narrow `contextBridge` API in `src/preload`.

*Rejected:* Tauri. Smaller binaries and genuinely appealing, but the Rust sidecar for ESC/POS and the thinner Windows-enterprise deployment story make Electron the lower-risk choice for a device-integration application.

### Auto-update: desktop and Android

Both clients update themselves. Neither may interrupt work in progress.

**Desktop** (`electron-updater` plus `electron-builder`):

| Setting | Value |
|---|---|
| Feed | GitHub Releases by default; any S3-compatible bucket or web server for private deployments |
| Check | On launch, then every four hours |
| Download | Background, silent |
| Apply | **On quit. Never mid-consultation** |
| Rollout | Staged percentage, so a bad build cannot take out every front desk at once |
| Channels | `stable` and `beta`, so pilot sites can lead |

**Budget line:** a Windows EV code-signing certificate (roughly $300 to $500 per year) must be purchased before desktop ships. Unsigned auto-update is a non-starter on managed hospital machines, and SmartScreen blocks the installer outright.

**Android** (`expo-updates` plus Play In-App Updates):

| Path | Covers | Mechanism |
|---|---|---|
| OTA | JS, styling, most fixes and copy | EAS Update, minutes, no store review |
| Store | Native modules, SDK upgrades, permissions | Play build with an in-app prompt |

Policy: **check on foreground, download in background, apply on next cold start.** Never swap the JS bundle out from under a patient watching the live queue.

The server exposes `minSupportedVersion`; below it the app shows a blocking update screen. That is the escape hatch for a contract change that cannot be made backward-compatible.

---

## 5. Task-specific technology

### 5.1 PDF generation: `@react-pdf/renderer`

Used for prescriptions, invoices, and lab reports.

**Why:** renders to a stream in-process from React components, so a prescription template is reviewable by anyone who reads React; no headless browser in the container image; testable against golden files.

**Why not Puppeteer or Chromium HTML-to-PDF:** prettiest output and it reuses web CSS, but it adds roughly 300MB to the image, a browser process per render, a browser CVE surface, and a whole class of blank-PDF font problems. For a document a clinic prints 400 times a day, in-process rendering wins.

**Why not pdfkit or pdfmake:** imperative coordinate-pushing. Fine for a receipt, painful for a two-column prescription with a header, an allergy block, and a signature area.

**Fonts:** embed Noto Sans and Noto Sans Devanagari in `packages/pdf`. Patient names arrive in Indian scripts, and a missing glyph on a prescription is not a cosmetic bug.

**Determinism, with the necessary caveat:** golden-file tests require pinning `CreationDate`, `ModDate`, and the document ID, because PDF writers embed a timestamp by default. Pin them from the record's own `createdAt` rather than the clock. Without this the golden test flakes on the first run.

**Immutability:** rendered once on signature, written to object storage, served by presigned URL, never regenerated. See 5.11.

### 5.2 Thermal token printing: ESC/POS, not PDF

`node-thermal-printer` emits raw ESC/POS bytes from the Electron main process to a USB or network printer. A PDF print dialog on a desk that prints 300 tokens a day is a workflow failure.

Fallback: with no printer configured, render the token through a browser print stylesheet so the desk is never blocked. Two or three common printer models are tested in P1, because model variance is the usual cause of a blocked pilot.

### 5.3 Payments: Razorpay behind `PaymentProvider`

India-first: UPI, cards, netbanking, wallets, and usable settlement reporting.

```
create order (server) → checkout (client) → webhook (server) → verify HMAC-SHA256 → capture
```

**Non-negotiables:**
- Payment status changes **only** from the verified webhook, never from a client callback. A client callback is a claim, not a fact.
- Signature verification on the **raw** request body. A parsed-then-restringified body breaks the HMAC, which is why the Fastify raw-body hook is required.
- Idempotency key on order creation; the webhook handler is idempotent on `razorpay_payment_id`.
- A chain with an existing Stripe, PayU, or Cashfree contract is a configuration change, not a rewrite.

### 5.4 Realtime: WebSocket at the gateway, Redis pub/sub behind it

`@fastify/websocket` at the gateway. Services publish to Redis; every gateway replica fans out to its own connected sockets.

The client sends subscribe and heartbeat frames and receives queue updates, so the channel is genuinely bidirectional. It reconnects with exponential backoff and **falls back to 5-second polling**, because hospital wifi drops constantly and the queue screen must never look frozen.

*Rejected:* Socket.IO (protocol overhead and a client library for features we do not use). SSE (unidirectional, so the subscribe and heartbeat frames would need a second channel).

### 5.5 Notifications: five channels, one interface each

| Channel | Provider | Note |
|---|---|---|
| In-app | Own table plus WS | Read and unread state |
| Push | Expo Push (FCM and APNs underneath) | Categories and Android channels |
| **SMS** | `SmsProvider`: MSG91, Gupshup, Twilio, or SNS | **Carries OTP.** The only channel that works with no app installed |
| **Email** | `EmailProvider` over SMTP | Carries the PDF attachments. SES is used through its SMTP endpoint, never its SDK |
| **WhatsApp** | Meta WhatsApp Business Cloud API | Rich, cheap, and slow to provision |

One `notify(userId, event)` entry point. Preference resolution, template rendering, provider selection, retry, and DLQ all live inside `comms`. No other service knows a channel exists.

**SMS is a P0 dependency, not a P5 nicety.** Phone plus OTP is the primary patient login, and push cannot deliver a first-time OTP because there is no app session yet. India additionally requires **DLT registration** of sender IDs and templates, which has a lead time comparable to WhatsApp approval. Both applications start in P0.

**Email is not second-class.** It is the only channel that works for a patient with no smartphone or an uninstalled app, and it is the one that carries invoices, prescriptions, and lab reports as attachments. Templates are MJML to HTML, rendered in `comms`, with a plain-text alternative on every send.

**Channel defaults before preferences ship.** Preferences arrive in P5. Until then a fixed matrix applies, documented in `comms`:

| Category | Channels |
|---|---|
| OTP and security | SMS only |
| Queue (near-turn, your-turn, missed) | Push, plus SMS if no push token is registered |
| Appointment confirmation and reminders | Push and email |
| Prescription, invoice, lab result ready | Email (with attachment) and push |
| Marketing | None. There is no marketing channel in v1 |

### 5.6 Scheduled and delayed work: RabbitMQ, no second job system

Appointment reminders (T-24h, T-2h), refill reminders, lab SLA checks, no-show marking, nightly reports, AI memory extraction.

Delayed work uses the delayed-message exchange:

```ts
publish('reminders', 'appointment.reminder.due', payload, {
  headers: { 'x-delay': msUntil(appointment.startsAt - hours(24)) },
})
```

Where the plugin is genuinely unavailable, the fallback is **one queue per TTL bucket** with a dead-letter exchange, not a shared queue with per-message TTL. That distinction matters: TTL queues expire in head-of-line order, so a 24-hour message queued before a 2-hour message would block it.

Recurring sweeps are Kubernetes `CronJob`s that publish a single message. The cluster owns the schedule; RabbitMQ owns delivery, retries, and the DLQ. On the `single-host` profile a small ticker container plays the same role.

*Rejected:* **BullMQ**, a second queue, a second dashboard, a second retry semantic, and a second place to look during an incident, for capability RabbitMQ already has. *Rejected:* node-cron inside a service, which fires three times with three replicas and does not survive a pod restart mid-job.

### 5.7 AI layer

| Concern | Choice |
|---|---|
| Model access | **Any OpenAI-compatible endpoint**, selected by `LLM_BASE_URL` plus `LLM_MODEL` |
| Default hosted model | NVIDIA Nemotron 3 Ultra via the NVIDIA API |
| Self-hosted option | vLLM or Ollama serving an open-weight model, for customers whose data may not leave their network |
| Orchestration | LangChain (tools, adapters) plus LangGraph (stateful multi-step agents) |
| Structured output | Mandatory for every workflow the application consumes: zod schema, JSON schema, validated response |
| Memory | Postgres plus pgvector in the `ai` schema: `PROFILE`, `EPISODIC`, `PREFERENCE` |
| Tool access | Typed, allowlisted tools that call owning-service APIs with the caller's identity |
| Eval | Fixture patients with known-correct sheets, scored on allergy and current-medication omissions |

**Provider abstraction is mandatory,** and here it is also a sales requirement: a hospital with a data-residency policy must be able to point the platform at a model running inside their own network. Because the interface is OpenAI-compatible, that is a base URL and a model id.

**Tenancy in code, not in prompt.** `WHERE user_id = $1` is applied in the repository layer. A memory query not scoped by `user_id` is a PHI breach, so the scoping lives somewhere no prompt can reach.

**Prompt shaping for cache hits.** Keep the system prompt and tool definitions byte-stable per agent (no timestamps, no per-user interpolation) and put per-user context in the messages. Providers that implement prefix caching will then hit it. The exact mechanism and the saving are provider-specific: verify against whichever endpoint is configured rather than assuming a particular provider's semantics.

**Failure handling.** Check the finish or stop reason before reading content on every call. A safety classifier declining a benign clinical question must degrade to the deterministic path, never crash a consultation screen. Timeouts and provider outages do the same.

### 5.8 Auth and crypto

| Concern | Choice |
|---|---|
| Tokens | RS256 JWT via `jose`. Private key only in `identity` |
| Access token | 15 minutes |
| Refresh token | 30 days, rotating, reuse detection revokes the family |
| Session truth | The refresh-token family in Postgres. Redis caches only the revocation set and is rebuildable |
| Passwords | **argon2id.** Any bcrypt hash from ported code is transparently rehashed to argon2id on next successful login. No new bcrypt hashes are written |
| OTP | 6 digits, 5-minute TTL, single use, rate-limited per phone and per IP, delivered by SMS |
| Login throttling | 5 failed attempts triggers exponential backoff per account and per IP; 10 triggers a 15-minute lock with an email notice |
| Service to service | Short-lived internal token plus `NetworkPolicy` |

*Rejected:* HS256, because a shared secret across eight services means any one compromised service can mint an admin token. *Rejected:* a hosted identity provider such as Auth0 or Clerk, because per-MAU pricing on a patient product with many low-frequency users is the wrong cost curve, patient PII would leave our boundary, and a self-hosting customer could not run it.

### 5.9 Testing

| Level | Tool |
|---|---|
| Unit | Vitest |
| HTTP | `supertest` against the Fastify instance |
| Integration | Testcontainers with real Postgres, Redis, and RabbitMQ, not mocks |
| E2E web | Playwright |
| Load | k6, targeting 500 concurrent queue watchers per hospital |
| AI eval | Custom harness over fixture patients, gated on allergy and current-medication recall |

**The two Playwright flows** (named, so they stop being vague):

1. **Patient booking:** search, select doctor, book, receive confirmation, view the live queue, see the position change.
2. **Reception intake:** register a walk-in, generate a token, call next, skip, recall, and confirm the audit entries.

**The one E2E test that must always pass** (`tests/e2e/loop.spec.ts`): walk-in, token, mobile update, doctor call, patient sheet, consultation, prescription, invoice, payment, dispense.

### 5.10 Search

Postgres `pg_trgm` plus `tsvector` with a GIN index. Fuzzy doctor, hospital, and medicine names with typo tolerance, and nothing extra to operate.

### 5.11 Prescription signature

"Signed" is defined, because the entire AI safety model rests on it being a real gate.

**v1 signature** is an application-level attestation recorded at the moment the doctor confirms:

| Field | Source |
|---|---|
| `doctorId`, `doctorName`, `registrationNumber` | `directory` at signing time, snapshotted |
| `signedAt` | Server clock |
| `contentHash` | SHA-256 of the canonical JSON of the prescription |
| `consultationId`, `hospitalId` | Context |

The attestation is written to the audit log, rendered onto the PDF, and the PDF is written to object storage exactly once. Any later alteration is detectable because the hash will not match. The record becomes immutable at that point; a correction is a new prescription that supersedes the old one, never an edit.

*Not in v1:* cryptographic PDF signatures (PAdES) and Aadhaar eSign. Both are upgrade paths that can be added without changing the workflow, because the attestation record already carries everything they would need.

---

## 6. Infrastructure

| Concern | Choice | Why |
|---|---|---|
| Containers | Docker, multi-stage, `node:22-alpine`, non-root | Small images, no root in the cluster |
| Orchestration | Kubernetes, any conformant distribution | Autoscaling, rolling deploys, self-healing, and it is what customers already run |
| Local Kubernetes | kind (CI and dev), minikube (dev) | Same manifests as production |
| No-Kubernetes path | Docker Compose plus the single image | A one-hospital customer should not need a cluster |
| Packaging | Helm: one chart, services rendered from a values list, three values files for the profiles | Adding a service is one values entry |
| Provisioning | Terraform, split into `modules/kubernetes` (agnostic) and `modules/aws` | A portable customer never reads an AWS module |
| Registry | Docker Hub active, ECR written and commented out | One registry to operate today |
| Secrets | Process env, delivered by Sealed Secrets or External Secrets against Vault, AWS, GCP, or Azure | Never in an image, a compose file, or git |
| CI/CD | GitHub Actions | Already where the code is |
| Ingress and TLS | ingress-nginx plus cert-manager, on every profile including AWS | One ingress path to test |
| Autoscaling | HPA on CPU, plus KEDA reading RabbitMQ queue depth for `scheduling` | KEDA works on any cluster; a cloud-specific metrics adapter would not |

Commands and install steps: [developer.md](./developer.md). Profiles and the capability matrix: [portability.md](./portability.md).

---

## 7. Observability

| Signal | Tool |
|---|---|
| Metrics | `prom-client`, Prometheus, Grafana |
| Logs | pino JSON to stdout, Loki |
| Traces | OpenTelemetry to Tempo, gateway to service to database |
| Errors | Sentry (self-hostable) across web, mobile, desktop, services |
| Uptime | Blackbox exporter against `/health/ready` |

**Self-hosted, not CloudWatch.** A customer running the `portable` profile cannot use CloudWatch, and split observability (one stack on AWS, another off it) is worse than one stack that costs slightly more to run.

Business metrics matter as much as technical ones: queue depth, queue wait time, appointment throughput, notification delivery rate per channel, AI latency, AI refusal rate.

**Alerts:** queue wait above 30 minutes, doctor not checked in by scheduled start, **lab result past its SLA** (defined per test in the catalog, defaulting to 24 hours for routine and 2 hours for urgent), service down, database pool exhausted, RabbitMQ backlog, notification delivery failures above 5% on any channel, AI error or refusal spike, certificate expiry within 14 days.

---

## 8. Deliberately excluded

| Not using | Reason |
|---|---|
| GraphQL | REST plus zod contracts already give typed end-to-end clients. GraphQL adds a schema layer, N+1 risk, and per-field authorization complexity against PHI |
| Kafka | Right at ten times this volume, wrong operational burden now. RabbitMQ is the only broker |
| BullMQ | RabbitMQ already does delayed delivery, retries, and DLQs |
| Amazon MQ | Cannot run the delayed-message plugin, and would split the broker story across profiles |
| CloudWatch, ALB controller, DynamoDB, SES SDK, S3 Select | Each would work only on AWS |
| Elasticsearch or OpenSearch | Postgres FTS covers the search box |
| Service mesh | `NetworkPolicy` plus gateway auth covers the threat model at eight services |
| Microfrontends | One Next.js app with route groups |
| MongoDB | The domain is relational and needs transactions |
| Kubernetes operators and CRDs of our own | Nothing here needs custom control-loop semantics |
| Multi-region active-active | Not until a customer requires it. Single region, multi-AZ |
| Waiting-room TV board | Out of scope for v1 |

---

## 9. Open decisions

| Item | Owner | Deadline |
|---|---|---|
| **SMS provider selection and DLT registration** (blocks patient login) | Product | **Start in P0, week 1** |
| **WhatsApp Business API application** (long provisioning) | Product | **Start in P0, week 1** |
| Primary hosting choice for our own SaaS: EKS, GKE, or managed k3s. The chart is portable, so this is a cost and operations decision, not an architecture one | Eng lead | **Before P0 ends**, because P0 provisions it |
| Windows EV code-signing certificate purchase | Finance | Before P1 ends |
| Razorpay account, KYC, and settlement configuration | Finance | Before P3 starts |
| Self-hosted LLM story: which open-weight model we validate for data-residency customers | Eng lead | Before P4 |
| ABDM / ABHA integration: real procurement value, specification-heavy | Product | Evaluate after the MVP (P3) |
