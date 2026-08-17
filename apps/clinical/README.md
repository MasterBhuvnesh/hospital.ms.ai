# apps/clinical

**Port 5004.** Patient records, consultation content, prescriptions, lab orders and results, consent.

Owns the `clinical` Postgres schema and reads no other.

## Goal

Hold the medical truth about a person, and control who may see it. Everything here is either a fact about a patient's body or a document a clinician signed, which makes this the service where a bug is a legal problem rather than an outage.

Its second job is speed at exactly one moment: the patient sheet must be on the doctor's screen before the patient sits down. That is what turns a record system into a queue product.

## What it must do

| Capability | Phase | Notes |
|---|---|---|
| Patient identity, demographics, contact | P2 | Global, one clinical identity per person |
| Allergies, chronic conditions, current medications | P2 | Global. Not a per-hospital fact |
| Patient hospital registrations | P2 | Hospital-scoped. This is the per-visit relationship |
| Consultation content: complaint, findings, diagnosis, notes | P2 | The state machine lives in `scheduling` |
| Patient sheet generation on `queue.patient.near_turn` | P2 | Idempotent on `(consultationId, tokenVersion)` |
| Prescriptions, with a signed attestation | P2 | Signature is an attestation record, not a PKI signature |
| Prescription PDF, written to object storage exactly once | P2 | Embedded Noto Sans and Noto Sans Devanagari |
| Lab order creation and SLA timers | P2 | |
| Sample collection and result entry | P2 | |
| Result release, distinct from result entry | P2 | Entered is not released. Only released is visible to the patient |
| Consent grant and revoke | P2 | The patient's own control over cross-hospital visibility |
| Break-glass access, with reason and patient notification | P2 | The emergency path, and the most audited one |
| Document upload and sharing by grant | P3 | |

## Conditions

- **Patients are global; visits are hospital-scoped.** A patient's allergy list is not per-hospital. Their registration, consultation, prescription and lab order all are.
- **Global storage does not mean global visibility.** A hospital sees a patient's history only through an active consultation at that hospital or an explicit patient grant. Registering at hospital B does not expose the record from hospital A. This is the single rule this service exists to enforce.
- **Role is not access.** `DOCTOR` alone opens nothing. The access decision is made here, in the repository layer, and every route that returns clinical data ships with its negative test.
- **Break-glass is allowed, silent break-glass is not.** It requires a recorded reason, it publishes `phi.accessed`, and the patient is notified. An emergency override nobody can see afterwards is indistinguishable from a breach.
- **A released result is a different thing from an entered result.** Never show a patient a value that has not been released by the responsible person.
- **A signed prescription is immutable.** The attestation records `doctorId`, name, registration number, timestamp and a SHA-256 `contentHash`. A correction is a new prescription that supersedes the old one, never an edit. Any later alteration is detectable because the hash will not match.
- **Patient sheet generation is idempotent on `(consultationId, tokenVersion)`.** `queue.patient.near_turn` fires more than once for the same patient because of skip, recall and reassignment. A newer `tokenVersion` supersedes; an equal one is a no-op.
- **No PHI in logs, ever.** Use `@hms/logger`, which applies the pino redaction paths. This is the service where `console.log` during debugging becomes a disclosure.

## Allowed and not allowed

| Allowed | Not allowed |
|---|---|
| Own patients, clinical facts, consultation content, prescriptions, lab data | Own consultation state, appointments or tokens |
| Decide who may read a patient record | Trust a role claim from the token as sufficient |
| Publish `prescription.signed` and make it available at the pharmacy counter | Move stock. Dispensing is `commerce` |
| Generate and store PDFs | Email them. Delivery is `comms` |
| Accept an AI-drafted note as a draft | Persist any AI output as a clinical record without a human signature |
| Read a stock level from `commerce` as advisory during prescribing | Fail a prescription because that advisory call failed |

## Layout

```
src/
  modules/           business domains, not technical layers
  consumers/         RabbitMQ inbound, idempotent on messageId
  publishers/        RabbitMQ outbound
  infrastructure/    redis, postgres wiring
  app.ts             builds the Fastify instance (testable)
  server.ts          binds the port (never imported by tests)
```

## Build

```bash
docker build -f apps/clinical/Dockerfile -t hms-clinical:$(git rev-parse --short HEAD) .
docker run -p 5004:5004 --env-file envs/.env.container hms-clinical:$SHA

pnpm dev --filter @hms/clinical
```

This image embeds the fonts its PDF templates need. Also included in the all-in-one image (`docker/Dockerfile`) with `SERVICE=clinical`.

See [`docs/architecture.md`](../../docs/architecture.md) sections 5.2, 6.2 and 7, and [`docs/tech-stack.md`](../../docs/tech-stack.md) sections 5.1 and 5.11.
