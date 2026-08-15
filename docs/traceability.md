# Traceability Matrix

**This file is the source of truth for phase assignment and feature ownership.** When any other document disagrees with this one about *when* something ships or *which service owns it*, this one is correct and the other is a bug.

Everything else lives elsewhere: the *why* is in [features.md](./features.md), the *how* is in [architecture.md](./architecture.md), the *task list* is in [role-checklist.md](./role-checklist.md).

---

## 1. Phases

| Phase | Name | Weeks | Cumulative | Release boundary |
|---|---|---|---|---|
| P0 | Foundation | 2 | 2 | |
| P1 | The Loop | 4 | 6 | Demonstrable product |
| P2 | Clinical | 3 | 9 | |
| P3 | Commerce | 3 | 12 | **MVP. Ship to first paying hospital** |
| P4 | AI | 4 | 16 | |
| P5 | Comms at scale | 2 | 18 | |
| P6 | Hardening | 2 | 20 | Production-hardened |

**Commerce (P3) precedes AI (P4).** The MVP defined in [product-scope.md](./product-scope.md) includes billing and does not include AI, and the end-to-end test ends in a payment. Ordering AI first would leave the flagship test unrunnable until week 16.

---

## 2. Services and what they own

| Service | Port | Schema | Owns | Does **not** own |
|---|---|---|---|---|
| `gateway` | 4000 | none | Routing, JWT verification, header stripping, rate limiting, WS upgrade and fanout | Any business logic or data |
| `identity` | 5001 | `identity` | Users, credentials, roles, sessions, devices, OTP, JWT signing | Anything hospital-scoped |
| `directory` | 5002 | `directory` | Hospitals, departments, rooms, doctors, specializations, schedules, attendance, leave, fees, search | Appointments, queue |
| `scheduling` | 5003 | `scheduling` | Appointments, waitlists, queue tokens, priority, consultation **state** | Consultation **content** |
| `clinical` | 5004 | `clinical` | Patient records, allergies, conditions, medications, consultation **content**, SOAP, prescriptions, lab orders and results, patient sheets, documents, consent grants | Consultation state, stock |
| `commerce` | 5005 | `commerce` | Billing, invoices, payments, refunds, pharmacy catalog, inventory, orders, dispensing | Prescriptions, fees |
| `comms` | 5006 | `comms` | Channel providers, templates, preferences, delivery state, WS publish | What is worth notifying about |
| `ai` | 5007 | `ai` | Agents, memory, tool execution, evals, AI audit | Any clinical fact |

Full boundary rules, including the split of "consultation", are in [architecture.md 2](./architecture.md).

---

## 3. The matrix

Legend: `M` mobile, `W` web, `D` desktop, `S` server-only.

### 3.1 Patient

| Area | Service | Surfaces | Key events | Phase | Checklist |
|---|---|---|---|---|---|
| Registration, OTP, sessions | identity | M W | `user.registered` | P0 | `PAT-1.*` |
| Profile, dependents, insurance | identity, clinical | M W | `patient.profile.updated` | P0 to P1 | `PAT-1.*` |
| Hospital and doctor discovery | directory | M W | none | P1 | `PAT-2.*` |
| Appointments | scheduling | M W | `appointment.created` `.rescheduled` `.cancelled` | P1 | `PAT-3.*` |
| Walk-in and live queue | scheduling | M | `queue.token.created` `.updated` `.skipped` `.recalled` `queue.patient.near_turn` | P1 | `PAT-4.*` |
| Clinical records, consent grants | clinical | M W | `consent.granted` `.revoked` | P2 | `PAT-5.*` |
| Prescriptions | clinical | M W | `prescription.signed` | P2 | `PAT-5.*` |
| Billing and payments | commerce | M W | `invoice.generated` `payment.captured` `refund.completed` | P3 | `PAT-6.*` |
| Pharmacy ordering | commerce | M W | `pharmacy.order.placed` `.fulfilled` | P3 | `PAT-6.*` |
| Laboratory | clinical | M W | `lab.order.created` `lab.result.released` | P3 | `PAT-5.*` |
| Notifications | comms | M W | consumes everything above | P1 (in-app, push, SMS, email), P5 (WhatsApp, preferences) | `PAT-7.*` |
| App auto-update | mobile | M | none | P1 | `PAT-8.*` |
| AI copilot | ai | M W | `ai.interaction.logged` | P4 | `PAT-9.*` |

### 3.2 Doctor

| Area | Service | Surfaces | Key events | Phase | Checklist |
|---|---|---|---|---|---|
| Account, attendance, leave | identity, directory | D W | `doctor.attendance.changed` | P0 to P1 | `DOC-1.*` |
| Schedule and queue control | scheduling | D | `queue.token.updated` `consultation.started` `.completed` | P1 | `DOC-2.*` |
| Patient clinical workspace | clinical | D W | `phi.accessed` (audit) | P2 | `DOC-3.*` |
| Patient sheet (deterministic) | clinical | D | `patient_sheet.ready` | P2 | `DOC-4.*` |
| Consultation content, SOAP | clinical | D | `consultation.content.saved` | P2 | `DOC-5.*` |
| Prescription and signature | clinical | D | `prescription.signed` | P2 | `DOC-6.*` |
| Stock check while prescribing | commerce | D | sync call | P3 | `DOC-6.*` |
| Laboratory ordering and review | clinical | D | `lab.order.created` | P3 | `DOC-7.*` |
| Doctor notifications | comms | D | consumes | P1 | `DOC-8.*` |
| AI scribe and sheet agent | ai | D | `ai.interaction.logged` | P4 | `DOC-9.*` |

### 3.3 Reception

| Area | Service | Surfaces | Key events | Phase | Checklist |
|---|---|---|---|---|---|
| Intake, token generation, printing | scheduling | D | `queue.token.created` | P1 | `REC-1.*` |
| Queue control and correction | scheduling | D | `queue.token.*` | P1 | `REC-2.*` |
| Doctor operations board | directory | D | `doctor.attendance.changed` | P1 | `REC-3.*` |
| Billing counter | commerce | D | `invoice.generated` `payment.captured` | P3 | `REC-4.*` |
| Pharmacy counter | commerce | D | `pharmacy.dispensed` `stock.low` | P3 | `REC-5.*` |
| Desktop client operations | desktop | D | none | P1 | `REC-6.*` |
| Operational analytics | commerce, scheduling | D W | none | P5 | `REC-7.*` |

### 3.4 Other clinical roles

| Role | Service | Surfaces | Phase | Checklist |
|---|---|---|---|---|
| Nurse: vitals, prep, queue assist, triage flag | clinical, scheduling | D | P3 | `NUR-*` |
| Pharmacist: dispensing, inventory, batch and expiry | commerce | D W | P3 | `PHA-*` |
| Lab technician: collection, results, verification | clinical | D W | P3 | `LAB-*` |

### 3.5 Administration

| Area | Service | Surfaces | Phase | Checklist |
|---|---|---|---|---|
| Dashboards | all | W | P1 to P5 | `HAD-1.*` |
| Hospital, departments, rooms, services, fees | directory | W | P1 | `HAD-2.*` |
| Staff and doctor management | identity, directory | W | P1 | `HAD-3.*` |
| Appointment and queue administration | scheduling | W | P1 | `HAD-4.*` |
| Patient administration, record merge | clinical, identity | W | P2 | `HAD-5.*` |
| **Clinical access boundary, break-glass** | clinical | W | P2 | `HAD-6.*` |
| Billing administration | commerce | W | P3 | `HAD-7.*` |
| Pharmacy and inventory administration | commerce | W | P3 | `HAD-8.*` |
| Laboratory administration | clinical | W | P3 | `HAD-9.*` |
| Audit, retention, erasure, security tooling | all | W | P2 (index), P6 (viewer, retention) | `HAD-10.*` |
| Reporting and analytics | all | W | P5 | `HAD-11.*` |
| Communication management | comms | W | P5 | `HAD-13.*` (admin UI), `PAT-7.*` (channels) |
| Admin AI (operations analyst) | ai | W | P4 | `HAD-12.*` |
| Platform administration, tenancy | identity | W | P1 | `PAD-*` |

### 3.6 Shared platform

| Area | Phase | Checklist |
|---|---|---|
| Security: auth, RBAC, ownership, header stripping, PHI redaction | P0, ownership checks P2 | `PLT-1.*` |
| Platform: contracts, realtime, events, cache, storage, PDF, search, notifications | P0 to P1 | `PLT-2.*` |
| Data integrity: token uniqueness, idempotency, duplicate events, transactions | P1, transactional stock P3 | `PLT-3.*` |
| Operations: logging, metrics, tracing, health, CI/CD, testing, DR | P0 to P1, load and pen test P6 | `PLT-4.*` |
| **Portability: profiles, adapters, lint gates, CI portable deploy** | **P0** | `PLT-5.*` |

---

## 4. Cross-service dependencies that are easy to miss

Each of these crosses a service boundary and has burned somebody before.

| Consumer | Needs | From | Mechanism | Note |
|---|---|---|---|---|
| `commerce` invoice | consultation fee | `directory` | Fee snapshot carried on `consultation.completed` | Never look up the *current* fee at invoice time. Bill the fee that applied when the patient was seen |
| `clinical` patient sheet | queue position | `scheduling` | `queue.patient.near_turn` event | Regeneration is idempotent on `(consultationId, tokenVersion)` |
| `clinical` prescribing | live stock | `commerce` | Synchronous call, **advisory only** | A stock outage must not block prescribing. Degrade to "availability unknown" |
| `commerce` dispensing | prescription content | `clinical` | Synchronous call at dispense time | Stock decrements on dispense, never on prescribe |
| `scheduling` queue display fields | patient and doctor names | `identity`, `directory` | Denormalized copy, refreshed on update events | Display copies only. Authoritative value stays with the owner |
| `comms` all notifications | patient channel preferences | `comms` own tables | Local | Until P5 preferences ship, a documented default matrix applies |
| `ai` every tool | authorization | owning service | Tool calls the owning service API with the caller's identity | The AI service never queries another schema directly |
| Every service | `hospitalId` scoping | request context | Repository layer | Never a route handler's responsibility |

---

## 5. Keeping this file honest

- A feature that is not in this matrix does not exist. Add the row in the same PR that adds the code.
- Moving a phase means editing **this file first**, then the checklist.
- `scripts/ci/check-traceability.sh` fails the build if `role-checklist.md` contains an ID prefix absent from this matrix, or if a matrix row references a checklist prefix that has no items.
