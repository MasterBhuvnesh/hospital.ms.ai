# Features by Role

What each role gets, and what it means. The trackable task list is [role-checklist.md](./role-checklist.md); phase and ownership authority is [traceability.md](./traceability.md).

**Surfaces:** `M` mobile (Expo) · `W` web (Next.js) · `D` desktop (electron-vite)

**Phases:** P0 Foundation, P1 The Loop, P2 Clinical, P3 Commerce (**MVP boundary**), P4 AI, P5 Comms at scale, P6 Hardening.

> No waiting-room TV or queue-display board in v1. Patients track the queue on their phone; reception sees it on the desktop.

---

## Roles

| Role | Surfaces | Description | Screens from |
|---|---|---|---|
| `PATIENT` | `M` `W` | Books, waits, consults, pays, collects | P0 |
| `DOCTOR` | `D` `W` | Consults, prescribes, orders tests | P1 |
| `RECEPTIONIST` | `D` | Intake, queue control, billing counter | P1 |
| `NURSE` | `D` | Vitals, patient preparation, queue assist, triage flag | P3 |
| `PHARMACIST` | `D` `W` | Dispensing, inventory, batch and expiry | P3 |
| `LAB_TECH` | `D` `W` | Sample collection, result entry, verification | P3 |
| `HOSPITAL_ADMIN` | `W` | One hospital: staff, configuration, reports | P1 |
| `PLATFORM_ADMIN` | `W` | All hospitals: tenancy and health. No clinical access | P1 |

All eight exist in the authorization model from P0 even where screens arrive later. Retrofitting a role into an authorization model built for three is expensive; adding a screen for an existing role is not. The desktop application carries a module per staff role, selected at launch by configuration.

---

## 1. Patient

### 1.1 Identity and profile `M` `W` P0

| Feature | Notes |
|---|---|
| Register and sign in | Phone plus OTP primary, email plus password secondary |
| OTP delivery | **By SMS.** 6 digits, 5-minute expiry, single use, rate-limited per phone and per IP |
| Password reset | Token-based, single use, 15-minute expiry |
| Login throttling | Backoff after 5 failures, 15-minute lock after 10, with an email notice |
| Profile | Name, DOB, gender, photo, contact, address |
| Emergency contact | Surfaced on the doctor's patient sheet |
| Insurance details | Captured, not adjudicated |
| Family members and dependents | Book and manage on behalf of a dependent |
| Device and session list | See active sessions, revoke a device remotely |
| ABHA / health ID | Reserved. Stored, not integrated |

**Identity is global.** One account works at every hospital on the platform. Registering at a second hospital creates a registration, not a second person. See [architecture.md 5.2](./architecture.md).

### 1.2 Discovery `M` `W` P1

Search hospitals (name, service, department) and doctors (specialization, fee, rating, distance). View profiles, qualifications, services, and fees.

**Live availability** is computed as `scheduled hours − approved leave ∩ actual attendance`. A doctor who has not checked in is not available, whatever the calendar says.

### 1.3 Appointments `M` `W` P1

Book (hospital, department, doctor, date, slot), confirm, view upcoming and past, reschedule, cancel, join a waitlist when full, receive reminders at T-24h and T-2h.

**Idempotency:** booking carries an idempotency key. A double tap on a flaky hospital connection must not produce two appointments.

### 1.4 Live queue `M` P1, the flagship screen

| Feature | Notes |
|---|---|
| Register for a walk-in | Also available at reception |
| Receive a queue token | Unique per hospital, doctor, and **hospital-local** date |
| Current token | Which token is being served |
| Queue position | "You are 4th in line" |
| Estimated wait | Rolling average of that doctor's recent consultations. **Cold start:** before five completed consultations exist, show the hospital's configured default slot length and label the estimate as approximate |
| Live updates | WebSocket, with a 5-second polling fallback on flaky wifi |
| Near-turn notification | Push at N tokens away. **Default N = 3**, configurable per hospital |
| Your-turn notification | Push plus in-app, and SMS if no push token is registered |
| Missed-turn handling | **Default:** the token is held for 10 minutes, then moves to the end of the current queue. Configurable per hospital. Every rejoin is audited |
| Queue history | Past tokens and actual wait times |

### 1.5 Medical records `M` `W` P2

History timeline, allergies, chronic conditions, current medications, consultation history, document upload.

**Grant and revoke doctor access.** Consent is a patient-held control. Records are stored globally but visible to a hospital only through an active consultation there or an explicit grant. Every grant, revoke, and access is audited.

### 1.6 Prescriptions `M` `W` P2

View, download the signed PDF, refill reminders, full history. The PDF is immutable after signature; a correction is a new prescription that supersedes the old one.

### 1.7 Laboratory `M` `W` P3

View doctor-allocated tests, book a slot or request home collection, view and download results, view trends. **Results become visible only after verification**, never at entry.

### 1.8 Pharmacy `M` `W` P3

View prescribed medicines, check availability, order, track, order history.

### 1.9 Billing and payments `M` `W` P3

View bills and invoice detail, download the invoice PDF, pay online through Razorpay, payment status and history, refund tracking. Payment status changes only after webhook verification.

### 1.10 Notifications `M` `W` P1 core, P5 preferences

Five channels: **in-app, push, SMS, email, WhatsApp** (WhatsApp in P5).

Categories: appointment confirmed and reminder · **queue N-away** · **your turn** · missed turn · lab result ready · prescription ready · payment due · security and OTP.

- **SMS** carries OTP and is the fallback for queue events when no push token exists. It is the only channel that works with no app installed.
- **Email** carries the PDF attachments (invoice, prescription, lab report) that push and WhatsApp cannot.
- Per-category preference arrives in P5. Until then a fixed default matrix applies ([tech-stack.md 5.5](./tech-stack.md)).
- Android channels per category, so billing can be muted without muting "your turn."
- Deep links from a notification to the exact screen.

### 1.11 App updates `M` P1

OTA updates through EAS Update for JS-only changes, and an in-app store prompt for native changes. Checked on foreground, downloaded in the background, **applied on next cold start**, never while the patient is watching the live queue. A server-side `minSupportedVersion` can force a blocking update screen.

### 1.12 AI copilot `M` `W` P4

Appointment and queue queries, prescription explanation, lab-result explanation, medication information, hospital service discovery.

**Boundaries:** scoped to the caller's own records, enforced in the tool layer rather than the prompt. Non-diagnostic. Clinical questions escalate to "ask your doctor." Patients see a clear notice about AI processing and may decline without losing any other functionality.

---

## 2. Doctor

### 2.1 Account and professional profile `D` `W` P0 to P1

Sign in, secure sessions, profile, specialization, qualifications, registration number, consultation fee, hospital and department assignment, room assignment, availability status, attendance check-in and check-out, leave management.

The registration number is snapshotted onto every prescription signature, so it is required before a doctor can prescribe.

### 2.2 Schedule and queue `D` P1

| Feature | Notes |
|---|---|
| Daily schedule | Appointments and walk-ins, merged |
| Priority ordering | `Emergency > Disabled > Pregnant > Elderly > Standard` |
| Emergency priority | Settable only by `DOCTOR`, `NURSE`, or `HOSPITAL_ADMIN`. Never by a patient. Always audited |
| Call next | Advances the queue on every screen at once |
| Skip and defer | Audit trail mandatory |
| Recall | Where hospital policy permits |
| Start, pause, complete | Drives the consultation timer and the wait estimate |
| Realtime sync | Same WS stream as the patient and reception |

### 2.3 Patient clinical workspace `D` `W` P2

Search patient, demographics, medical history, allergies, chronic conditions, current medications, previous consultations and prescriptions, lab results, uploaded documents, timeline.

**Access is not implied by role.** A doctor can view *this* patient only through an active consultation at this hospital or an explicit patient grant. Every access is audit-logged.

### 2.4 Patient sheet `D` P2 deterministic, P4 agent

Auto-delivered when the patient is N tokens away: demographics, allergies, chronic conditions, current medications, recent labs, previous visit summaries. One page, on screen and as a PDF.

Regeneration is idempotent, so a skip or recall cannot deliver a stale or duplicate sheet.

### 2.5 Consultation `D` P2

Chief complaint, symptoms, vitals, examination findings, assessment, diagnosis, SOAP notes, clinical notes, follow-up instructions, review and finalize.

### 2.6 Prescription `D` P2

Medicines with dosage, frequency, duration, and instructions.

- **Allergy alerts** against the patient's recorded allergies
- **Drug-interaction alerts** against current medications
- **Live stock check** (P3) against pharmacy inventory. Advisory only: a pharmacy outage shows "availability unknown" and never blocks prescribing
- **Signature** produces the immutable PDF. See below

> **What "signed" means.** On confirmation the system records the doctor's id, name, registration number, timestamp, and a SHA-256 hash of the prescription content in the audit log, renders that attestation onto the PDF, and writes the PDF to storage once. Any later alteration is detectable. Cryptographic PDF signing and Aadhaar eSign are upgrade paths, not v1. Full definition: [tech-stack.md 5.11](./tech-stack.md).

### 2.7 Laboratory `D` P3

Create test orders, view pending orders and completed results, review history, abnormal-result indicators, record follow-up action.

### 2.8 Doctor notifications `D` P1

Appointment notifications, queue updates, patient-ready notification, critical operational alerts.

### 2.9 Doctor AI `D` P4

| Feature | Human gate |
|---|---|
| Clinical scribe: consultation to SOAP plus draft prescription | **Doctor edits and signs before anything persists** |
| Patient sheet summarization | Read-only |
| Controlled patient history retrieval | Read-only, authorization enforced in tools |
| Controlled medication and allergy retrieval | Read-only |
| Consultation note drafting | Doctor review required |
| AI audit trail | Every call logged with the accept or edit outcome |

An AI provider outage degrades to the P2 deterministic sheet and manual notes. It never blocks a consultation.

---

## 3. Reception

### 3.1 Patient intake `D` P1

Walk-in registration, appointment check-in, patient lookup, quick-create for first-time walk-ins, token generation, **thermal token printing** over ESC/POS, with a browser print stylesheet fallback when no printer is configured.

### 3.2 Queue control `D` P1

Call next, skip, recall, merge appointment and walk-in queues, reassign between doctors, monitor, and correct with an audit trail.

### 3.3 Doctor operations `D` P1

Availability board, room assignment, schedule visibility, mark doctor arrived and departed.

### 3.4 Billing counter `D` P3

Generate invoice, collect payment (cash, card, UPI, online), record offline payment, view online payment status, process refund, transaction history, day-close reconciliation.

The invoice bills the **fee snapshot** captured when the consultation completed, not the fee configured today.

### 3.5 Pharmacy counter `D` P3

Medicine catalog, inventory, stock updates, receive stock, adjustments, dispensing against a prescription, low-stock alerts. **Stock decrements on dispense, never on prescribe**, and the write is transactional so two counters cannot dispense the same last unit.

### 3.6 Desktop client operations `D` P1

- **Offline resilience.** Queue, appointment, and prescription state is cached for reading. Walk-in registration and check-in are **queued locally and replayed with idempotency keys** when connectivity returns, so the desk keeps working through an outage. Actions that cannot be safely deferred (payment capture) are disabled offline with a clear message.
- **Auto-update.** Check on launch and every four hours, download in the background, **apply on quit and never mid-consultation**, staged rollout percentage, `stable` and `beta` channels, signed installers.
- Crash reporting and stuck-queue self-recovery, because these machines are unattended.

### 3.7 Operational analytics `D` `W` P5

Average wait, peak hours, revenue, doctor utilization, no-shows, queue performance.

---

## 4. Nurse `D` P3

Record vitals into the consultation record, patient preparation workflow, queue assist (call and recall on the doctor's behalf), view the patient sheet read-only, set the triage flag for emergency priority (audited).

## 5. Pharmacist `D` `W` P3

Dispense against a prescription, mark partially dispensed, substitute with doctor confirmation, inventory and stock movement, batch and expiry tracking, low-stock alerts, order fulfilment, inventory reports. All stock writes are transactional.

## 6. Lab technician `D` `W` P3

View assigned orders, record sample collection, enter results, upload result documents, run the verification workflow (`entered → verified → released`), result history, flag abnormal values. Results reach the patient only on release.

---

## 7. Hospital admin `W`

### 7.1 Dashboards P1, extended through P5
Hospital, department, doctor availability, appointment, live queue, and system health from P1. Billing, pharmacy, and laboratory from P3. Notification delivery from P5.

### 7.2 Hospital management P1
Create and update hospital, profile, branches and facilities, departments, rooms, services, consultation fee configuration, operating hours, holidays, and **timezone** (required: it defines the token day boundary and every reporting day cut).

### 7.3 Staff and doctor management P1
Create and update doctor accounts, assign to department and hospital, configure schedule and availability, manage attendance and leave, manage staff accounts, assign roles, permission management, activate and deactivate users.

### 7.4 Appointment and queue administration P1
View and search all appointments, create on behalf of a patient, reschedule, cancel, manage waitlists, register walk-ins, generate tokens, correct queue issues with an audit trail, configure queue and token-ordering rules, monitor wait times.

### 7.5 Patient administration P2
Search patients, view demographic profile, update non-clinical information, manage documents, handle support requests.

**Merge duplicate records** is the highest-risk administrative operation in the product, and is specified accordingly: two-person approval, a full before-and-after snapshot, a reversal window, and a distinct audit event. Merging registrations within one hospital is routine; merging patient identities globally requires the full workflow.

### 7.6 Clinical access boundary P2

**Hospital admin is not a clinical role.** Admins see demographic, scheduling, and billing data for their own hospital.

Reading clinical content requires **break-glass**: a typed reason, a bounded window, one named patient, a notification to that patient, and a distinct audit event that is reviewed weekly. There is no standing clinical read for any administrative role.

### 7.7 Billing administration P3
Create billing records, view invoices, configure pricing, record offline payments, view online payment status, process refunds, payment history, billing reports, financial reconciliation, payment audit logs.

### 7.8 Pharmacy and inventory administration P3
Product catalog, stock levels, receiving, adjustments, movement history, low-stock alerts, prescription fulfilment, inventory reports.

### 7.9 Laboratory administration P3
Test catalog with **per-test SLA**, workflow configuration, order assignment, result recording and verification, result history.

### 7.10 Audit, retention, and security tooling P2 index, P6 tooling
Cross-service audit index, audit log viewer, login and security event history, PHI access auditing, break-glass review queue, data export controls, **retention policy** (clinical per statute, audit 7 years, operational logs 90 days), **DPDP erasure** (remove identifiers, AI memory, and marketing data; retain statutorily required clinical records de-identified and tell the patient), secure file access controls, rate-limit and abuse monitoring.

### 7.11 Reporting and analytics P5
Appointment, queue performance, doctor utilization, patient volume, billing, payment, pharmacy inventory, laboratory, and notification delivery reports. Operational KPI dashboard. Export.

### 7.12 Admin AI P4
Operations analyst over parameterized, allowlisted analytics queries: appointment and queue analytics, operations summaries, billing analytics, doctor availability analysis. Read-only, admin-scoped, fully logged, and it can never reach clinical content.

### 7.13 Communication management P5
Notification templates, per-channel configuration (push, SMS with DLT template ids, email, WhatsApp), per-hospital preference policy, delivery status monitoring, failed-notification retry handling with DLQ visibility.

---

## 8. Platform admin `W` P1

Cross-tenant only: create and suspend hospitals, tenancy configuration, global feature flags, cross-hospital system health, platform-wide audit search, deployed image version per environment.

> **Platform admin cannot read clinical data, with or without break-glass.** Tenancy administration and clinical access are separate privileges. This separation is what makes the audit log defensible in a procurement review.

---

## 9. Where the platform-wide requirements live

Security, realtime, events, data integrity, operations, and portability are cross-cutting and are tracked once, in [role-checklist.md section 9](./role-checklist.md), rather than being restated per role. Their technical definition is in [architecture.md](./architecture.md) and [portability.md](./portability.md).
