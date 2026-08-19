# PROMPT — `@hms/ai`

**Read [`.github/AGENT_PROMPT.md`](../../.github/AGENT_PROMPT.md) first.** It holds
the rules, the stack, the file shape, and the definition of done. This file holds
only what is specific to `ai`.

**Read [`.github/RULES.md`](../../.github/RULES.md) too.** It is binding.

---

## What this service owns

Agents, pgvector memory, typed tool execution, an evaluation harness, and AI
audit. LangChain and LangGraph over any OpenAI-compatible endpoint.

**This service runs in its own container even in the all-in-one image**, because
Node is single-threaded and model calls would otherwise stall the queue.

## The rule that overrides everything else here

**AI never writes a clinical record without a human signature, and that signature
is recorded in the audit log.** There is no exception, no confidence threshold,
and no "the doctor can review it later" mode. A suggestion is a suggestion until a
named human accepts it.

This is a P4 service. It is the **last** thing to build, and the loop must work
completely without it.

## State: a stub

16 lines and a health route.

## What to build, in order

1. **The evaluation harness first, before any agent.** Fixture patients, and a
   gate on allergy recall and current-medication recall. An agent without an eval
   is a demo, and a clinical demo that ships is a liability. Build the ruler
   before the thing you measure.
2. **Typed tools.** Every tool a model can call is a zod-validated function with
   an explicit permission check. The model does not inherit the caller's authority
   by default; it gets exactly the tools it was granted.
3. **pgvector memory,** scoped per patient and per hospital. A memory retrieved
   across a tenancy boundary is a PHI breach with extra steps.
4. **AI audit.** Every prompt, every tool call, every output, retained. When a
   clinician asks why the model said something, the answer must exist.
5. **Consume `consultation.content.saved`** for memory extraction and
   `consultation.completed` for scribe extraction.

## Negative tests that must exist

- No path writes a clinical record without a recorded human signature.
- Memory retrieval never crosses a patient boundary or a hospital boundary.
- A tool call the caller lacks permission for is refused and audited.
- The eval gate fails the build when allergy recall regresses.
- No PHI reaches the model endpoint that the patient has not consented to share.

## Cost and failure

Model endpoints are slow, rate-limited, and occasionally down. Every AI feature
degrades to "not available right now" and never blocks the loop. If the AI service
is down, the hospital still runs.

---

## Definition of done

The full checklist is in [`.github/AGENT_PROMPT.md`](../../.github/AGENT_PROMPT.md)
section 5. The short form:

1. `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm typecheck:tests`,
   `pnpm format:check` and `pnpm test` all pass.
2. Unit tests against the in-memory store, HTTP tests through `app.inject()`, and
   every negative test listed above.
3. `postman/ai.postman_collection.json` exists, is runnable top to bottom
   without editing, and has a "Security expectations" folder asserting the
   failures. No real credentials, no real patient data.
4. `docker build -f apps/ai/Dockerfile -t hms-ai:dev .` **actually builds**,
   the container starts, and `/health/live` and `/health/ready` both answer on
   port 5007:

   ```bash
   docker build -f apps/ai/Dockerfile -t hms-ai:dev .
   docker compose -f docker/compose/deps.yml up -d
   docker run --rm --network hms_default -p 5007:5007 \
     --env-file envs/.env.container hms-ai:dev
   curl -fsS http://localhost:5007/health/live
   ```

   The Dockerfile in this directory has **never been verified to build**. If it is
   broken, fix it and say what was wrong.
5. `README.md` follows [`SERVICE_README_TEMPLATE.md`](../../.github/SERVICE_README_TEMPLATE.md),
   with an honest Status column that does not claim unbuilt behaviour.
6. The matching rows in [`RECORD.md`](../../.github/RECORD.md) are updated in the
   same commit.

## What you may change

Your own directory, obviously. Beyond it, **change whatever you genuinely need to
make this service build, run, and be tested** — including these, which used to be
off limits:

| Path | What you may do |
|---|---|
| `apps/<yours>/Dockerfile` | Fix it, rewrite it, whatever makes it build |
| `docker/compose/*.yml` | Add or correct **your** service's entry and its dependencies |
| `docker/all-in-one.mjs` | Register your service so the combined image boots it |
| `envs/.env.example`, `envs/CATALOGUE.md` | Add the **key names** your service reads, with placeholder values |
| `scripts/dev/*` | Add a helper you need, if one does not already exist |

Anything you change outside your own directory must be **named in the pull
request description**, with a sentence on why. BHUVNESH reviews every pull
request and needs to see the shared-file edits without hunting for them.

If a shared file fights you, say so in the pull request rather than working
around it. A workaround inside your service becomes seven workarounds once the
other services hit the same wall.

## Do not

- **Write a real secret value anywhere.** Not in `.env.example`, not in a compose
  file, not in a Postman collection, not in a test fixture. Placeholders and
  obviously fake values only. This one has no exceptions.
- **Edit `.github/workflows/`, `CODEOWNERS`, `RULES.md`, or `AGENT_PROMPT.md`.**
  Those decide what gets merged and what the rules are. Changing them to make
  your branch pass defeats the point of having them. Propose the change instead.
- **Edit `infra/helm/`, `infra/terraform/`, or `infra/kubernetes/`.** Those are
  the deployment profiles, they are BHUVNESH's, and they are not built yet.
- Touch another service's directory, schema, or migrations.
- Read another service's tables. Use its API or an event.
- Modify a shared package to make this service compile — raise it instead.
- Weaken or delete a test to make a build pass.
- Claim it works without running it.
