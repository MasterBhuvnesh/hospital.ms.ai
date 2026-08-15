# RULES

Rules any person or agent must follow when working in this repository.

## COMMITS

- Use Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `build:`, `ci:`).
- Commit messages are detailed. Keep the subject line short and imperative, then write a body that states what changed, why it changed, and anything a reviewer needs to know. A bare subject line is not acceptable.
- Scope the commit to the service it touches, for example `feat(scheduling):`, `fix(comms):`, `docs(architecture):`.
- Reference the checklist id in the subject when the work closes one, for example `feat(scheduling): PAT-4.04 sequence-based token generation`.
- Never add model or co-author trailers such as `Co-Authored-By: Claude ...`. No mention of Claude, Anthropic, or any model in commit messages.
- Commit every change that is made. Do not leave work uncommitted.

## WRITING STYLE

- Do not use em dashes. Use commas, colons, or parentheses.
- Do not use emoji.
- Use ALL CAPS for all titles and headings in every markdown file inside `.github`, including this one and the README.
- Documentation under `docs/` uses sentence case headings, because it is read by clients and stakeholders rather than by agents.
- Be concise. If the explanation is longer than the thing it explains, delete the explanation.

## LANGUAGE

- TypeScript for all application code across `apps/` and `packages/`.
- Write specific, professional comments that explain intent rather than restate the code.
- Terraform for infrastructure. No manually created cloud resources, ever. A console-created resource is invisible to the next engineer.

## RECORD

- Always keep [`RECORD.md`](RECORD.md) up to date. When a feature changes state, add or update a row so any other person or agent knows what is done and what is not.
- The record table columns are: FEATURE, DEVELOPER, STATUS, DATE.
- Write the developer name in capitals (BHUVNESH, AARSH, ABHAY, ARYAN, or the relevant person).
- Status values are PLANNED, IN PROGRESS, DONE, BLOCKED, DROPPED.
- Date format is DD-MM-YYYY and records the date the status last changed.
- Commit the updated `RECORD.md` along with the feature it describes, in the same commit.

## DOCUMENTATION AUTHORITY

- [`docs/traceability.md`](../docs/traceability.md) is the source of truth for phase assignment and feature ownership. When any other document disagrees about when something ships or which service owns it, traceability wins and the other document is a bug.
- [`docs/architecture.md`](../docs/architecture.md) is the authority for technical boundaries.
- Moving a phase means editing `traceability.md` first, then the checklist, then anything else.
- Never renumber a checklist id in [`docs/role-checklist.md`](../docs/role-checklist.md). If an item is dropped, strike it and retire the id. Tickets, commits, and test names reference these ids.
- Update the documentation in the same pull request as the code. Documentation that lags the code is worse than no documentation, because it is believed.

## VERSION CONTROL

- **Never use `git stash`.** Every change gets a commit with a message. Nothing is parked in the stash, hidden from the log, or verified by temporarily reverting the working tree. If a check needs a comparison against unmodified code, commit the change first and compare against the previous commit.
- Do not commit directly to `main`. Branch first.
- Branch naming follows the type of work, for example `feat/p0-foundation`, `fix/queue-token-race`.
- Every branch ends in a pull request. The repository owner merges. Never merge without being asked.
- The pull request description must list every change made on the branch.
- Ask before destructive or irreversible Git actions (`reset --hard`, `push --force`, history rewrites).

## ARCHITECTURE CONSTRAINTS

These are not preferences. Breaking one of them is a defect.

- **No cross-service database reads.** A service owns its schema. Cross-domain reads go through the owning service's API.
- **`hospitalId` scoping is applied in the repository layer**, never in a route handler. Users and patients are global; everything about a visit is hospital-scoped.
- **Every RabbitMQ consumer is idempotent on `messageId`.** Redelivery is normal operation, not an error.
- **Every critical write takes an idempotency key**: booking, token generation, payment, refund, dispensing.
- **No cloud SDK outside `packages/platform-aws`.** Lint enforces this and the pull request fails without it.
- **No cloud-specific annotation, storage class, or ARN in the base Helm chart.** AWS extras live in `values-aws.yaml`.
- **Dates and times on anything hospital-scoped derive from the hospital's configured timezone**, never the server's.
- **AI never writes a clinical record without a human signature**, and that signature is recorded in the audit log.

## SECURITY

- Never commit credentials, API keys, tokens, or `.env` files. `envs/.env.example` is the only env file in git, and it contains fake values only.
- **Never print a secret value.** Not into a terminal, a log, or a chat transcript. When inspecting an env file, print key names and value lengths, and edit it programmatically so the values never pass through output.
- If a secret is exposed anyway, say so plainly and immediately, and tell the owner to rotate it. Do not bury it.
- Before committing anything that touches configuration, check the staged diff for the secret values themselves, not just the filenames.
- **No PHI in logs.** Use `packages/logger`, which applies pino redaction paths. Never `console.log`.
- Never send any email, SMS, push notification, or WhatsApp message automatically from a development or test environment. Development uses Mailpit and a console SMS stub. Testing uses provider stubs and never contacts a real provider.
- Keep each patient's data separated. A doctor role does not imply access to a given patient; access requires an active consultation or an explicit grant.

## TESTING AND VERIFICATION

- Do not claim work is done until it is verified. If a step was skipped or a test failed, say so.
- `pnpm test` is a required check on every pull request. A workflow that never runs a test is not CI.
- Every authorization change ships with its negative test. The eight required negative cases are listed in [`docs/architecture.md`](../docs/architecture.md), section 7.1.
- The loop test in `tests/e2e/loop.spec.ts` must pass before any merge that touches `scheduling`, `clinical`, or `commerce`.
- Verification is a real run, not a green test suite. Each phase ends with a demo of the actual workflow.

## WORKING BEHAVIOR

- If a request seems wrong, or a terminal command is taking too long, ask the user once whether to continue.
- If anything is unclear, ask the user rather than guessing.
- Reuse existing code, helpers, and patterns before writing new ones. Prefer the smallest change that works.
- Read the problem fully before shortening the solution. A small diff in the wrong place is a second bug, not a fix.
- Fix root causes, not symptoms. Before editing a shared function, check every caller.

## TOOLING ON THIS MACHINE

- Windows 11, PowerShell 5.1 as the primary shell, with Git Bash also available. They take different syntax. PowerShell 5.1 has no `&&`, no ternary, and no null-coalescing operator.
- **Do not use `Get-Content -Raw` piped into `Set-Content` on any file containing non-ASCII characters.** PowerShell 5.1 reads them as ANSI and writes UTF-8, which corrupts the box drawing characters in the documentation directory trees. Use the Edit tool, or `[System.IO.File]::ReadAllText` and `WriteAllText` with an explicit UTF8 encoding.
- Compose v2 only. Every command is `docker compose`, never `docker-compose`.
- MiKTeX is installed at `C:\Users\Acer\AppData\Local\Programs\MiKTeX\miktex\bin\x64`. `pdflatex`, `xelatex`, `lualatex`, and `latexmk` are all on PATH and build `docs/Synopsis`.
- Pin every Helm chart version. The Bitnami public catalog changed distribution terms during 2025, so unpinned installs break without warning. `scripts/k8s/kind-up.sh` is the single place chart versions are updated.
