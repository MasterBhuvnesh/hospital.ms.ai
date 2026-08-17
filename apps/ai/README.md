# apps/ai

**Port 5007.** Agents, memory, tool execution, evaluations.

Owns the `ai` Postgres schema and reads no other.

## Goal

Make the rest of the system faster to use without becoming a source of clinical truth. Everything here is a draft, a summary, a suggestion or a search result, and every one of them is traceable back to a record that a human wrote.

The design constraint is stated once and holds everywhere: the model may propose, a person disposes, and the disposal is recorded. A feature that cannot be built under that constraint does not get built.

## What it must do

| Capability | Phase | Notes |
|---|---|---|
| Agent runtime with tool execution | P4 | Tools call the owning service's API, never its database |
| Consultation scribe: draft notes from `consultation.completed` | P4 | Draft state until a doctor signs |
| Patient sheet summarisation | P4 | Assistive layer over the sheet `clinical` builds |
| Semantic search over documents, pgvector | P4 | |
| Per-user memory | P4 | Scoped by `userId`, which is the tenancy boundary here |
| Symptom triage assistance for reception | P4 | Suggests urgency, never assigns it |
| Evaluation harness with a fixed case set | P4 | A prompt change without an eval run is an untested deploy |
| Prompt and model version recording per output | P4 | Required to reproduce or explain any past output |
| Token and cost accounting per hospital | P4 | |

## Conditions

- **AI never creates clinical truth.** No AI output is persisted as a clinical record without a human signature, and that signature is recorded in the audit log. This is an architecture constraint, not a policy preference: breaking it is a defect.
- **Clinical facts are fetched from the owning service at request time.** Nothing clinical is cached here, and nothing clinical is copied into a vector index without an explicit grant. A stale allergy list in a prompt is a patient-safety problem.
- **Every output records the prompt version, the model id, and the input record ids.** An answer nobody can reproduce cannot be reviewed after it turns out to be wrong.
- **Tools call APIs, never databases.** The tool layer is the place where "the model needed the data" becomes a cross-service schema read, so the rule is absolute.
- **The model provider sits behind an interface**, with the same treatment as payments and storage. A hospital self-hosting the platform must be able to point this at their own endpoint.
- **A failure here degrades, never blocks.** If this service is down, consultations, prescriptions, billing and the queue all continue. Nothing on the critical path may wait on a model call.
- **Memory is scoped by `userId` and is deletable on request.** It is the one store here that accumulates over time, so it is the one that needs an eraser.
- **Evaluations gate prompt changes.** The fixed case set runs in CI, and a regression fails the pull request.

## Allowed and not allowed

| Allowed | Not allowed |
|---|---|
| Own agent runs, memory, embeddings, evaluations | Own any clinical, scheduling or billing record |
| Produce a draft note, summary or suggestion | Persist any of them as a signed record |
| Call other services' APIs through the tool layer | Read another service's schema, for any reason |
| Store embeddings of documents the user has granted access to | Index PHI it was not granted |
| Record prompts, model ids and token counts | Log the model input or output where it contains PHI |
| Be scaled to zero, or removed entirely | Be a dependency of the critical path |

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
docker build -f apps/ai/Dockerfile -t hms-ai:$(git rev-parse --short HEAD) .
docker run -p 5007:5007 --env-file envs/.env.container hms-ai:$SHA

pnpm dev --filter @hms/ai
```

Also included in the all-in-one image (`docker/Dockerfile`) with `SERVICE=ai`.

See [`docs/architecture.md`](../../docs/architecture.md) and [`docs/tech-stack.md`](../../docs/tech-stack.md).
