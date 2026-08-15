# Role-Based Feature Checklist

The implementation checklist. Every item has a **stable ID**, is independently trackable, and becomes one ticket.

**Never renumber an ID.** If an item is dropped, strike it and leave the ID retired. Tickets, commits, and test names reference these.

**Tags:** phase `[P0]`..`[P6]` · `M` mobile · `W` web · `D` desktop · `S` server-only

**Phase authority is [traceability.md](./traceability.md).** Change a phase there first.

> **MVP = P0 through P3.** No waiting-room TV board in v1.

## Definition of done for an item

Implemented · unit tested · **authorization tested including the negative case** · audit-logged if it touches PHI · dashboards updated if it is on the critical path · works on the `portable` profile · documented.

---

# 1. PATIENT `PAT`

## 1.1 Account and profile

- [ ] `PAT-1.01` `[P0]` `M W` Sign up and sign in (phone plus OTP primary)
- [ ] `PAT-1.02` `[P0]` `M W` Email plus password as the secondary path
- [ ] `PAT-1.03` `[P0]` `S` **OTP delivery by SMS** through `SmsProvider`
- [ ] `PAT-1.04` `[P0]` `S` OTP: 6 digits, 5-minute TTL, single use, rate-limited per phone and per IP
- [ ] `PAT-1.05` `[P0]` `M W` Password reset and account recovery
- [ ] `PAT-1.06` `[P0]` `S` Login throttling: backoff after 5 failures, 15-minute lock after 10, email notice
- [ ] `PAT-1.07` `[P0]` `M W` Patient profile management
- [ ] `PAT-1.08` `[P0]` `M W` Profile photo
- [ ] `PAT-1.09` `[P0]` `M W` Contact information
- [ ] `PAT-1.10` `[P0]` `M W` Emergency contact
- [ ] `PAT-1.11` `[P0]` `M W` Date of birth, gender, demographics
- [ ] `PAT-1.12` `[P1]` `M W` Insurance information (captured, not adjudicated)
- [ ] `PAT-1.13` `[P1]` `M W` Family members and dependents
- [ ] `PAT-1.14` `[P0]` `M W` Device registration and session list
- [ ] `PAT-1.15` `[P0]` `M W` Remote session revocation
- [ ] `PAT-1.16` `[P0]` `S` ABHA / health-ID field reserved (stored, not integrated)
- [ ] `PAT-1.17` `[P0]` `S` **Global identity:** one account across hospitals; a second hospital creates a registration, not a person

## 1.2 Hospital and doctor discovery

- [ ] `PAT-2.01` `[P1]` `M W` Search hospitals
- [ ] `PAT-2.02` `[P1]` `M W` Search by department
- [ ] `PAT-2.03` `[P1]` `M W` Search doctors
- [ ] `PAT-2.04` `[P1]` `M W` Filter by specialization
- [ ] `PAT-2.05` `[P1]` `M W` Filter by consultation fee
- [ ] `PAT-2.06` `[P1]` `M W` Filter by distance
- [ ] `PAT-2.07` `[P1]` `M W` Filter by rating
- [ ] `PAT-2.08` `[P1]` `M W` View doctor profile and qualifications
- [ ] `PAT-2.09` `[P1]` `S` **Availability computed** as scheduled hours minus leave, intersected with attendance
- [ ] `PAT-2.10` `[P1]` `M W` View hospital information and services
- [ ] `PAT-2.11` `[P1]` `M W` View consultation fees

## 1.3 Appointments

- [ ] `PAT-3.01` `[P1]` `M W` Book appointment (hospital, department, doctor, date, slot)
- [ ] `PAT-3.02` `[P1]` `S` **Idempotency key on booking**; a double tap must not double-book
- [ ] `PAT-3.03` `[P1]` `M W` Appointment confirmation
- [ ] `PAT-3.04` `[P1]` `M W` View upcoming appointments
- [ ] `PAT-3.05` `[P1]` `M W` View past appointments
- [ ] `PAT-3.06` `[P1]` `M W` Reschedule appointment
- [ ] `PAT-3.07` `[P1]` `M W` Cancel appointment
- [ ] `PAT-3.08` `[P1]` `M W` Join waitlist when full
- [ ] `PAT-3.09` `[P1]` `S` Reminders at T-24h and T-2h via delayed RabbitMQ publish

## 1.4 Walk-in and live queue (the flagship)

- [ ] `PAT-4.01` `[P1]` `M` Register for a walk-in visit
- [ ] `PAT-4.02` `[P1]` `M` Receive queue token
- [ ] `PAT-4.03` `[P1]` `S` **Unique constraint** on `(hospitalId, doctorId, tokenDate, tokenNumber)`
- [ ] `PAT-4.04` `[P1]` `S` **Sequence or bounded insert-retry generation.** Never count-then-create
- [ ] `PAT-4.05` `[P1]` `S` **`tokenDate` derived from the hospital timezone**, not UTC and not the server zone
- [ ] `PAT-4.06` `[P1]` `M` View current token
- [ ] `PAT-4.07` `[P1]` `M` View queue position
- [ ] `PAT-4.08` `[P1]` `M` View estimated wait
- [ ] `PAT-4.09` `[P1]` `S` Estimate cold start: show the configured slot length, labelled approximate, until 5 consultations exist
- [ ] `PAT-4.10` `[P1]` `M` Live updates over WebSocket
- [ ] `PAT-4.11` `[P1]` `M` **5-second polling fallback when the socket drops**
- [ ] `PAT-4.12` `[P1]` `M` Near-turn notification, default N = 3, configurable per hospital
- [ ] `PAT-4.13` `[P1]` `M` Your-turn notification
- [ ] `PAT-4.14` `[P1]` `M` Missed-turn handling: 10-minute hold, then move to the end. Configurable, audited
- [ ] `PAT-4.15` `[P1]` `M` Queue history with actual wait times

## 1.5 Clinical records

- [ ] `PAT-5.01` `[P2]` `M W` View medical profile
- [ ] `PAT-5.02` `[P2]` `M W` View history timeline
- [ ] `PAT-5.03` `[P2]` `M W` View allergies
- [ ] `PAT-5.04` `[P2]` `M W` View chronic conditions
- [ ] `PAT-5.05` `[P2]` `M W` View current medications
- [ ] `PAT-5.06` `[P2]` `M W` View consultation history
- [ ] `PAT-5.07` `[P2]` `M W` View prescriptions
- [ ] `PAT-5.08` `[P2]` `M W` Download prescription PDF
- [ ] `PAT-5.09` `[P2]` `M W` Upload medical documents
- [ ] `PAT-5.10` `[P2]` `M W` **Grant doctor access**
- [ ] `PAT-5.11` `[P2]` `M W` **Revoke doctor access**
- [ ] `PAT-5.12` `[P2]` `S` Every grant, revoke, and access audit-logged
- [ ] `PAT-5.13` `[P2]` `S` Global storage, per-hospital visibility: hospital B cannot see hospital A's record without a grant
- [ ] `PAT-5.14` `[P2]` `M W` View patient sheet where appropriate
- [ ] `PAT-5.15` `[P3]` `M W` View laboratory orders
- [ ] `PAT-5.16` `[P3]` `M W` View laboratory results (**released only**)
- [ ] `PAT-5.17` `[P3]` `M W` View result trends

## 1.6 Billing and pharmacy

- [ ] `PAT-6.01` `[P3]` `M W` View bills and invoice details
- [ ] `PAT-6.02` `[P3]` `M W` Download invoice PDF
- [ ] `PAT-6.03` `[P3]` `M W` **Initiate online payment (Razorpay)**
- [ ] `PAT-6.04` `[P3]` `S` **Status changes only from the verified webhook**, never a client callback
- [ ] `PAT-6.05` `[P3]` `S` **HMAC-SHA256 verification on the raw body**
- [ ] `PAT-6.06` `[P3]` `S` Webhook handler idempotent on `razorpay_payment_id`
- [ ] `PAT-6.07` `[P3]` `M W` View payment status and history
- [ ] `PAT-6.08` `[P3]` `M W` View refunds
- [ ] `PAT-6.09` `[P3]` `M W` View prescribed medicines and check availability
- [ ] `PAT-6.10` `[P3]` `M W` Place and track a pharmacy order
- [ ] `PAT-6.11` `[P3]` `M` Refill reminders

## 1.7 Notifications

- [ ] `PAT-7.01` `[P1]` `M W` In-app notifications
- [ ] `PAT-7.02` `[P1]` `M` Push notifications
- [ ] `PAT-7.03` `[P0]` `S` **SMS channel** (required for OTP)
- [ ] `PAT-7.04` `[P1]` `S` SMS fallback for queue events when no push token is registered
- [ ] `PAT-7.05` `[P1]` `M W` **Email notifications**
- [ ] `PAT-7.06` `[P2]` `S` Email delivery of prescription, invoice, and lab-report PDF attachments
- [ ] `PAT-7.07` `[P1]` `S` **Default channel matrix** applied until preferences ship
- [ ] `PAT-7.08` `[P5]` `M W` WhatsApp notifications
- [ ] `PAT-7.09` `[P5]` `M W` Per-category notification preferences
- [ ] `PAT-7.10` `[P1]` `M` Appointment reminders
- [ ] `PAT-7.11` `[P1]` `M` Queue notifications
- [ ] `PAT-7.12` `[P2]` `M` Prescription notifications
- [ ] `PAT-7.13` `[P3]` `M` Lab result notifications
- [ ] `PAT-7.14` `[P3]` `M` Payment notifications
- [ ] `PAT-7.15` `[P1]` `M` **Android channel per category** (mute billing, not "your turn")
- [ ] `PAT-7.16` `[P1]` `M` **Deep link from notification to the exact screen**

## 1.8 App updates (Android)

- [ ] `PAT-8.01` `[P1]` `M` OTA updates via EAS Update for JS-only changes
- [ ] `PAT-8.02` `[P1]` `M` Store prompt for native changes (Play In-App Updates)
- [ ] `PAT-8.03` `[P1]` `M` **Check on foreground, download in background, apply on next cold start**
- [ ] `PAT-8.04` `[P1]` `M` Never swap the bundle during an active live-queue session
- [ ] `PAT-8.05` `[P1]` `S` `minSupportedVersion` endpoint plus blocking update screen
- [ ] `PAT-8.06` `[P1]` `M` Update channel per release track

## 1.9 Patient AI

- [ ] `PAT-9.01` `[P4]` `M W` Patient AI copilot
- [ ] `PAT-9.02` `[P4]` `M W` Appointment and queue queries
- [ ] `PAT-9.03` `[P4]` `M W` Prescription explanation
- [ ] `PAT-9.04` `[P4]` `M W` Laboratory result explanation
- [ ] `PAT-9.05` `[P4]` `M W` Medication information
- [ ] `PAT-9.06` `[P4]` `M W` Hospital service discovery
- [ ] `PAT-9.07` `[P4]` `S` **Authorization enforced in the tool layer, not the prompt**
- [ ] `PAT-9.08` `[P4]` `M W` Non-diagnostic boundaries visible in the UI
- [ ] `PAT-9.09` `[P4]` `S` Escalation: clinical question becomes "ask your doctor"
- [ ] `PAT-9.10` `[P4]` `M W` **AI processing notice and opt-out** that does not disable anything else

---

# 2. DOCTOR `DOC`

## 2.1 Account and professional profile

- [ ] `DOC-1.01` `[P0]` `D W` Doctor sign in
- [ ] `DOC-1.02` `[P0]` `D W` Secure session management
- [ ] `DOC-1.03` `[P0]` `D W` Doctor profile
- [ ] `DOC-1.04` `[P1]` `D W` Specialization and qualifications
- [ ] `DOC-1.05` `[P1]` `D W` **Registration number** (required before prescribing; snapshotted onto every signature)
- [ ] `DOC-1.06` `[P1]` `D W` Consultation fee
- [ ] `DOC-1.07` `[P1]` `D W` Hospital and department assignment
- [ ] `DOC-1.08` `[P1]` `D W` Room assignment
- [ ] `DOC-1.09` `[P1]` `D W` Availability status
- [ ] `DOC-1.10` `[P1]` `D` Attendance check-in and check-out
- [ ] `DOC-1.11` `[P1]` `D W` Leave management

## 2.2 Schedule and queue

- [ ] `DOC-2.01` `[P1]` `D` View daily schedule
- [ ] `DOC-2.02` `[P1]` `D` View appointments and walk-in queue, merged
- [ ] `DOC-2.03` `[P1]` `D` **Priority ordering:** Emergency, Disabled, Pregnant, Elderly, Standard
- [ ] `DOC-2.04` `[P1]` `S` Emergency priority settable only by `DOCTOR`, `NURSE`, `HOSPITAL_ADMIN`, always audited
- [ ] `DOC-2.05` `[P1]` `D` Call next patient
- [ ] `DOC-2.06` `[P1]` `D` Skip or defer **with audit trail**
- [ ] `DOC-2.07` `[P1]` `D` Recall patient
- [ ] `DOC-2.08` `[P1]` `D` Start consultation
- [ ] `DOC-2.09` `[P1]` `D` Pause and resume consultation
- [ ] `DOC-2.10` `[P1]` `D` Complete consultation
- [ ] `DOC-2.11` `[P1]` `S` `consultation.completed` carries the **fee snapshot**
- [ ] `DOC-2.12` `[P1]` `D` Realtime queue synchronization

## 2.3 Patient clinical workspace

- [ ] `DOC-3.01` `[P2]` `D W` Search patient
- [ ] `DOC-3.02` `[P2]` `D W` View demographics
- [ ] `DOC-3.03` `[P2]` `D W` View medical history
- [ ] `DOC-3.04` `[P2]` `D W` View allergies
- [ ] `DOC-3.05` `[P2]` `D W` View chronic conditions
- [ ] `DOC-3.06` `[P2]` `D W` View current medications
- [ ] `DOC-3.07` `[P2]` `D W` View previous consultations and prescriptions
- [ ] `DOC-3.08` `[P2]` `D W` View uploaded documents
- [ ] `DOC-3.09` `[P2]` `D W` View patient timeline
- [ ] `DOC-3.10` `[P2]` `S` **Ownership check:** active consultation at this hospital or an explicit grant. Role alone is not access
- [ ] `DOC-3.11` `[P2]` `S` Every access emits `phi.accessed` and is audit-logged
- [ ] `DOC-3.12` `[P3]` `D W` View laboratory results

## 2.4 Patient sheet

- [ ] `DOC-4.01` `[P2]` `S` Auto-generate on `queue.patient.near_turn`
- [ ] `DOC-4.02` `[P2]` `S` **Idempotent on `(consultationId, tokenVersion)`**; skip and recall cannot duplicate or staledate it
- [ ] `DOC-4.03` `[P2]` `S` Contents: demographics, allergies, conditions, current medications, recent labs, previous visits
- [ ] `DOC-4.04` `[P2]` `S` Rendered to screen and PDF
- [ ] `DOC-4.05` `[P2]` `S` `patient_sheet.ready` published, delivered to the desktop over WS
- [ ] `DOC-4.06` `[P2]` `D` View patient sheet (deterministic template)
- [ ] `DOC-4.07` `[P4]` `S` Agent version **scored against the P2 deterministic baseline**

## 2.5 Consultation

- [ ] `DOC-5.01` `[P2]` `D` Record chief complaint
- [ ] `DOC-5.02` `[P2]` `D` Record symptoms
- [ ] `DOC-5.03` `[P2]` `D` Record vitals
- [ ] `DOC-5.04` `[P2]` `D` Record examination findings
- [ ] `DOC-5.05` `[P2]` `D` Record assessment
- [ ] `DOC-5.06` `[P2]` `D` Record diagnosis
- [ ] `DOC-5.07` `[P2]` `D` Create SOAP notes
- [ ] `DOC-5.08` `[P2]` `D` Add clinical notes
- [ ] `DOC-5.09` `[P2]` `D` Add follow-up instructions
- [ ] `DOC-5.10` `[P2]` `D` Review and finalize
- [ ] `DOC-5.11` `[P2]` `S` Content record keyed to the `scheduling` consultation id; `clinical` never changes consultation state

## 2.6 Prescription

- [ ] `DOC-6.01` `[P2]` `D` Create prescription
- [ ] `DOC-6.02` `[P2]` `D` Add medicines, dosage, frequency, duration, instructions
- [ ] `DOC-6.03` `[P2]` `D` **Allergy alerts** against recorded allergies
- [ ] `DOC-6.04` `[P2]` `D` **Drug-interaction alerts** against current medications
- [ ] `DOC-6.05` `[P2]` `S` **Signature attestation:** doctor id, name, registration number, timestamp, SHA-256 content hash, written to the audit log
- [ ] `DOC-6.06` `[P2]` `S` Generate the prescription PDF with the attestation rendered on it
- [ ] `DOC-6.07` `[P2]` `S` **PDF written once, never regenerated.** A correction is a new superseding prescription
- [ ] `DOC-6.08` `[P2]` `S` Golden-file PDF test with pinned `CreationDate`, `ModDate`, and document id
- [ ] `DOC-6.09` `[P3]` `D` **Live stock check**, advisory only: a pharmacy outage shows "availability unknown" and never blocks prescribing

## 2.7 Laboratory

- [ ] `DOC-7.01` `[P3]` `D` Create laboratory test order
- [ ] `DOC-7.02` `[P3]` `D` View pending orders
- [ ] `DOC-7.03` `[P3]` `D` View completed results
- [ ] `DOC-7.04` `[P3]` `D` Review result history and trends
- [ ] `DOC-7.05` `[P3]` `D` Abnormal-result indicators
- [ ] `DOC-7.06` `[P3]` `D` Record follow-up action

## 2.8 Doctor communication

- [ ] `DOC-8.01` `[P1]` `D` Appointment notifications
- [ ] `DOC-8.02` `[P1]` `D` Queue updates
- [ ] `DOC-8.03` `[P2]` `D` Patient-ready notification
- [ ] `DOC-8.04` `[P1]` `D` Critical operational alerts

## 2.9 Doctor AI

- [ ] `DOC-9.01` `[P4]` `D` Clinical scribe
- [ ] `DOC-9.02` `[P4]` `D` Patient sheet summarization
- [ ] `DOC-9.03` `[P4]` `S` Controlled history retrieval
- [ ] `DOC-9.04` `[P4]` `S` Controlled medication and allergy retrieval
- [ ] `DOC-9.05` `[P4]` `D` Consultation note drafting
- [ ] `DOC-9.06` `[P4]` `D` **AI output review before saving**
- [ ] `DOC-9.07` `[P4]` `D` **Explicit signature for every AI-originated clinical write**
- [ ] `DOC-9.08` `[P4]` `S` AI audit trail: model, prompt hash, tools, tokens, latency, accepted or edited
- [ ] `DOC-9.09` `[P4]` `S` **Provider outage degrades to the deterministic sheet and manual notes**

---

# 3. RECEPTION `REC`

## 3.1 Patient intake

- [ ] `REC-1.01` `[P1]` `D` Walk-in registration
- [ ] `REC-1.02` `[P1]` `D` Appointment check-in
- [ ] `REC-1.03` `[P1]` `D` Patient lookup
- [ ] `REC-1.04` `[P1]` `D` Quick-create for first-time walk-ins
- [ ] `REC-1.05` `[P1]` `D` Token generation
- [ ] `REC-1.06` `[P1]` `D` **Thermal token printing (ESC/POS)**
- [ ] `REC-1.07` `[P1]` `D` Browser print fallback when no printer is configured
- [ ] `REC-1.08` `[P1]` `D` Validate against 2 or 3 common printer models

## 3.2 Queue control

- [ ] `REC-2.01` `[P1]` `D` Call next, skip, recall
- [ ] `REC-2.02` `[P1]` `D` Merge appointment and walk-in queues
- [ ] `REC-2.03` `[P1]` `D` Reassign between doctors
- [ ] `REC-2.04` `[P1]` `D` Queue monitoring
- [ ] `REC-2.05` `[P1]` `D` Queue correction **with audit trail**

## 3.3 Doctor operations

- [ ] `REC-3.01` `[P1]` `D` Doctor availability board
- [ ] `REC-3.02` `[P1]` `D` Room assignment
- [ ] `REC-3.03` `[P1]` `D` Mark doctor arrived and departed

## 3.4 Billing counter

- [ ] `REC-4.01` `[P3]` `D` Generate invoice **from the fee snapshot**
- [ ] `REC-4.02` `[P3]` `D` Collect payment (cash, card, UPI, online)
- [ ] `REC-4.03` `[P3]` `D` Record offline payment
- [ ] `REC-4.04` `[P3]` `D` Process refund
- [ ] `REC-4.05` `[P3]` `D` Transaction history
- [ ] `REC-4.06` `[P3]` `D` Day-close reconciliation, cut on the hospital timezone

## 3.5 Pharmacy counter

- [ ] `REC-5.01` `[P3]` `D` Dispensing workflow against a prescription
- [ ] `REC-5.02` `[P3]` `S` **Stock decrements on dispense, never on prescribe**
- [ ] `REC-5.03` `[P3]` `S` Transactional stock write; two counters cannot dispense the same last unit
- [ ] `REC-5.04` `[P3]` `D` Stock updates and low-stock alerts

## 3.6 Desktop client operations

- [ ] `REC-6.01` `[P1]` `D` **Offline read:** cached queue, appointment, and prescription state
- [ ] `REC-6.02` `[P1]` `D` **Offline write:** walk-in registration and check-in queued locally, replayed with idempotency keys
- [ ] `REC-6.03` `[P1]` `D` Payment capture explicitly disabled offline, with a clear message
- [ ] `REC-6.04` `[P1]` `D` **Auto-update applies on quit, never mid-consultation**
- [ ] `REC-6.05` `[P1]` `D` Check on launch and every 4 hours, background download
- [ ] `REC-6.06` `[P1]` `D` **Staged rollout percentage**
- [ ] `REC-6.07` `[P1]` `D` `stable` and `beta` channels
- [ ] `REC-6.08` `[P1]` `D` **Signed installers (Windows EV certificate)**
- [ ] `REC-6.09` `[P1]` `D` Crash reporting and stuck-queue self-recovery

## 3.7 Operational analytics

- [ ] `REC-7.01` `[P5]` `D W` Average wait time
- [ ] `REC-7.02` `[P5]` `D W` Peak hours
- [ ] `REC-7.03` `[P5]` `D W` Revenue
- [ ] `REC-7.04` `[P5]` `D W` Doctor utilization
- [ ] `REC-7.05` `[P5]` `D W` No-show analysis
- [ ] `REC-7.06` `[P5]` `D W` Queue performance

---

# 4. NURSE `NUR`

- [ ] `NUR-01` `[P3]` `D` Record vitals into the consultation record
- [ ] `NUR-02` `[P3]` `D` Patient preparation workflow
- [ ] `NUR-03` `[P3]` `D` Queue assist: call and recall on the doctor's behalf
- [ ] `NUR-04` `[P3]` `D` View patient sheet read-only
- [ ] `NUR-05` `[P3]` `D` Triage flag for emergency priority (audited)
- [ ] `NUR-06` `[P0]` `S` `NURSE` role present in the authorization model from P0

# 5. PHARMACIST `PHA`

- [ ] `PHA-01` `[P3]` `D W` Dispense against a prescription
- [ ] `PHA-02` `[P3]` `D W` Mark partially dispensed
- [ ] `PHA-03` `[P3]` `D W` Substitute with doctor confirmation
- [ ] `PHA-04` `[P3]` `D W` Inventory and stock movement
- [ ] `PHA-05` `[P3]` `D W` Batch and expiry tracking
- [ ] `PHA-06` `[P3]` `D W` Low-stock alerts
- [ ] `PHA-07` `[P3]` `D W` Pharmacy order fulfilment
- [ ] `PHA-08` `[P3]` `D W` Inventory reports
- [ ] `PHA-09` `[P3]` `S` **All stock writes transactional.** No overselling
- [ ] `PHA-10` `[P0]` `S` `PHARMACIST` role present in the authorization model from P0

# 6. LAB TECHNICIAN `LAB`

- [ ] `LAB-01` `[P3]` `D W` View assigned laboratory orders
- [ ] `LAB-02` `[P3]` `D W` Record sample collection
- [ ] `LAB-03` `[P3]` `D W` Enter results
- [ ] `LAB-04` `[P3]` `D W` Upload result documents
- [ ] `LAB-05` `[P3]` `D W` Verification workflow: entered, verified, released
- [ ] `LAB-06` `[P3]` `S` **Results visible to the patient only on release**
- [ ] `LAB-07` `[P3]` `D W` Result history
- [ ] `LAB-08` `[P3]` `D W` Flag abnormal values
- [ ] `LAB-09` `[P3]` `S` Per-test SLA timer, default 24h routine and 2h urgent, feeding the SLA alert
- [ ] `LAB-10` `[P0]` `S` `LAB_TECH` role present in the authorization model from P0

---

# 7. HOSPITAL ADMIN `HAD`

## 7.1 Dashboards

- [ ] `HAD-1.01` `[P1]` `W` Admin dashboard shell
- [ ] `HAD-1.02` `[P1]` `W` Hospital and department overview
- [ ] `HAD-1.03` `[P1]` `W` Doctor availability overview
- [ ] `HAD-1.04` `[P1]` `W` Appointment overview
- [ ] `HAD-1.05` `[P1]` `W` Live queue overview
- [ ] `HAD-1.06` `[P1]` `W` System health overview
- [ ] `HAD-1.07` `[P3]` `W` Billing overview
- [ ] `HAD-1.08` `[P3]` `W` Pharmacy overview
- [ ] `HAD-1.09` `[P3]` `W` Laboratory overview
- [ ] `HAD-1.10` `[P5]` `W` Notification delivery overview

## 7.2 Hospital management

- [ ] `HAD-2.01` `[P1]` `W` Create and update hospital
- [ ] `HAD-2.02` `[P1]` `W` Hospital profile
- [ ] `HAD-2.03` `[P1]` `W` Branches and facilities
- [ ] `HAD-2.04` `[P1]` `W` Departments
- [ ] `HAD-2.05` `[P1]` `W` Rooms
- [ ] `HAD-2.06` `[P1]` `W` Services
- [ ] `HAD-2.07` `[P1]` `W` Consultation fee configuration, versioned so snapshots are resolvable
- [ ] `HAD-2.08` `[P1]` `W` Operating hours
- [ ] `HAD-2.09` `[P1]` `W` Holiday configuration
- [ ] `HAD-2.10` `[P1]` `W` **Timezone (required).** Defines the token day and every reporting cut
- [ ] `HAD-2.11` `[P1]` `W` Queue configuration: N-away value, missed-turn hold, rejoin policy

## 7.3 Staff and doctor management

- [ ] `HAD-3.01` `[P1]` `W` Create doctor account
- [ ] `HAD-3.02` `[P1]` `W` Update doctor profile
- [ ] `HAD-3.03` `[P1]` `W` Assign doctor to department and hospital
- [ ] `HAD-3.04` `[P1]` `W` Configure doctor schedule
- [ ] `HAD-3.05` `[P1]` `W` Configure availability
- [ ] `HAD-3.06` `[P1]` `W` Manage attendance
- [ ] `HAD-3.07` `[P1]` `W` Manage leave
- [ ] `HAD-3.08` `[P1]` `W` Manage staff accounts
- [ ] `HAD-3.09` `[P1]` `W` Assign staff roles
- [ ] `HAD-3.10` `[P1]` `W` Role and permission management
- [ ] `HAD-3.11` `[P1]` `W` Activate and deactivate users

## 7.4 Appointment and queue administration

- [ ] `HAD-4.01` `[P1]` `W` View and search all appointments
- [ ] `HAD-4.02` `[P1]` `W` Create appointment on behalf of a patient
- [ ] `HAD-4.03` `[P1]` `W` Reschedule and cancel
- [ ] `HAD-4.04` `[P1]` `W` Manage waitlists
- [ ] `HAD-4.05` `[P1]` `W` Register walk-in and generate token
- [ ] `HAD-4.06` `[P1]` `W` Correct queue issues **with audit trail**
- [ ] `HAD-4.07` `[P1]` `W` Configure queue and token-ordering rules
- [ ] `HAD-4.08` `[P1]` `W` Monitor queue wait times

## 7.5 Patient administration

- [ ] `HAD-5.01` `[P2]` `W` Search patients
- [ ] `HAD-5.02` `[P2]` `W` View demographic profile
- [ ] `HAD-5.03` `[P2]` `W` Update non-clinical information
- [ ] `HAD-5.04` `[P2]` `W` Manage patient documents
- [ ] `HAD-5.05` `[P2]` `W` Handle support requests
- [ ] `HAD-5.06` `[P2]` `W` **Merge duplicate registrations** within one hospital
- [ ] `HAD-5.07` `[P2]` `W` **Merge patient identities globally:** two-person approval, before-and-after snapshot, reversal window, distinct audit event

## 7.6 Clinical access boundary

- [ ] `HAD-6.01` `[P2]` `S` **No standing clinical read for any administrative role**
- [ ] `HAD-6.02` `[P2]` `W` **Break-glass request:** typed reason, one named patient, bounded window
- [ ] `HAD-6.03` `[P2]` `S` Break-glass notifies the patient
- [ ] `HAD-6.04` `[P2]` `S` Break-glass writes a distinct audit event type
- [ ] `HAD-6.05` `[P6]` `W` Weekly break-glass review queue

## 7.7 Billing administration

- [ ] `HAD-7.01` `[P3]` `W` Create billing records
- [ ] `HAD-7.02` `[P3]` `W` View invoices
- [ ] `HAD-7.03` `[P3]` `W` Configure pricing
- [ ] `HAD-7.04` `[P3]` `W` Record offline payments
- [ ] `HAD-7.05` `[P3]` `W` View online payment status
- [ ] `HAD-7.06` `[P3]` `W` Process refunds
- [ ] `HAD-7.07` `[P3]` `W` Payment history
- [ ] `HAD-7.08` `[P3]` `W` Billing reports and financial reconciliation
- [ ] `HAD-7.09` `[P3]` `W` Payment audit logs

## 7.8 Pharmacy and inventory administration

- [ ] `HAD-8.01` `[P3]` `W` Manage medicines and products
- [ ] `HAD-8.02` `[P3]` `W` Product catalog
- [ ] `HAD-8.03` `[P3]` `W` Stock levels
- [ ] `HAD-8.04` `[P3]` `W` Receive stock
- [ ] `HAD-8.05` `[P3]` `W` Stock adjustments
- [ ] `HAD-8.06` `[P3]` `W` Stock movement history
- [ ] `HAD-8.07` `[P3]` `W` Low-stock alerts
- [ ] `HAD-8.08` `[P3]` `W` Prescription fulfilment and pharmacy orders
- [ ] `HAD-8.09` `[P3]` `W` Inventory reports

## 7.9 Laboratory administration

- [ ] `HAD-9.01` `[P3]` `W` Manage laboratory tests
- [ ] `HAD-9.02` `[P3]` `W` Test catalog **with a per-test SLA**
- [ ] `HAD-9.03` `[P3]` `W` Lab workflow configuration
- [ ] `HAD-9.04` `[P3]` `W` Assign laboratory orders
- [ ] `HAD-9.05` `[P3]` `W` Record and verify results
- [ ] `HAD-9.06` `[P3]` `W` Upload result documents
- [ ] `HAD-9.07` `[P3]` `W` Result history

## 7.10 Audit, security, and compliance

- [ ] `HAD-10.01` `[P0]` `S` RBAC and permission management
- [ ] `HAD-10.02` `[P2]` `S` **Cross-service audit index** built from `audit.recorded`
- [ ] `HAD-10.03` `[P6]` `W` Audit log viewer
- [ ] `HAD-10.04` `[P6]` `W` Login and security event history
- [ ] `HAD-10.05` `[P6]` `W` PHI access auditing
- [ ] `HAD-10.06` `[P6]` `W` Data export controls
- [ ] `HAD-10.07` `[P6]` `S` **Retention policy:** clinical per statute, audit 7 years, operational logs 90 days
- [ ] `HAD-10.08` `[P6]` `S` **DPDP erasure:** remove identifiers, AI memory, and marketing data; retain statutorily required clinical records de-identified, and tell the patient so
- [ ] `HAD-10.09` `[P2]` `S` Secure file access controls (presigned, short TTL)
- [ ] `HAD-10.10` `[P6]` `W` Rate-limit and abuse monitoring

## 7.11 Reporting and analytics

- [ ] `HAD-11.01` `[P5]` `W` Appointment reports
- [ ] `HAD-11.02` `[P5]` `W` Queue performance reports
- [ ] `HAD-11.03` `[P5]` `W` Doctor utilization reports
- [ ] `HAD-11.04` `[P5]` `W` Patient volume reports
- [ ] `HAD-11.05` `[P5]` `W` Billing and payment reports
- [ ] `HAD-11.06` `[P5]` `W` Pharmacy inventory reports
- [ ] `HAD-11.07` `[P5]` `W` Laboratory reports
- [ ] `HAD-11.08` `[P5]` `W` Notification delivery reports
- [ ] `HAD-11.09` `[P5]` `W` Operational KPI dashboard
- [ ] `HAD-11.10` `[P5]` `W` Export reports

## 7.12 Admin AI

- [ ] `HAD-12.01` `[P4]` `W` Operations analyst
- [ ] `HAD-12.02` `[P4]` `W` Appointment and queue analytics queries
- [ ] `HAD-12.03` `[P4]` `W` Operations summaries
- [ ] `HAD-12.04` `[P4]` `W` Billing analytics
- [ ] `HAD-12.05` `[P4]` `W` Doctor availability analysis
- [ ] `HAD-12.06` `[P4]` `S` **Parameterized, allowlisted queries only.** No free-form SQL
- [ ] `HAD-12.07` `[P4]` `S` **Cannot reach clinical content, ever**
- [ ] `HAD-12.08` `[P4]` `S` AI usage and audit logging

## 7.13 Communication management

- [ ] `HAD-13.01` `[P5]` `W` Notification templates
- [ ] `HAD-13.02` `[P5]` `W` Push configuration
- [ ] `HAD-13.03` `[P5]` `W` SMS configuration, including DLT template ids
- [ ] `HAD-13.04` `[P5]` `W` Email configuration
- [ ] `HAD-13.05` `[P5]` `W` WhatsApp configuration
- [ ] `HAD-13.06` `[P5]` `W` Notification preference policy per hospital
- [ ] `HAD-13.07` `[P5]` `W` Delivery status monitoring
- [ ] `HAD-13.08` `[P5]` `W` Failed-notification retry handling and DLQ visibility

---

# 8. PLATFORM ADMIN `PAD`

- [ ] `PAD-01` `[P1]` `W` Create and suspend hospitals
- [ ] `PAD-02` `[P1]` `W` Tenancy configuration
- [ ] `PAD-03` `[P1]` `W` Global feature flags
- [ ] `PAD-04` `[P1]` `W` Cross-hospital system health
- [ ] `PAD-05` `[P1]` `W` Platform-wide audit search
- [ ] `PAD-06` `[P1]` `W` Deployed image version per environment
- [ ] `PAD-07` `[P1]` `S` **No clinical data access, with or without break-glass.** Tested as a negative

---

# 9. SHARED PLATFORM `PLT`

## 9.1 Security

- [ ] `PLT-1.01` `[P0]` **RS256 JWT.** Private key only in `identity`
- [ ] `PLT-1.02` `[P0]` Refresh-token rotation with reuse detection revoking the family
- [ ] `PLT-1.03` `[P0]` Session truth in Postgres; Redis holds only a rebuildable revocation set
- [ ] `PLT-1.04` `[P0]` RBAC across all 8 roles
- [ ] `PLT-1.05` `[P0]` **Gateway strips every inbound `x-user-*` header**
- [ ] `PLT-1.06` `[P0]` **Services verify the JWT themselves** (defense in depth)
- [ ] `PLT-1.07` `[P0]` Gateway is the only public surface; everything else `ClusterIP`
- [ ] `PLT-1.08` `[P0]` argon2id passwords, with transparent rehash of any ported bcrypt hash on login
- [ ] `PLT-1.09` `[P0]` Rate limiting
- [ ] `PLT-1.10` `[P0]` Input validation (zod at every boundary)
- [ ] `PLT-1.11` `[P0]` **PHI redaction in the logger**
- [ ] `PLT-1.12` `[P0]` Audit logging in every service
- [ ] `PLT-1.13` `[P2]` **Ownership checks**, not just role checks
- [ ] `PLT-1.14` `[P1]` Service-to-service authentication
- [ ] `PLT-1.15` `[P1]` NetworkPolicy default-deny
- [ ] `PLT-1.16` `[P0]` Encryption in transit
- [ ] `PLT-1.17` `[P1]` Encryption at rest
- [ ] `PLT-1.18` `[P0]` **The negative-test suite** in [architecture.md 7.1](./architecture.md), all 8 cases

## 9.2 Platform

- [ ] `PLT-2.01` `[P0]` Shared zod contracts package
- [ ] `PLT-2.02` `[P0]` Standard error response format
- [ ] `PLT-2.03` `[P0]` Correlation ids propagated end to end
- [ ] `PLT-2.04` `[P1]` Realtime WebSocket updates
- [ ] `PLT-2.05` `[P1]` **Redis pub/sub fanout across gateway replicas**
- [ ] `PLT-2.06` `[P1]` RabbitMQ event processing with per-consumer DLQs
- [ ] `PLT-2.07` `[P1]` **Delayed publish** (`x-delay`), with the per-TTL-queue fallback documented
- [ ] `PLT-2.08` `[P1]` Recurring sweeps as Kubernetes CronJobs publishing one message
- [ ] `PLT-2.09` `[P1]` Redis caching
- [ ] `PLT-2.10` `[P2]` Private buckets plus presigned URLs
- [ ] `PLT-2.11` `[P2]` PDF generation with embedded Noto Devanagari
- [ ] `PLT-2.12` `[P1]` Search (Postgres FTS)
- [ ] `PLT-2.13` `[P1]` Notification service: in-app, push, SMS, email; WhatsApp in P5

## 9.3 Data integrity

- [ ] `PLT-3.01` `[P0]` `hospitalId` applied in the repository layer, never a route handler
- [ ] `PLT-3.02` `[P0]` Documented list of global versus hospital-scoped entities, enforced in review
- [ ] `PLT-3.03` `[P1]` **Unique queue token constraint**
- [ ] `PLT-3.04` `[P1]` **Sequence or insert-retry token generation**
- [ ] `PLT-3.05` `[P1]` Hospital-timezone-derived `tokenDate`
- [ ] `PLT-3.06` `[P1]` Idempotency keys on booking, token, payment, refund, dispense
- [ ] `PLT-3.07` `[P1]` **Idempotent consumers** on `messageId`
- [ ] `PLT-3.08` `[P3]` Transactional inventory writes

## 9.4 Operations

- [ ] `PLT-4.01` `[P0]` Structured JSON logging to stdout
- [ ] `PLT-4.02` `[P0]` Health and readiness endpoints (`/health/live`, `/health/ready`)
- [ ] `PLT-4.03` `[P0]` CI/CD publishing to **Docker Hub**
- [ ] `PLT-4.04` `[P0]` ECR publish job written and **commented out**
- [ ] `PLT-4.05` `[P0]` **`pnpm test` as a required PR check**
- [ ] `PLT-4.06` `[P1]` Metrics, dashboards, and the alert set
- [ ] `PLT-4.07` `[P1]` Distributed tracing
- [ ] `PLT-4.08` `[P0]` Production deployment and rollback by image digest
- [ ] `PLT-4.09` `[P1]` Backups: Postgres to an S3-compatible target, bucket versioning
- [ ] `PLT-4.10` `[P1]` **All-in-one image boots all 8 services from one digest** (CI smoke)
- [ ] `PLT-4.11` `[P6]` Load test: 500 concurrent queue watchers per hospital
- [ ] `PLT-4.12` `[P6]` External penetration test
- [ ] `PLT-4.13` `[P6]` Quarterly restore drill within RTO
- [ ] `PLT-4.14` `[P6]` Runbook for every alert that pages someone

## 9.5 Portability (cloud-agnostic)

- [ ] `PLT-5.01` `[P0]` `packages/platform` interfaces: storage, secrets, email, sms, push, whatsapp, payments, llm
- [ ] `PLT-5.02` `[P0]` `packages/platform-generic` implementations (S3-compatible, SMTP, HTTP)
- [ ] `PLT-5.03` `[P0]` `packages/platform-aws` isolated; **the only package allowed to import an AWS SDK**
- [ ] `PLT-5.04` `[P0]` **ESLint `no-restricted-imports` gate** on cloud SDKs, failing the PR
- [ ] `PLT-5.05` `[P0]` Helm base chart contains no cloud-specific annotation, class, or ARN
- [ ] `PLT-5.06` `[P0]` `values-portable.yaml` and `values-aws.yaml` profiles
- [ ] `PLT-5.07` `[P0]` **`check-portable-chart.sh`**: rendered portable chart contains no AWS string
- [ ] `PLT-5.08` `[P0]` **CI deploys the `portable` profile to kind on every merge and runs the loop smoke test**
- [ ] `PLT-5.09` `[P0]` Terraform split: `modules/kubernetes` (agnostic) and `modules/aws`
- [ ] `PLT-5.10` `[P1]` `single-host` Compose profile boots from the published image with no cloud credentials
- [ ] `PLT-5.11` `[P1]` RabbitMQ self-hosted image with the delayed-message plugin, used on every profile
- [ ] `PLT-5.12` `[P1]` MinIO deployable in-cluster; S3 selectable by configuration alone
- [ ] `PLT-5.13` `[P1]` ingress-nginx and cert-manager on every profile, including AWS
- [ ] `PLT-5.14` `[P1]` Self-hosted Prometheus, Loki, and Tempo; no CloudWatch dependency
- [ ] `PLT-5.15` `[P4]` LLM endpoint configurable to a self-hosted OpenAI-compatible server
- [ ] `PLT-5.16` `[P6]` Quarterly single-host drill on a clean VM with no cloud credentials present
