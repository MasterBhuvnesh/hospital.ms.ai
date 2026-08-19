# PROMPT — `@hms/directory`

**Read [`.github/AGENT_PROMPT.md`](../../.github/AGENT_PROMPT.md) first.** It holds
the rules, the stack, the file shape, and the definition of done. This file holds
only what is specific to `directory`.

**Read [`.github/RULES.md`](../../.github/RULES.md) too.** It is binding.

---

## What this service owns

Hospitals, departments, rooms, doctors, specializations, schedules, attendance,
leave, consultation fees, and search. Merged from what were three contexts:
hospital, doctor, and search.

Everything here is **hospital-scoped** except the doctor identity itself. Use
`ScopedRepository` from `@hms/db` for every query.

## State: a stub

16 lines and a health route.

## What to build, in order

1. **Hospitals, departments, rooms.** This is the tenancy root: every other
   service's `hospitalId` is a foreign reference to a row created here, so this
   comes first or nothing else can be tested. Each hospital carries a configured
   **timezone**, and every hospital-scoped date in the platform derives from it,
   never from the server clock.
2. **Doctors and specializations,** including the link between a global user
   (owned by `identity`) and a doctor profile at a hospital.
3. **Schedules, attendance, and leave** as three separate concerns.
4. **Computed availability.** Availability is *derived* from schedule minus leave
   minus attendance, never stored as its own editable field. A stored availability
   flag drifts from its three inputs within a week, and then booking sells a slot
   that does not exist. This is the endpoint `scheduling` calls synchronously
   during booking, so it must be both fast and correct.
5. **Fee configuration, versioned and immutable.** `scheduling` reads a fee and
   snapshots it into `consultation.completed`; `commerce` bills that snapshot. An
   edit must create a new version rather than mutate the existing row — if it
   mutated, an invoice generated after a price change would bill the wrong amount
   for a visit that already happened.
6. **Search** over doctors and hospitals using `pg_trgm` inside Postgres. No
   Elasticsearch.

## Negative tests that must exist

- A token scoped to hospital A cannot read, list, or modify anything belonging to
  hospital B — for every endpoint, not a sample of them.
- Availability excludes a doctor on approved leave, and one marked absent today.
- Editing a fee produces a new version and leaves the previous version readable.
- A date computed for a hospital in another timezone is correct on the day
  boundary.

---

## Definition of done

The full checklist is in [`.github/AGENT_PROMPT.md`](../../.github/AGENT_PROMPT.md)
section 5. The short form:

1. `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm typecheck:tests`,
   `pnpm format:check` and `pnpm test` all pass.
2. Unit tests against the in-memory store, HTTP tests through `app.inject()`, and
   every negative test listed above.
3. `postman/directory.postman_collection.json` exists, is runnable top to bottom
   without editing, and has a "Security expectations" folder asserting the
   failures. No real credentials, no real patient data.
4. `docker build -f apps/directory/Dockerfile -t hms-directory:dev .` **actually builds**,
   the container starts, and `/health/live` and `/health/ready` both answer on
   port 5002:

   ```bash
   docker build -f apps/directory/Dockerfile -t hms-directory:dev .
   docker compose -f docker/compose/deps.yml up -d
   docker run --rm --network hms_default -p 5002:5002 \
     --env-file envs/.env.container hms-directory:dev
   curl -fsS http://localhost:5002/health/live
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
