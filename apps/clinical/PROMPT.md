# PROMPT — `@hms/clinical`

**Read [`.github/AGENT_PROMPT.md`](../../.github/AGENT_PROMPT.md) first.** It holds
the rules, the stack, the file shape, and the definition of done. This file holds
only what is specific to `clinical`.

**Read [`.github/RULES.md`](../../.github/RULES.md) too.** It is binding.

---

## What this service owns

Patient records, allergies, conditions, medications, consultation **content**,
SOAP notes, prescriptions, lab orders and results, patient sheets, documents, and
consent grants.

**This service holds the PHI.** Every rule in
[`.github/RULES.md`](../../.github/RULES.md) about logging, access, and audit
applies here first and hardest. Assume every line you write will be read during an
audit.

## Access control, which is the hard part

A `doctor` role **does not** imply access to a patient. Access requires an active
consultation or an explicit consent grant. Build that check once, in the
repository layer, and route every read through it. If the check lives in route
handlers you will miss one, and the one you miss is the incident.

Every PHI read publishes `phi.accessed`. Break-glass access notifies the patient.

## State: a stub

16 lines and a health route.

## What to build, in order

1. **Patient records, allergies, conditions, medications.** Allergies and current
   medications are the two fields that must never be wrong or stale; everything
   else in the record is context.
2. **The access check** described above, plus consent grants and revocation.
3. **Consultation content**, opened by consuming `consultation.started` and closed
   by `consultation.completed`. Never write consultation *state*.
4. **The deterministic patient sheet.** Consume `queue.patient.near_turn`, build
   the sheet, publish `patient_sheet.ready`. Deterministic means a template over
   real data, with no model involved. The AI version is a later phase and a
   separate service.
5. **Prescriptions, signed.** `prescription.signed` carries the PDF for the
   patient and makes it available at the pharmacy counter, but it moves **no
   stock**. Dispensing belongs to `commerce`.
6. **Lab orders, sample collection, results, and the verification workflow.**
   `lab.result.released` fires on **release**, never on entry. An unverified
   result must never reach a patient's phone.
7. **Publish `consultation.content.saved`** as the AI memory extraction candidate.

## Negative tests that must exist

- A doctor with no active consultation and no grant is denied, and the denial is
  audited.
- A revoked consent takes effect immediately, including for anything cached.
- Hospital A cannot read hospital B's records under any endpoint.
- An entered-but-unverified lab result is not released and notifies nobody.
- No PHI appears in any log line. Assert this against captured log output; do not
  assume it.
- The patient sheet for patient X never contains a fact belonging to patient Y.

---

## Definition of done

The full checklist is in [`.github/AGENT_PROMPT.md`](../../.github/AGENT_PROMPT.md)
section 5. The short form:

1. `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm typecheck:tests`,
   `pnpm format:check` and `pnpm test` all pass.
2. Unit tests against the in-memory store, HTTP tests through `app.inject()`, and
   every negative test listed above.
3. `postman/clinical.postman_collection.json` exists, is runnable top to bottom
   without editing, and has a "Security expectations" folder asserting the
   failures. No real credentials, no real patient data.
4. `docker build -f apps/clinical/Dockerfile -t hms-clinical:dev .` **actually builds**,
   the container starts, and `/health/live` and `/health/ready` both answer on
   port 5004:

   ```bash
   docker build -f apps/clinical/Dockerfile -t hms-clinical:dev .
   docker compose -f docker/compose/deps.yml up -d
   docker run --rm --network hms_default -p 5004:5004 \
     --env-file envs/.env.container hms-clinical:dev
   curl -fsS http://localhost:5004/health/live
   ```

   The Dockerfile in this directory has **never been verified to build**. If it is
   broken, fix it and say what was wrong.
5. `README.md` follows [`SERVICE_README_TEMPLATE.md`](../../.github/SERVICE_README_TEMPLATE.md),
   with an honest Status column that does not claim unbuilt behaviour.
6. The matching rows in [`RECORD.md`](../../.github/RECORD.md) are updated in the
   same commit.

## Do not

- Touch another service's directory, schema, or migrations.
- Read another service's tables. Use its API or an event.
- Modify a shared package to make this service compile — raise it instead.
- Touch `infra/`, `docker/`, `envs/`, `scripts/`, or `.github/`.
- Claim it works without running it.
