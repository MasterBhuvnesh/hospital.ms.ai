# Delivery Plan

**34 weeks to a production-hardened product, with the sellable MVP at week 24.**

Phase authority is [traceability.md](./traceability.md). Task IDs are in [role-checklist.md](./role-checklist.md).

---

## 1. Capacity, and how this plan is sized

**Team of four, AI-assisted, full scope retained.** Nothing has been cut from the product. The schedule absorbed the difference instead, which is the correct trade when the deadline can move.

| | |
|---|---|
| People | 4 |
| Availability | Uneven, and treated as uneven. Section 12 puts the critical path on the largest allocation |
| Baseline | **34 weeks** at roughly 25 hours per person per week |
| Compressed | 28 weeks at roughly 35 hours per person per week |
| Relaxed | 48 weeks at roughly 15 hours per person per week |

The original sizing assumed nine people over 20 weeks, about 155 person-weeks. Four people produce a quarter of that, so an unchanged 20 weeks was arithmetic that could not close.

### 1.1 What AI assistance actually compresses

This matters because the compression is uneven, and pretending it is uniform is how a plan slips without anyone noticing.

| Work | Effect | Why |
|---|---|---|
| Schema, CRUD, DTOs, zod contracts, adapters | **Large.** Roughly halves | Mechanical, well-specified, immediately testable |
| Unit tests, fixtures, seed data | **Large** | The specification already exists in this repository |
| Helm, Terraform, workflows, Dockerfiles | **Large** | Well-trodden patterns |
| Documentation and runbooks | **Large** | |
| React and React Native screens | **Moderate** | Fast to draft, slow to make feel right |
| Integration debugging across services | **Small** | The hard part is reading the system, not writing the fix |
| Concurrency correctness, the token race | **None to negative** | Plausible code that is wrong under load is worse than no code |
| Authorization and PHI access | **None to negative** | Same reason, higher stakes |
| Load testing, failure testing | **None** | Needs real infrastructure and real time |
| Real-device push, thermal printers | **None** | Physical hardware |
| Penetration test, security review | **None** | External and human |
| DLT registration, WhatsApp approval, KYC, certificates | **None** | Other organisations' calendars |

### 1.2 The bottleneck moves to review

Four people can now generate far more code than four people can read. On most projects that is a quality problem. Here it is a safety problem, because the two areas where AI output is least trustworthy, concurrency and authorization, are exactly the two areas where this product's defects are worst: two patients holding the same token, and one patient reading another's record.

Three rules follow, and they are not optional:

1. **Nothing merges unread.** If it was generated, someone who did not generate it explains what it does before it merges.
2. **Authorization and concurrency get a human-written test first**, then the implementation, generated or not. The negative test is the specification.
3. **Work in progress is capped.** Four open pull requests maximum across the team. A queue of unreviewed branches is not progress, it is inventory.

### 1.3 Parallelism

Client work starts once contracts and gateway conventions stabilise at the end of P0. Backend and client tracks run concurrently from P1. AI (P4) can start against mocked tools during P3. The external items in section 4 run from week 1 in parallel with everything, because none of them are affected by how fast anyone writes code.

### 1.4 Ownership

Four vertical tracks, each owned end to end, backend through screen. Vertical rather than layered on purpose: with four people, a handoff between a backend owner and a frontend owner costs more than the specialisation saves.

| Track | Owns | Phases |
|---|---|---|
| **A. Platform and identity** | Monorepo, CI, images, Helm, Terraform, the portability gates, `gateway`, `identity`, `comms`, the Electron shell and its signing and auto-update | P0 heavy, then continuous |
| **B. Queue** | `directory`, `scheduling`, realtime and WebSocket fanout, the reception and doctor queue screens | P1 heavy, P0 light |
| **C. Clinical** | `clinical`, patient sheet, consultation, prescriptions, laboratory, the doctor clinical screens | P2 heavy, P3 laboratory |
| **D. Patient and commerce** | `commerce`, billing, pharmacy, the mobile app, patient web | P1 onward |

The repository owner takes track A, because it holds release authority and the merge decision.

**Two things are shared and belong to nobody's track:** the negative-test suite and code review. Every track writes negative tests for its own authorization surface, and every track reviews another track's work. Track B and track C review each other, because the token race and PHI access are the two areas where a second reader matters most.

**Availability is uneven, so allocate against the critical path, not evenly.** Track B in P1 and track C in P2 are the critical path. Whoever has the most time in a given phase should hold that phase's critical track, and tracks may swap owners between phases as long as the handover is a written one.

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

| Phase | Deliverable | Weeks | Cumulative | Review load |
|---|---|---|---|---|
| **P0 Foundation** | Monorepo, contracts, platform adapters, nine images, Helm with both profiles, CI with tests and the portability gate, identity and gateway with real auth and SMS OTP | 3 | 3 | High: auth |
| **P1 The Loop** | Directory and scheduling, live queue over WS, reception and doctor desktops, mobile queue, admin console. **The differentiator, shipped** | 9 | 12 | **Highest: the token race** |
| **P2 Clinical** | Clinical service, deterministic patient sheet, consultation, signed prescriptions, consent grants, break-glass | 6 | 18 | **Highest: PHI access** |
| **P3 Commerce** | Billing, Razorpay, pharmacy, inventory, dispensing, laboratory. **MVP. First paying hospital** | 6 | 24 | High: money, stock |
| **P4 AI** | AI service, memory, patient sheet agent, scribe with sign-off, copilot, ops analyst, eval harness | 5 | 29 | Moderate |
| **P5 Comms at scale** | WhatsApp, per-category preferences, delivery tracking, analytics dashboards | 2 | 31 | Low |
| **P6 Hardening** | Security review, pen test, load test, audit tooling, DPDP retention and erasure, runbooks, staged rollout | 3 | 34 | High |

The review-load column is the schedule risk. P1 and P2 are 15 of the 34 weeks and carry both of the defect classes that AI assistance makes more likely rather than less. Budget review time there, not code time.

**P1 is nine weeks and not compressible.** It carries three client surfaces (web, mobile, desktop), the realtime path, and the one piece of correctness in this product that a demo will not reveal and a load test will.

**Dependency chain:**

```
P0 Foundation ──► P1 Directory + Scheduling ──► P2 Clinical ──► P3 Commerce ──► P6 Hardening
                                                        │
                                                        └──► P4 AI ──► P5 Comms at scale
```

### Why Commerce precedes AI

Three reasons, all of them about what a customer can buy:

1. The MVP in [product-scope.md](./product-scope.md) includes billing and excludes AI.
2. The end-to-end test ends in a payment and a dispense. Putting AI first leaves the flagship test unrunnable until the end of P4.
3. A hospital pays for a system that takes money. It does not pay for a scribe that has no consultation volume to learn from.

The end-to-end test therefore becomes runnable at week 24 rather than week 29.

---

## 4. P0 Foundation (3 weeks, 1 to 3)

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

### The external calendar, which runs in parallel from week 1

**None of these are affected by how fast anyone writes code.** They are other organisations' queues, physical hardware, and money. Started late, they become the schedule regardless of how much of the product is finished, and a 34-week plan gives them room only if they start now.

| Item | Start | Needed by | If it slips |
|---|---|---|---|
| **SMS provider and DLT template registration** | Week 1 | Week 4 (P1 patient login) | **Patient login does not work.** Interim: email plus password for pilot users |
| **Hosting decision** | Week 1 | Week 3 (P0 provisions it) | P0 cannot finish. `local` and `portable` still work, so it does not block P1 |
| **Windows EV code-signing certificate** | Week 1 | Week 12 (P1 desktop) | Desktop auto-update is blocked and SmartScreen blocks the installer. Costs money, ships on a hardware token |
| **WhatsApp Business API application** | Week 1 | Week 30 (P5) | Only P5 slips. Everything else degrades cleanly |
| **Razorpay account and KYC** | Week 12 | Week 19 (P3) | Test keys are immediate, so development is unblocked. Live payment slips |
| **Thermal printer hardware, 2 or 3 ESC/POS models** | Week 6 | Week 10 (P1) | A pilot desk is blocked. Browser print is the fallback |
| **Test phones, Android and iOS** | Week 4 | Week 8 (P1 push) | Push cannot be verified. An emulator does not prove a real push |
| **Apple and Google developer accounts** | Week 20 | Week 32 (P6) | Store release slips |
| **External penetration test booking** | Week 24 | Week 32 (P6) | P6 cannot close. Testers book weeks ahead |

Four of these start in week 1 and three of them cost money. That is the first conversation to have, and it is the one part of this plan that cannot be recovered by working harder later.

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

## 5. P1 The Loop (9 weeks, 4 to 12)

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

## 6. P2 Clinical (6 weeks, 13 to 18)

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

## 7. P3 Commerce (6 weeks, 19 to 24). MVP boundary

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

## 8. P4 AI (5 weeks, 25 to 29)

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

## 9. P5 Comms at scale (2 weeks, 30 to 31)

WhatsApp Business Cloud API, per-category preferences replacing the default matrix, template management, delivery status tracking, retry and dead-letter handling.

Analytics dashboards: wait times, peak hours, revenue, doctor utilization, no-shows, queue performance.

### Exit criteria

- [ ] A queue state change generates the correct notification per the patient's channel preference
- [ ] The pipeline stays operational when one consumer is down; messages land in the DLQ and drain on recovery
- [ ] A redelivered message does not send a duplicate WhatsApp or a duplicate SMS

---

## 10. P6 Hardening (3 weeks, 32 to 34)

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

Sequential enough to start Monday. See [`.github/RECORD.md`](../.github/RECORD.md) for what is already done.

### Already done

The pnpm workspace, Turborepo, TypeScript base configuration, the ESLint portability gate, per-service Dockerfiles, the local Compose dependency stack, the RabbitMQ delayed-plugin image, the observability stack, `.env.example` with the full catalogue, and the per-service specifications.

### Week 1, before any code

1. **Start the SMS provider selection and DLT registration.** Longest lead time in the project
2. **Order the Windows EV code-signing certificate.** Weeks, and it costs money
3. **Start the WhatsApp Business API application**
4. **Make the hosting decision**
5. Assign the four tracks in section 1.4, and agree who reviews whom
6. Confirm the eight service boundaries and the consultation split ([architecture.md 2](./architecture.md))
7. Confirm the tenancy model: global users and patients, hospital-scoped visits ([architecture.md 5.2](./architecture.md))
8. Agree the review rules in section 1.2, in writing

### Then, finishing P0

9. Commit hooks and commitlint, so the conventions in [`RULES.md`](../.github/RULES.md) are enforced rather than remembered
10. `packages/contracts`, the single contract source
11. `packages/config` with the `APP_ENV` loader and zod validation
12. `packages/logger` (pino plus **PHI redact paths**)
13. `packages/middleware` (auth, error envelope, validation, correlation id)
14. `packages/db` with the tenancy-scoped repository base
15. `packages/events` (RabbitMQ envelope, publish, consume, **delayed publish**)
16. **`packages/platform` interfaces** (storage, secrets, email, sms, push, whatsapp, payments, llm)
17. **`packages/platform-generic`** (S3-compatible, SMTP, HTTP)
18. **`packages/platform-aws`** skeleton, behind the ESLint gate that already exists
19. Service template: a new service is a copy, not an invention
20. Seed data: a demo hospital, doctors, schedules, and patients. Blocks every demo and the loop test
21. MinIO private bucket initialisation
22. `docker/Dockerfile`, the all-in-one image
23. `pr.yml` **with `pnpm test` as a required check**
24. `check-portable-chart.sh` and `lint:portability`
25. Docker Hub publishing in `main.yml`, ECR job **written and commented out**
26. Terraform `modules/kubernetes`, then `modules/aws`
27. Helm chart with `values.yaml`, `values-portable.yaml`, `values-aws.yaml`
28. `scripts/k8s/kind-up.sh`, including secret creation and pinned chart versions
29. **The kind `portable` deployment job in `main.yml`.** This is the portability gate
30. `identity`: RS256 signing, refresh rotation, argon2id, SMS OTP
31. `gateway`: routing, JWT verification, **`x-user-*` header stripping**, rate limiting
32. **The eight authorization negative tests**, written by hand before the code they test
33. `apps/web`, `apps/mobile` and `apps/desktop` scaffolded, and added back to `pnpm-workspace.yaml`

---

## 12. What to cut if the schedule slips

Full scope is retained in this plan, so this list is now a contingency rather than a decision already taken. Cut from the top, and cut before extending again.

1. **P5 analytics dashboards.** Grafana already answers these for internal use.
2. **P3 laboratory** down to order plus result entry. Defer home collection, verification workflow, and trends.
3. **P4 agents** down to the patient sheet agent and the scribe. Defer triage, copilot, and ops analyst.
4. **P2 web mirrors** of doctor screens. Desktop is the doctor's real surface.
5. **P3 nurse and pharmacist modules**, keeping reception's pharmacy counter.
6. **Desktop offline write replay**, keeping offline read. This is the largest single saving left, and it is the one users would notice.

**Never cut:** the negative-test suite, token uniqueness, idempotency, PHI redaction, the audit log, the portability gates, or the loop test. Those are the things that are expensive to add later and embarrassing to be missing.

### Re-baseline checkpoints

The estimate above is a projection, and a projection unchecked is a wish. Compare actual against planned at the end of P0, P1 and P2. Three phases in, the measured velocity is worth more than any estimate in this document, so at the end of P2 the remaining phases get resized from data rather than from section 1.

---

## 13. Risks

| Risk | Severity | Owner | Mitigation |
|---|---|---|---|
| **The 34 weeks is itself an estimate** | **Critical.** Every date here depends on an assumed AI productivity multiplier that nobody has measured on this team | Eng lead | Re-baseline at the end of P0, P1 and P2 against measured velocity. Section 12 is the lever |
| **Review becomes the bottleneck** | **Critical.** Generated code outpaces four readers, and unread code ships | Eng lead | The three rules in section 1.2. Cap work in progress at four open pull requests |
| **AI-generated concurrency or authorization bug** | **Critical.** Plausible code that is wrong under load, in the two places where wrong is worst | Track B, track C | Human-written negative test first. Two reviewers on those paths. Load test in P1, not P6 |
| **Pattern drift across services** | High. Four people each driving AI differently produces eight dialects | Track A | The service template, `RULES.md`, and the ESLint gates. A new service is a copy |
| **Dependency sprawl** | Medium. AI reaches for a library where ten lines would do | Track A | Every new dependency is justified in the pull request description |
| **Uneven availability concentrates on one person** | High. The critical path stalls when one person's week disappears | Eng lead | Section 1.4: tracks may swap owners between phases, with a written handover |
| **SMS / DLT registration slips** | **Critical.** Patient login does not work | Product | Start week 1. Interim: email plus password for pilot users |
| **WhatsApp provisioning slips** | Medium. P5 slips | Product | Apply in P0, not P5 |
| **Code-signing certificate not purchased** | High. Desktop auto-update blocked, SmartScreen blocks the installer | Finance | Order in week 1. It ships on a hardware token and cannot be rushed |
| **Queue token race under real concurrency** | High. Two patients, one token: visible and embarrassing | Backend lead | Unique constraint plus sequence, **load-tested in P1** |
| P1 or P3 under-scoped for the team | High. Schedule slips silently | Eng lead | The re-baseline checkpoints at the end of section 12 |
| Mobile OTA applied mid-session | Medium. The queue screen reloads under the patient | Mobile | Apply on next cold start only |
| Hospital wifi worse than assumed | Medium. The live queue looks frozen | Mobile, frontend | Polling fallback plus optimistic UI, tested throttled |
| Thermal printer model variance | Medium. A pilot desk is blocked | Desktop | Test 2 or 3 common ESC/POS models in P1, browser print fallback |
| **Portability decays quietly** | High. A customer-hosted deal becomes impossible | DevOps | The kind portable deploy in CI, the lint gates, the quarterly drill |
| Bitnami chart availability changes | Medium. Local and portable installs break | DevOps | Pin every chart version; validated replacements named in [developer.md 4.3](./developer.md) |
| Razorpay KYC or settlement delays | Medium. P3 slips | Finance | Start the account and KYC in week 12. Test keys are immediate, so development is never blocked |
| Scope creep into ABDM / ABHA | Medium. The MVP slips for a specification-heavy integration | Product | Out of scope until after P3 |
| DPDP erasure conflicts with record retention | Medium. Legal exposure either way | Product, legal | Documented policy: erase identifiers, retain statutory clinical records de-identified, tell the patient |
| Single-region outage | Medium. Full downtime | DevOps | Multi-AZ from day one; multi-region only when a customer requires it |

---

## 14. Deliberately not in this plan

Video consultation · insurance claims and TPA adjudication · IPD, ward, and bed management · operating-theatre scheduling · radiology and PACS · full ABDM / ABHA integration · a staff mobile app · multi-region active-active · per-hospital white-label theming · a waiting-room TV board.

Each is a real product someone will ask for. None of them make the queue move faster, which is what this product is for.
