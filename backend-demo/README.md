# backend-demo

> **Live demo:** https://backend-demo-hms.onrender.com (Render free tier — first request after idle may take ~60s to wake)
>
> Standalone repo: https://github.com/MasterBhuvnesh/backend-demo-hms

Single-process demo of the **Atelier Health** platform. All eight microservices' routes merged into one Fastify app, with demo-grade infrastructure swapped in:

| Production design | This demo |
|---|---|
| PostgreSQL, one schema per service, Prisma | **JSON files** in `data/*.json` |
| RabbitMQ events + delayed exchange | In-process `EventEmitter` bus (`src/lib/events.ts`) |
| RS256 via jose, keys in identity | HS256 JWT from `JWT_SECRET` |
| argon2id | node `crypto.scrypt` |
| Razorpay webhook HMAC | `POST /payments/mock-capture` |
| Redis pub/sub + WebSocket fanout | Polling only (no WS in demo) |
| MinIO/S3 behind StorageProvider | Supabase S3-compatible endpoint directly |

Kept faithful: RBAC + ownership checks, break-glass with patient notification, refresh-token family rotation with reuse detection, idempotency keys on booking, fee-snapshot invoicing, lab release gate, prescription immutability (content hash), append-only audit log, `x-user-*` header stripping.

## Run it

```powershell
cd backend-demo
pnpm install --ignore-workspace   # standalone, not part of the monorepo workspace
pnpm dev                          # tsx watch; auto-seeds if data/ is empty
```

Server listens on **http://localhost:8080**. Health: `/health/live`, `/health/ready` (shows which integrations are configured).

> `data/` is committed pre-seeded with the rich demo world, so a fresh clone boots straight into populated data (live queue is dated to the last seed run — re-run `pnpm seed:rich` after wiping `data/` to refresh "today"). Delete `data/*.json` for a factory reset; auto-seed rebuilds it on boot.

### Seeded accounts

All staff/patient passwords are `Demo@12345`; platform admin is `Admin@12345`.

| Role | Login |
|---|---|
| Platform admin | `admin@atelier.local` (`Admin@12345`) |
| Hospital admin | `hospadmin@atelier.local` |
| Doctors | `asha@atelier.local` (Cardio), `rahul@atelier.local` (Gen Med), `kavita@atelier.local` (Peds), `neha@atelier.local` (Derm, Mumbai), `imran@atelier.local` (Gen Med, Mumbai) |
| Receptionists | `reception@atelier.local`, `mumbai.reception@atelier.local` |
| Pharmacist | `pharmacy@atelier.local` |
| Lab technician | `lab@atelier.local` |
| Nurse | `nurse@atelier.local` |
| Patients | `patient@atelier.local` (Priya), `arjun@atelier.local`, `meera@atelier.local` |

Run `pnpm seed:rich` for a large demo world: **2 hospitals · 8 departments · 8 doctors · 15 patients · ~34 completed visits with consultation notes · 22 signed prescriptions · 15 lab orders (some awaiting release) · 34 invoices (~28 paid) · live queue for today (EMERGENCY/SENIOR priority ordering) · upcoming appointments · 14 pharmacy items incl. low-stock alerts · audit history**. Idempotent via a marker row; `--force` re-adds on top of existing data.

## Environment

`.env` is loaded via dotenv. Everything degrades gracefully when absent:

| Group | Keys | Missing → |
|---|---|---|
| Core | `PORT`, `HOST`, `JWT_SECRET`, `DEMO_EXPOSE_OTP`, `AUTO_SEED` | secret defaults to dev value with warning |
| Vector DB | `DATABASE_URL` (Neon/pgvector) | memory endpoints return 503 |
| Email | `SMTP_HOST/PORT/USER/PASSWORD`, `EMAIL_FROM` (Gmail app password) | email sends fail per-channel, marked FAILED |
| SMS / WhatsApp | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM`, `TWILIO_WHATSAPP_FROM` | **console fallback**: messages logged as `[SMS:console]` |
| Storage | `S3_ENDPOINT/REGION/ACCESS_KEY_ID/SECRET_ACCESS_KEY/BUCKET/PUBLIC_URL` (Supabase) | PDF/doc uploads return 503 |
| LLM | `LLM_BASE_URL`, `NVIDIA_API_KEY`, `LLM_MODEL` (nemotron-3-ultra), `EMBEDDING_MODEL` (nemotron-3-embed-1b) | AI endpoints return 503 |

> **Security note:** the credentials currently in `.env` were pasted into chat during development. Rotate them before any real use.

### Twilio on a trial account — what works and what doesn't

Recorded after live probes to an Indian mobile (`scripts/twilio-probe.mjs +918390545534`):

| Attempt | Result |
|---|---|
| Free-form SMS from US long-code | ❌ `572006` — trial allows only predefined templates |
| Verify number via Caller-ID API | ❌ `20003` — feature locked on trial |
| WhatsApp free-form from own number | ❌ `21654` — sender not WhatsApp-enabled → ContentSid demanded |
| **WhatsApp Sandbox** | ✅ works — free-form inside a 24h session |

**WhatsApp sandbox recipe:** Console → Messaging → Try it out → Send a WhatsApp message. From the phone's WhatsApp, send the join code to `+1 415 523 8886`, then set:

```env
TWILIO_WHATSAPP_FROM=+14155238886   # sandbox sender, not your real number
```

**SMS to Indian numbers — hard reality:** US long-codes are dropped by Indian carrier **DLT filtering**, independent of trial status. Production options:

1. Upgrade Twilio + register DLT templates and an Indian sender (weeks of paperwork), or
2. Swap provider to **MSG91 / Gupshup** — config-only change through the driver abstraction (`SMS_PROVIDER` + keys); no app code touched.

Either way, failed deliveries never break flows: every attempt is recorded per-channel in `notifications.deliveries[]`.

## Route map (all under `/api`)

**identity.routes.ts**
- `POST /auth/register` · `POST /auth/login` · `POST /auth/refresh` (rotation + reuse detection revokes family) · `POST /auth/logout` · `GET /auth/me`
- **Devices:** `PUT /api/auth/devices` (upsert by deviceId, tracks lastSeenAt) · `GET /api/auth/devices` · `DELETE /api/auth/devices/:deviceId` (audited revocation)
- `POST /api/auth/otp/request` · `POST /api/auth/otp/verify` (LOGIN / VERIFY_CONTACT / RESET_PASSWORD; hashed single-use codes, attempt-capped)
- Admin: `GET /admin/users` · `PATCH /admin/users/:id/status` · `POST /admin/users/:id/roles` · `DELETE /admin/users/:id/roles/:roleId`

**directory.routes.ts**
- Hospitals: `GET|POST /directory/hospitals`, `GET|PATCH /directory/hospitals/:id`
- Departments: `POST /directory/hospitals/:id/departments`, `GET|PATCH /directory/departments/:id`
- Doctors: `GET|POST /directory/doctors`, `GET|PATCH /directory/doctors/:id` (versioned fee config + history)
- Scheduling inputs: `PUT|GET /directory/doctors/:id/schedule`, `GET /directory/doctors/:id/availability?date=` (schedule − approved leave ∩ attendance − booked slots)
- `POST .../attendance/check-in|check-out`, `POST|GET .../leave`, `PATCH /directory/leaves/:id`
- `GET /directory/search?q=`

**scheduling.routes.ts**
- `POST /scheduling/appointments` (Idempotency-Key honored) · `GET /scheduling/appointments[...]` · `GET /scheduling/appointments/:id`
- `PATCH .../reschedule` · `.../cancel`
- `POST /scheduling/walkins` (auto-creates minimal patient record; **PATIENT-role callers self-register** and always get NORMAL priority; staff can pass patientId/phone/priority) · `POST /scheduling/tokens {appointmentId}`
- Queue state machine WAITING→CALLED→IN_CONSULTATION→COMPLETED / SKIPPED⇄recall / NO_SHOW:
  `GET /scheduling/queue?doctorId&date` · `GET /scheduling/tokens/:id` (+position/ETA) · `POST /scheduling/tokens/:id/call|start|skip|recall|no-show|complete`
- **Realtime:** `GET /api/scheduling/tokens/:id/stream` — SSE stream emitting `snapshot` then `update` events on the six queue/consultation topics, heartbeat every 20s, patient-scoped like the REST route
- Near-turn sweep publishes `queue.patient.near_turn` at position ≤ 3; `tokenDate` derives from hospital timezone; fee snapshot captured at booking; completion generates the invoice inline then publishes `consultation.completed`.

**clinical.routes.ts**
- Patients: `POST /clinical/patients` · `GET /clinical/patients/me` · `GET|PATCH /clinical/patients/:id` · `POST /clinical/patients/:id/register-at` (MRN) — records carry `photoUrl`, `emergencyContact {name, phone}`, `insurance {provider, number}` (PAT-1.08/10/12)
- Records (shared guard = active consultation ∨ consent ∨ break-glass): allergies / conditions / medications nested `GET|POST|DELETE`
- Consultation content: `GET|PUT /clinical/consultations/:cid/content` (must be IN_CONSULTATION)
- Deterministic sheet: `GET /clinical/patients/:id/sheet` (+ every PHI read audited, break-glass notifies patient)
- Prescriptions: draft `POST /clinical/consultations/:cid/prescriptions` → `POST /clinical/prescriptions/:id/sign` (SHA-256 content hash + PDF → S3 + immutable) → `GET /clinical/prescriptions/:id`, `GET /clinical/patients/:id/prescriptions`
- Labs: order `POST /clinical/consultations/:cid/lab-orders` → collect → results → **release gate** (`ORDERED→COLLECTED→ENTERED→RELEASED`; patients see released only): `POST /clinical/lab-orders/:id/collect|results|release`, `GET /clinical/lab-orders/:id`, `GET /clinical/patients/:id/lab-orders`
- Documents: `POST /clinical/documents` (base64 ≤10MB → private S3 key + presigned URL) · `GET /clinical/documents/:id` (fresh presign) · `GET /clinical/patients/:id/documents` · **`DELETE /api/clinical/documents/:id`** (removes row + S3 object, audited as `phi.document_deleted`)
- Consents: `POST /clinical/consents` · `DELETE /clinical/consents/:id` · `GET /clinical/consents/mine` · `GET /clinical/audit/mine`

**commerce.routes.ts**
- Invoices: `GET /commerce/invoices` · `GET /commerce/invoices/:id` (generated from consultation-completion fee snapshot, PDF → S3, voided on cancellation)
- Payments: `POST /commerce/payments/intent` → `POST /commerce/payments/mock-capture` → `payment.captured` marks visit financially closed; `GET /commerce/payments/:id`, `/mine/list`
- Refunds: `POST /commerce/refunds` (admin/receptionist)
- Pharmacy: items `POST|PATCH /commerce/pharmacy/items`, catalog `GET /commerce/pharmacy/catalog?q=`
- Inventory: `POST /commerce/inventory/stock-in` (batches w/ expiry) · `GET /commerce/inventory/stock?itemId=` · `GET /commerce/inventory/low-stock`
- Dispensing: `POST /commerce/dispense {prescriptionId}` — signed Rx only, FIFO-by-expiry stock decrement, movements recorded, `stock.low` emitted at threshold

**comms.routes.ts**
- `GET /comms/notifications` · `POST /comms/notifications/:id/read` · `POST /comms/notifications/read-all`
- **Push registry:** `POST /comms/push/register {token, platform?, deviceId?}` (upsert per user+token) · `GET /comms/push/tokens` · `DELETE /comms/push/tokens/:id`
- `GET|PUT /comms/preferences` (per-category channel matrix; channels INAPP · EMAIL · SMS · WHATSAPP · **PUSH**) · `POST /comms/test-send` (admin, any channel incl. PUSH)
- PUSH semantics: if the user has ≥1 registered Expo push token → push replaces SMS in the default matrix; with no token → falls back to SMS (QUEUE category) or is skipped

**ai.routes.ts**
- `GET /ai/status` · `POST /ai/chat` · `POST /ai/chat/stream` (SSE with `reasoning` + `content` events)
- `POST /ai/patients/:id/sheet-draft` (agent over deterministic sheet facts) · `POST /ai/consultations/:cid/scribe` (SOAP draft — never persisted without doctor action)
- Memory (pgvector, scoped by userId): `POST|GET|DELETE /ai/memory`, `POST /ai/memory/search`

**admin.routes.ts**
- `GET /admin/audit` (filterable) · `GET /admin/events` (bus replay buffer)
- Break-glass: `POST /admin/break-glass {patientId, reason≥10, ttl≤60m}` · `GET /admin/break-glass` · `GET /admin/patients/:id/summary`
- `PLATFORM_ADMIN` gets 403 on all clinical content by design.

Health: `GET /health/live`, `GET /health/ready`. App config: `GET /api/config/app` (public `minSupportedVersion` for the client OTA gate).

## Events (in-process bus, mirrors the RabbitMQ catalogue)

`user.registered`, `appointment.created|rescheduled|cancelled|no_show`, `queue.token.created|updated|skipped|recalled`, `queue.patient.near_turn`, `consultation.started|completed`, `consultation.content.saved`, `patient_sheet.ready`, `prescription.signed`, `consent.granted|revoked`, `lab.order.created|sample.collected|result.released`, `invoice.generated`, `payment.captured`, `refund.completed`, `pharmacy.dispensed`, `stock.low`, `audit.recorded`, `phi.accessed`.

Consumers are deduped on `messageId` (`src/comms/engine.ts`). Inspect traffic via `GET /api/admin/events`.

## AI layer

- OpenAI-compatible client pointed at `https://integrate.api.nvidia.com/v1`
- Chat model `nvidia/nemotron-3-ultra-550b-a55b` with `enable_thinking` — reasoning stream surfaced separately, never mixed into content
- Embeddings `nvidia/nemotron-3-embed-1b` → stored in Neon Postgres `ai_memories.embedding vector` (dimension-free column, cosine `<=>` search, keyword fallback if embedding fails, DPDP erasure via `DELETE`)
- Safety behavior: copilot refuses diagnosis-style answers; scribe output is a draft requiring doctor save/sign

## Postman

Import `postman/atelier-health-backend-demo.postman_collection.json`. Folders run top-to-bottom; test scripts capture tokens/IDs automatically (walk-in overrides the appointment token so the clinical loop targets one consultation). Two negative tests assert 400/403 instead of success.

## Smoke scripts

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\smoke.ps1     # full loop incl. security matrix + break-glass
powershell -NoProfile -ExecutionPolicy Bypass -File .\ai-smoke.ps1  # NVIDIA chat/scribe/sheet + pgvector memory
```

## Reset

Stop the server and delete `data/*.json` — next boot re-seeds.
