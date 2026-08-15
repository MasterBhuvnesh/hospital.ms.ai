# Product Scope

> Stakeholder-facing. Describes **what the product is** and **to what quality bar**, not how it is built.
> Engineering detail: [architecture.md](./architecture.md), [tech-stack.md](./tech-stack.md), [portability.md](./portability.md).
> Phase and ownership authority: [traceability.md](./traceability.md).

---

## 1. Product vision

A multi-hospital Hospital Management System covering the complete patient journey: appointment booking, consultation, laboratory, billing, pharmacy, and post-visit care.

It serves patients, doctors, and hospital staff through mobile, web, and desktop applications, and it runs equally well as our hosted service or inside a hospital's own infrastructure.

### The core workflow, which is the product differentiator

```
Check-In → Queue Token → Live Queue → Patient Sheet → Consultation
         → Prescription → Billing → Pharmacy → Laboratory
```

Most HMS products are record-keeping systems that happen to have a waiting room. This is a waiting-room product that happens to keep records. The promise is measurable:

| Promise | Metric |
|---|---|
| The patient knows where they are in the queue, on their phone | Position updates end to end in under 2 seconds (p95) |
| The patient is warned before their turn | Push fires at N tokens away, N configurable per hospital, default 3 |
| The doctor has read the patient before the patient sits down | Patient sheet on screen before the consulting-room door opens |
| The patient leaves with everything digital | Prescription and invoice PDFs available before they exit the building |

### What this is not

- Not an EMR/EHR replacement for tertiary hospitals with an existing HIS investment.
- Not telemedicine-first. Video consultation is out of scope for v1.
- Not insurance claims or TPA adjudication. Insurance fields are captured, not processed.
- Not inpatient. No ward, bed, or operating-theatre management.
- No waiting-room TV board in v1. Patients track the queue on their phone; reception sees it on the desktop.
- Not ABDM/ABHA integrated yet. Fields are reserved; integration is evaluated after the MVP.

---

## 2. Who uses it

Eight roles exist in the authorization model from day one. Dedicated screens arrive by phase.

| Role | Surface | What they do | Usable from |
|---|---|---|---|
| Patient | Mobile, web | Books, waits, consults, pays, collects | P0 to P1 |
| Doctor | Desktop, web | Consults, prescribes, orders tests | P1 to P2 |
| Receptionist | Desktop | Intake, queue control, billing counter | P1 |
| Nurse | Desktop | Vitals, patient preparation, queue assist, triage flag | P3 |
| Pharmacist | Desktop, web | Dispensing, inventory, batch and expiry | P3 |
| Lab technician | Desktop, web | Sample collection, result entry, verification | P3 |
| Hospital admin | Web | One hospital: staff, configuration, reports | P1 onward |
| Platform admin | Web | All hospitals: tenancy and system health. **No clinical data access** | P1 |

Roles are defined in the permission model from the first release even where their screens come later. Retrofitting a role into an authorization model built for three roles is expensive; adding a screen for a role that already exists is not.

---

## 3. Product scope

### 3.1 Patient (mobile and web)

**Identity and profile.** Register and sign in with phone plus OTP (email and password as the secondary path), password reset, profile, emergency contact, insurance details, family members and dependents, device and session management with remote revocation. ABHA / ABDM fields reserved.

**Discovery.** Search hospitals and doctors. Filter by specialization, fee, distance, rating. View profiles, services, fees, and live availability.

> **Availability is computed, not configured.** It is derived as `scheduled hours, minus approved leave, intersected with actual attendance`. A doctor who has not checked in does not show as available, whatever the calendar says. This one rule removes the most common HMS complaint: a patient travelling to see a doctor who is not there.

**Appointments.** Book, reschedule, cancel, join a waitlist when full, receive reminders, view upcoming and past appointments.

**Live queue.** Token generation, current token, queue position, estimated wait, live updates, near-turn and your-turn notifications, missed-turn handling, queue history.

**Medical records.** History timeline, allergies, chronic conditions, current medications, consultation history, document upload, prescription view and download. **Grant and revoke doctor access:** consent is a patient-held control, and every grant, revoke, and access is audited.

**Laboratory.** View prescribed tests, book a slot or request home collection, view and download reports, view result trends.

**Pharmacy.** Search medicines, check availability, order, track, refill reminders.

**Billing.** Pay online, view and download invoices, payment history, refund tracking.

**AI copilot.** Appointment and queue help, prescription and lab-result explanation, medication information.

> **Boundary:** grounded only in the caller's own authorized records, enforced in code rather than in the prompt. It explains; it does not diagnose. Clinical questions escalate to "ask your doctor." Patients are shown a clear notice about AI processing of their records and can decline it without losing any other functionality.

### 3.2 Doctor (desktop and web)

**Professional management.** Attendance check-in and check-out, leave, schedule, roster, availability, room assignment.

**Queue management.** Today's queue with priority ordering, call next, skip, recall, live status.

```
Priority: Emergency → Disabled → Pregnant → Elderly → Standard
```

Emergency priority may be set only by a doctor, nurse, or hospital admin, never by a patient, and every use is audited. It moves a patient to the front of the queue, which makes it the most abusable field in the system.

**Patient sheet.** Generated automatically when the patient is approaching consultation: demographics, allergies, chronic conditions, current medications, previous visits, previous prescriptions, laboratory history, clinical summary. One page.

> Shipped **deterministically first** (a template filled from queries, no model involved). The AI version must beat that baseline on a scored evaluation before it replaces it. That ordering is what makes the AI measured rather than assumed.

**Consultation.** Start, pause, complete. Time tracking. Chief complaint, symptoms, vitals, examination, assessment, diagnosis, SOAP notes, follow-up instructions.

**Prescription.** Medicines with dosage, frequency, duration, and instructions. Allergy alerts against recorded allergies. Drug-interaction alerts against current medications. Live stock availability (advisory: a pharmacy outage never blocks prescribing). Produces a signed PDF.

> **"Signed" means:** the doctor's identity, registration number, timestamp, and a SHA-256 hash of the prescription content are recorded in the audit log and rendered on the PDF. The PDF is written once to storage and never regenerated, so any later alteration is detectable. Cryptographic PDF signing and Aadhaar eSign are upgrade paths, not v1.

**Laboratory.** Order tests, review results with historical comparison and trend analysis, abnormal-result indicators, record follow-up action.

**AI clinical assistant (scribe).** Turns the consultation into SOAP notes, a structured summary, and a draft prescription. **Every output requires the doctor's review and signature before it persists.** Nothing a model writes reaches a record unsigned.

### 3.3 Reception and hospital operations (desktop)

- **Intake:** walk-in registration, appointment check-in, patient lookup, quick-create, token generation, thermal token printing.
- **Queue:** call next, skip, recall, merge appointment and walk-in queues, reassign between doctors, monitor, correct with an audit trail.
- **Doctor operations:** availability board, room assignment, mark arrived and departed.
- **Billing counter:** invoices, payment collection (cash, card, UPI, online), offline payment recording, refunds, transaction history, day-close reconciliation.
- **Pharmacy counter:** catalog, inventory, stock updates, dispensing against a prescription, low-stock alerts.
- **Resilience:** the desk keeps working when the network does not. Queue and appointment state is cached for reading, and walk-in registration is queued locally and replayed with idempotency keys when connectivity returns.
- **Analytics:** average wait, peak hours, revenue, doctor utilization, no-shows, queue performance.

### 3.4 Hospital administration

- **Hospital:** creation, multi-hospital support, branches, departments, rooms, services, fee configuration, operating hours, holidays, **timezone** (required, and it defines the token day boundary).
- **Users:** staff and doctor accounts, roles, permissions, activation and suspension.
- **Patients:** search, non-clinical profile updates, document management, duplicate-record merge through a reversible, audited workflow.
- **Monitoring:** queue, appointments, billing, pharmacy, laboratory, notification delivery, system health.
- **Reporting:** financial, operational, clinical activity, resource utilization, with export.

> **Hospital admin is not a clinical role.** Admins see demographic, scheduling, and billing data for their own hospital. Clinical content requires a **break-glass** action: a stated reason, an alert to the patient, and a distinct audit event. This is what makes the audit trail defensible in a procurement review.

### 3.5 AI platform

| Agent | Purpose | Human gate |
|---|---|---|
| Patient Sheet | Consultation-ready summary | Read-only. The doctor reads; the agent writes nothing |
| Clinical Scribe | Consultation to structured documentation plus draft prescription | Doctor edits and signs before anything persists |
| Triage Assistant | Symptoms to suggested specialization and urgency band | Suggestion only. Reception can override |
| Patient Copilot | Patient self-service over their own records | Read-only. Escalates clinical questions |
| Operations Analyst | Operational insight over allowlisted queries | Read-only, admin scope |

**Safety rules, non-negotiable:**

1. AI cannot create clinical truth. Clinical facts are retrieved from the owning service at request time.
2. Vector memory is a retrieval hint, never a source of medical claims.
3. AI cannot modify a record without an explicit human approval step.
4. Every AI output is auditable: model, prompt hash, tool calls, tokens, latency, and whether a human accepted or edited it.
5. AI respects the same authorization boundaries as the human invoking it, enforced in the tool layer rather than in the prompt.
6. An AI provider outage degrades to the deterministic path. It never blocks a consultation.

### 3.6 Cross-cutting

**Notifications.** Five channels: in-app, push, SMS, email, WhatsApp. Chosen per category by user preference. SMS carries OTP and the critical queue events (it is the only channel that works without an app). Email carries the PDF attachments the other channels cannot.

**Security.** RBAC, ownership checks, break-glass for administrative clinical access, full audit logging, PHI protection, encryption at rest and in transit.

**Tenancy.** Users and patients are global accounts. Everything about a visit is hospital-scoped and carries `hospitalId`. A patient has one identity and many hospital registrations.

**Compliance.** India's DPDP Act 2023 is the primary target, with HIPAA-shaped controls (encryption, audit trail, access control, retention) because they overlap and matter in enterprise procurement.

> **Erasure and retention interact.** A DPDP erasure request removes identifiers, AI memory, and marketing data. It does not remove clinical records that medical-record retention obligations require us to keep. Those are de-identified and retained under a stated legal basis, and the patient is told this at the point of request.

### 3.7 Deployment models

The same product is sold three ways, because the same code runs three ways ([portability.md](./portability.md)):

| Model | What the hospital provides | What we provide |
|---|---|---|
| **Hosted (SaaS)** | Nothing | Everything, on our AWS infrastructure |
| **Customer-hosted** | A Kubernetes cluster (any provider, or on-premise) | The chart, the images, and support |
| **Single server** | One Linux box | A Compose file and the images |

Patient data never has to leave a hospital's infrastructure. For chains with a data-residency policy or an in-house IT department, that is often the deciding factor.

---

## 4. Quality bar (non-functional requirements)

These are commitments, not aspirations. Each is measured in P6.

| Attribute | Target |
|---|---|
| Queue update latency | p95 under 2s end to end, from reception action to patient screen |
| API latency | p95 under 300ms for reads, under 800ms for writes |
| Concurrent queue watchers | 500 per hospital sustained |
| Availability | 99.5% monthly for the hosted service, business hours weighted |
| RPO | 5 minutes |
| RTO | 1 hour |
| Rate limits | 100 req/min per user, 20 req/min for auth endpoints, 5 OTP per phone per hour |
| Notification delivery | 99% of queue notifications dispatched within 10s of the triggering event |
| Data retention | Clinical records per statutory obligation; audit log 7 years; operational logs 90 days |
| Accessibility | WCAG 2.1 AA for the patient mobile and web surfaces |
| Languages | English and Hindi at launch. All PDFs must render Devanagari correctly |
| Browser and OS support | Chrome and Edge current two versions; Windows 10 and 11 for desktop; Android 10+ |

---

## 5. MVP: phases P0 through P3

The first sellable release is the **operational hospital workflow, end to end, including money.**

| Included | Phase |
|---|---|
| Authentication, RBAC, OTP by SMS | P0 |
| Hospital, department, and doctor management | P1 |
| Appointment booking and walk-in registration | P1 |
| Queue management and the live queue | P1 |
| Reception desktop and doctor desktop, with auto-update | P1 |
| Patient mobile with push, SMS, and email notifications | P1 |
| Consultation workflow and SOAP notes | P2 |
| Deterministic patient sheet | P2 |
| Prescriptions with a signed PDF | P2 |
| Patient records and consent grants | P2 |
| Billing, invoices, and Razorpay payments | P3 |
| Pharmacy, inventory, and dispensing | P3 |
| Laboratory ordering, results, and verification | P3 |
| Full observability and the portable deployment profile | P0 to P1 |

**Excluded from the MVP:** all AI (P4), WhatsApp and notification preferences (P5), analytics dashboards (P5), and the compliance tooling that hardening produces (P6).

**AI enters production only after the deterministic clinical workflow is stable and measurable.** An agent cannot be evaluated against a baseline that does not exist.

---

## 6. Success criteria

The MVP succeeds when a hospital runs a full clinic day on it without falling back to paper.

| # | Criterion |
|---|---|
| 1 | A walk-in is registered at reception and the patient sees their token on their phone within 2 seconds |
| 2 | The queue advances and every screen (patient phone, doctor desktop, reception desktop) converges on the same state |
| 3 | The patient sheet is on the doctor's screen before the patient enters the room |
| 4 | The consultation produces a signed prescription PDF |
| 5 | The invoice is generated and paid online before the patient leaves |
| 6 | Medicines are dispensed against that prescription and stock decrements exactly once |
| 7 | Reception recovers from any queue mistake (skip, recall, merge, reassign) with an audit trail |
| 8 | The front desk keeps registering walk-ins through a 10-minute network outage |
| 9 | Nobody on staff opens a database client, an API tool, or a spreadsheet to complete a normal task |
| 10 | The same release runs unmodified on a hospital's own Kubernetes cluster with no AWS account |
