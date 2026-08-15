# Delivery Plan

**20 weeks to a production-hardened product, with the sellable MVP at week 12.**

Phase authority is [traceability.md](./traceability.md). Task IDs are in [role-checklist.md](./role-checklist.md).

---

## 1. Capacity assumption

The week counts below assume this team. **They are capacity-bound estimates, not a fixed schedule.** With a smaller team the scope must shrink, not the quality bar, and section 12 says what to cut first.

| Role | Count | Primary phases |
|---|---|---|
| Backend engineer | 3 | All |
| Frontend engineer (web) | 2 | P1 onward |
| Mobile engineer | 1 | P1 onward |
| Desktop engineer | 1 | P1 onward (shares `packages/ui` with web) |
| DevOps / platform | 1 | P0 heavy, then part-time |
| QA | 1 | P1 onward |
| **Total** | **9** | |

**Parallelism:** client work starts once contracts and gateway conventions stabilize at the end of P0. Backend and client tracks run concurrently from P1. AI (P4) can start against mocked tools during P3.

---

## 2. Delivery principles

1. **Build the physical hospital workflow before anything else.** Everything else is secondary to the loop working.
2. **A service owns its data and its domain logic.** No cross-service database reads, ever.
3. **Async by default.** Synchronous calls only where the caller needs the result to answer.
4. **AI is never a source of clinical truth**, and AI-generated clinical writes require a human signature.
5. **Ship the deterministic version first, then let AI compete with it.** The P2 patient sheet is the baseline the P4 agent must beat on a scored evaluation.
6. **Infrastructure is reproducible** through Terraform and Helm. Nothing created by hand.
7. **No component depends on one cloud**, and the portable path runs in CI on every merge.
8. **Every production change traces to a git commit and an image digest.**
9. **Verification is a real run**, not a green test suite. Each phase ends with a demo of the actual workflow.
10. **The `single-host` profile is a supported product**, not just a recovery mechanism.

---

## 3. Phase overview

| Phase | Deliverable | Weeks | Cumulative |
|---|---|---|---|
| **P0 Foundation** | Monorepo, contracts, platform adapters, nine images, Helm with both profiles, CI with tests and the portability gate, identity and gateway with real auth and SMS OTP | 2 | 2 |
| **P1 The Loop** | Directory and scheduling, live queue over WS, reception and doctor desktops, mobile queue, admin console. **The differentiator, shipped** | 4 | 6 |
| **P2 Clinical** | Clinical service, deterministic patient sheet, consultation, signed prescriptions, consent grants, break-glass | 3 | 9 |
| **P3 Commerce** | Billing, Razorpay, pharmacy, inventory, dispensing, laboratory. **MVP. First paying hospital** | 3 | 12 |
| **P4 AI** | AI service, memory, patient sheet agent, scribe with sign-off, copilot, ops analyst, eval harness | 4 | 16 |
| **P5 Comms at scale** | WhatsApp, per-category preferences, delivery tracking, analytics dashboards | 2 | 18 |
| **P6 Hardening** | Security review, pen test, load test, audit tooling, DPDP retention and erasure, runbooks, staged rollout | 2 | 20 |

**Dependency chain:**

```
P0 Foundation ──► P1 Directory + Scheduling ──► P2 Clinical ──► P3 Commerce ──► P6 Hardening
                                                        │
                                                        └──► P4 AI ──► P5 Comms at scale
```

### Why Commerce precedes AI

Three reasons, all of them about what a customer can buy:

1. The MVP in [product-scope.md](./product-scope.md) includes billing and excludes AI.
2. The end-to-end test ends in a payment and a dispense. Putting AI first leaves the flagship test unrunnable until week 16.
3. A hospital pays for a system that takes money. It does not pay for a scribe that has no consultation volume to learn from.

---

## 4. P0 Foundation (2 weeks)

**Objective:** the foundation, including the portability contract, before any business logic.

### Tasks

- pnpm workspace, Turborepo, shared TypeScript configuration
- Repository conventions: naming, linting, formatting, testing, commits
- **Env files:** `.env.example` committed; `development`, `testing`, `container`, `production` defined, gitignored, zod-validated at boot
- Service template: a new service is a copy, not an invention
- Shared packages: `contracts`, `config`, `logger`, `middleware`, `db`, `events`, `auth`, `pdf`, `ui`
- **Platform adapters:** `packages/platform` (interfaces), `packages/platform-generic`, `packages/platform-aws`
- **Portability gates:** the ESLint SDK rule, `check-portable-chart.sh`, and the kind portable deployment in CI
- Conventions defined: API shape, error format, health and readiness, log format, correlation ids, event naming and envelope, API versioning, migrations
- Local Compose: Postgres, Redis, **RabbitMQ with the delayed-message plugin**, **MinIO with bucket init**, Mailpit
- A `Dockerfile` per service in `apps/<service>/`, plus `docker/Dockerfile` for the all-in-one image. Nine images, one git SHA
- Helm chart with `values.yaml`, `values-portable.yaml`, `values-aws.yaml`
- Terraform split: `modules/kubernetes` and `modules/aws`
- `pr.yml` **with `pnpm test` as a required check**; `main.yml` publishing to Docker Hub with ECR commented out
- `apps/desktop` scaffolded via `pnpm create @quick-start/electron`
- **`identity`:** users, roles, sessions, refresh rotation, argon2id, password reset, device registration, **SMS OTP**, RS256 signing, public key distribution
- **`gateway`:** public entry, **`x-user-*` header stripping**, JWT verification, rate limiting, routing, WS upgrade, correlation ids

### Start on day one, because they have external lead time

- [ ] **SMS provider selection and DLT registration.** Patient login does not work without it
- [ ] **WhatsApp Business API application.** Provisioning takes weeks; it is needed in P5
- [ ] **Hosting decision** for our own SaaS, because P0 provisions it

### Exit criteria

- [ ] A new service is generated from the template and deploys unchanged
- [ ] Contracts import cleanly into web, mobile, desktop, and services
- [ ] `pnpm deps:up && pnpm dev` starts everything with one command
- [ ] CI passes lint, typecheck, **unit tests**, portability lint, and the image build
- [ ] **A patient registers with a phone number, receives an SMS OTP, and logs in**
- [ ] **A forged `x-user-role: ADMIN` header is rejected**
- [ ] A failing readiness check removes a pod from service traffic
- [ ] **The `portable` profile deploys to kind in CI and answers `/health/ready`**
- [ ] The same digest deploys to the `aws` profile

---

## 5. P1 The Loop (4 weeks)

> **This is the product.** If nothing else ever shipped, this phase is a demonstrable, sellable system.

### Directory service
Hospitals, departments, doctors, specializations, schedules, attendance, leave, rooms, versioned fee configuration, **timezone**, availability search.

Availability is computed as `scheduled hours − approved leave ∩ actual attendance`, never a static calendar.

### Scheduling service (the critical path)
Appointments, rescheduling, cancellation, waitlists, walk-in registration, token generation, ordering rules, priority, consultation **state**, queue position, estimated wait, realtime events.

### Data integrity, not deferrable

- [ ] `PLT-3.03` Unique constraint on `(hospitalId, doctorId, tokenDate, tokenNumber)`
- [ ] `PLT-3.04` Sequence or bounded insert-retry generation, never count-then-create
- [ ] `PLT-3.05` `tokenDate` derived from the hospital timezone
- [ ] `PLT-3.06` Idempotency keys on booking and token operations
- [ ] `PLT-3.07` Idempotent consumers

### Realtime
RabbitMQ events for token lifecycle and consultation state. Redis for queue state, availability cache, and **pub/sub fanout across gateway replicas**. WebSocket to clients with a 5-second polling fallback.

### Clients
- **Reception desktop:** walk-in registration, check-in, tokens, thermal printing, queue control, availability board, offline queue-and-replay, signed auto-update
- **Doctor desktop:** today's queue with priority, call, skip, recall, consultation start and stop
- **Mobile:** booking, the live queue screen, push and SMS notifications, OTA updates
- **Web:** search, booking, patient dashboard shell, admin console for hospital and staff management

### Exit criteria

- [ ] Walk-in registered on desktop, token on the patient's phone **within 2 seconds**
- [ ] The queue advances and phone, doctor desktop, and reception converge on the same state
- [ ] Push fires at N-away and at your-turn, with an SMS fallback when no push token exists
- [ ] Skip and recall both work and both write audit entries
- [ ] **Two simultaneous walk-ins cannot receive the same token** (load-tested, not assumed)
- [ ] The front desk keeps registering walk-ins through a simulated 10-minute outage, and replays cleanly
- [ ] Reception desktop auto-updates on quit, staged rollout configured, installer signed
- [ ] Mobile OTA ships and applies on next cold start, never mid-queue

---

## 6. P2 Clinical (3 weeks)

### Clinical service
Patient profile, medical history, allergies, chronic conditions, current medications, consultation **content**, SOAP notes, prescriptions with signature, document upload, patient sheet generation, consent grants.

### Patient sheet, deterministic
A template filled from queries, no model. Triggered by `queue.patient.near_turn`, idempotent on `(consultationId, tokenVersion)`, delivered to the doctor's desktop before the consultation starts.

**This is the baseline the P4 agent must beat.** Building it first is what makes the AI measurable rather than assumed.

### Authorization
Ownership checks: a doctor needs an active consultation at this hospital or an explicit patient grant. Patient-held grant and revoke, fully audited. **Break-glass** for administrative clinical access, with a reason, a bounded window, a patient notification, and a distinct audit event.

### Storage
Private buckets, presigned URLs, short TTL, on MinIO or S3 without a code change. No public URL ever carries a medical record.

### Exit criteria

- [ ] The patient sheet is on the doctor's screen **before the patient walks in**
- [ ] A skip or recall does not produce a duplicate or stale sheet
- [ ] The consultation produces SOAP notes and a **signed** prescription PDF with a verifiable content hash
- [ ] An allergy alert fires when prescribing against a recorded allergy
- [ ] **Patient A cannot read Patient B's records** (a test, not an assumption)
- [ ] **A hospital admin cannot read clinical content without break-glass**, and the patient is notified when they do
- [ ] Documents are reachable only through short-lived presigned URLs

---

## 7. P3 Commerce (3 weeks). MVP boundary

### Billing
Billing records, invoice generation **from the fee snapshot**, Razorpay order creation, webhook-driven confirmation, refunds, invoice PDF.

**Non-negotiable:** status changes only from the verified webhook, HMAC-SHA256 on the raw body, idempotency on order creation and on `razorpay_payment_id`.

### Pharmacy
Catalog, inventory, stock levels and movements, batch and expiry, dispensing against a prescription, orders, availability checks.

**Stock decrements on dispense, never on prescribe**, and every write is transactional.

### Laboratory
Test catalog with per-test SLA, order assignment, sample collection, result entry, verification workflow, home collection booking, result trends.

### Also in P3
The nurse, pharmacist, and lab technician desktop modules, against the roles that have existed since P0.

### Exit criteria

- [ ] Consultation completion produces an invoice at the fee that applied on the day of the visit
- [ ] The patient pays online and the invoice updates **only** after webhook verification
- [ ] A replayed webhook does not double-credit
- [ ] Medicines dispense against live stock and cannot be oversold under concurrency
- [ ] Lab results reach the patient only after release, never at entry
- [ ] **The full loop test passes end to end**, walk-in through dispense
- [ ] The MVP runs on the `portable` profile with no AWS account

---

## 8. P4 AI (4 weeks)

### AI service
LangChain and LangGraph, any OpenAI-compatible endpoint (hosted or self-hosted), Postgres with pgvector for memory.

### Typed tools, authorization enforced in code
`getPatient` · `getHistory` · `getAllergies` · `getMeds` · `getRecentLabs` · `getConsultation` · `searchDrugs` · `checkInteractions` · `getMyAppointments` · `getMyPrescriptions` · `getMyLabResults` · `getMyBills` · `getDoctorAvailability` · `searchSpecializations` · `queryAnalytics` (parameterized, allowlisted) · `getMemory` and `saveMemory`

### Agents

| Agent | Trigger | Human gate |
|---|---|---|
| Patient Sheet | Queue position at or below N | Read-only |
| Scribe | Consultation ends | **Doctor edits and signs before persistence** |
| Triage | Symptoms described at booking | Suggestion; reception can override |
| Patient Copilot | Patient opens chat | Read-only, escalates clinical questions |
| Ops Analyst | Admin asks a question | Read-only, admin scope, no clinical reach |

### Memory
`ai` schema, three layers: `PROFILE`, `EPISODIC`, `PREFERENCE`.

- `WHERE user_id = $1` applied in the **repository layer**, never the prompt
- Clinical-adjacent memories require a `sourceId` pointing at a real record
- Supersede via `validUntil`, never hard-delete on update, so the audit trail survives
- `DELETE FROM ai_memories WHERE user_id = $1` satisfies DPDP erasure in one statement
- **Not** a place for lab values or diagnoses: a stale embedding of a lab result is a patient-safety issue

### Safety and evaluation
Every call logs model, prompt hash, tool calls, tokens, latency, and accepted or edited. Finish and stop reasons are handled before reading content.

Evaluated on fixture patients with known-correct sheets, scored on **allergy recall** and **current-medication recall**, plus patient-specific authorization, tool-selection accuracy, hallucination rate, structured-output validity, and human acceptance rate.

### Exit criteria

- [ ] The agent sheet scores **at or above the P2 deterministic baseline** on allergy and medication recall
- [ ] Human accept and edit rate is tracked and visible
- [ ] A memory query without `user_id` scoping is impossible by construction
- [ ] **An AI provider outage degrades to the deterministic sheet.** The consultation is never blocked
- [ ] The LLM endpoint is repointed to a self-hosted OpenAI-compatible server and everything still works
- [ ] A patient who declines AI processing loses nothing else

---

## 9. P5 Comms at scale (2 weeks)

WhatsApp Business Cloud API, per-category preferences replacing the default matrix, template management, delivery status tracking, retry and dead-letter handling.

Analytics dashboards: wait times, peak hours, revenue, doctor utilization, no-shows, queue performance.

### Exit criteria

- [ ] A queue state change generates the correct notification per the patient's channel preference
- [ ] The pipeline stays operational when one consumer is down; messages land in the DLQ and drain on recovery
- [ ] A redelivered message does not send a duplicate WhatsApp or a duplicate SMS

---

## 10. P6 Hardening (2 weeks)

Security review and external penetration test. Load test at **500 concurrent queue watchers per hospital**. Audit tooling and the cross-service audit index. DPDP retention and erasure. Failure testing. Runbooks. Staged desktop rollout to pilot hospitals.

### Failure tests. All must degrade, none may cascade
RabbitMQ unavailable · Redis unavailable · database unavailable · AI provider unavailable · object storage unavailable · SMS provider unavailable · payment provider unavailable · pod restart · message redelivery · duplicate event delivery · network partition between services · **the entire AWS control plane unavailable while running the portable profile**.

### Exit criteria

- [ ] Penetration test findings closed, or accepted with a written rationale
- [ ] Load target met with p95 queue-update latency under 2 seconds
- [ ] Every non-functional target in [product-scope.md 4](./product-scope.md) measured, not estimated
- [ ] **The `single-host` profile recovers the platform on a clean VM with no cloud credentials present**
- [ ] Restore drill completes within RTO
- [ ] A runbook exists for every alert that pages someone

---

## 11. First 30 tasks

Sequential enough to start Monday.

1. Confirm the eight service boundaries and the consultation split ([architecture.md 2](./architecture.md))
2. Confirm the tenancy model: global users and patients, hospital-scoped visits ([architecture.md 5.2](./architecture.md))
3. **Start the SMS provider selection and DLT registration** (external lead time)
4. **Start the WhatsApp Business API application** (external lead time)
5. Create the pnpm workspace and TypeScript base configuration
6. Create the service template
7. `packages/contracts`
8. `packages/config` with the `APP_ENV` loader and zod validation
9. `packages/logger` (pino plus **PHI redact paths**)
10. `packages/middleware` (auth, error, validation, correlation id)
11. `packages/db` with the tenancy-scoped repository base
12. `packages/events` (RabbitMQ envelope, publish, consume, **delayed publish**)
13. **`packages/platform` interfaces** (storage, secrets, email, sms, push, whatsapp, payments, llm)
14. **`packages/platform-generic`** (S3-compatible, SMTP, HTTP)
15. **`packages/platform-aws`** skeleton, plus the ESLint SDK gate
16. Local Compose: Postgres, Redis, Mailpit
17. `docker/rabbitmq` image with the delayed-message plugin, wired into Compose
18. Local MinIO with private bucket initialization
19. Per-service `apps/<svc>/Dockerfile` for all eight, plus `docker/Dockerfile` all-in-one
20. `pr.yml` **with tests as a required check**
21. `check-portable-chart.sh` and `lint:portability`
22. Docker Hub publishing in `main.yml`
23. ECR job **written and commented out** in `main.yml`
24. Terraform `modules/kubernetes` (agnostic)
25. Terraform `modules/aws`
26. Helm chart with `values.yaml`, `values-portable.yaml`, `values-aws.yaml`
27. `scripts/k8s/kind-up.sh`, including the secret creation step
28. **The kind `portable` deployment job in `main.yml`**
29. Deploy the gateway and identity skeletons; RS256 auth with refresh rotation and SMS OTP
30. Gateway authorization plus **`x-user-*` header stripping**, and the negative-test suite

---

## 12. What to cut if capacity is lower than assumed

In order. Cut from the top before extending the schedule.

1. **P5 analytics dashboards.** Grafana already answers these for internal use.
2. **P3 laboratory** down to order plus result entry. Defer home collection, verification workflow, and trends.
3. **P4 agents** down to the patient sheet agent and the scribe. Defer triage, copilot, and ops analyst.
4. **P2 web mirrors** of doctor screens. Desktop is the doctor's real surface.
5. **P3 nurse and pharmacist modules**, keeping reception's pharmacy counter.

**Never cut:** the negative-test suite, token uniqueness, idempotency, PHI redaction, the audit log, the portability gates, or the loop test. Those are the things that are expensive to add later and embarrassing to be missing.

---

## 13. Risks

| Risk | Severity | Owner | Mitigation |
|---|---|---|---|
| **SMS / DLT registration slips** | **Critical.** Patient login does not work | Product | Start day one of P0. Interim: email plus password for pilot users |
| **WhatsApp provisioning slips** | Medium. P5 slips | Product | Apply in P0, not P5 |
| **Code-signing certificate not purchased** | High. Desktop auto-update blocked, SmartScreen blocks the installer | Finance | Purchase before P1 ends |
| **Queue token race under real concurrency** | High. Two patients, one token: visible and embarrassing | Backend lead | Unique constraint plus sequence, **load-tested in P1** |
| P1 or P3 under-scoped for the team | High. Schedule slips silently | Eng lead | Re-baseline against section 1 at the end of P0, and use section 12 |
| Mobile OTA applied mid-session | Medium. The queue screen reloads under the patient | Mobile | Apply on next cold start only |
| Hospital wifi worse than assumed | Medium. The live queue looks frozen | Mobile, frontend | Polling fallback plus optimistic UI, tested throttled |
| Thermal printer model variance | Medium. A pilot desk is blocked | Desktop | Test 2 or 3 common ESC/POS models in P1, browser print fallback |
| **Portability decays quietly** | High. A customer-hosted deal becomes impossible | DevOps | The kind portable deploy in CI, the lint gates, the quarterly drill |
| Bitnami chart availability changes | Medium. Local and portable installs break | DevOps | Pin every chart version; validated replacements named in [developer.md 4.3](./developer.md) |
| Razorpay KYC or settlement delays | Medium. P3 slips | Finance | Start the account and KYC during P2 |
| Scope creep into ABDM / ABHA | Medium. The MVP slips for a specification-heavy integration | Product | Out of scope until after P3 |
| DPDP erasure conflicts with record retention | Medium. Legal exposure either way | Product, legal | Documented policy: erase identifiers, retain statutory clinical records de-identified, tell the patient |
| Single-region outage | Medium. Full downtime | DevOps | Multi-AZ from day one; multi-region only when a customer requires it |

---

## 14. Deliberately not in this plan

Video consultation · insurance claims and TPA adjudication · IPD, ward, and bed management · operating-theatre scheduling · radiology and PACS · full ABDM / ABHA integration · a staff mobile app · multi-region active-active · per-hospital white-label theming · a waiting-room TV board.

Each is a real product someone will ask for. None of them make the queue move faster, which is what this product is for.
