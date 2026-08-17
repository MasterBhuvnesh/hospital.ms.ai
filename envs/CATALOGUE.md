# Environment catalogue

Every environment variable in the system: who reads it, which deployment profile needs it, what it defaults to, and which ones you have to go and obtain from somebody else.

Read section 1 first. The short version is that **you need nothing from a third party to start**, and the things with real lead time should be applied for now so they are ready when the phase that needs them arrives.

---

## 0. How to hand these over

Do not paste secret values into a chat, an issue, or a commit message. Once a value is in a transcript it is disclosed, and the only fix is rotating it.

Instead:

```bash
cp envs/.env.example envs/.env.development
# then edit envs/.env.development in your editor
```

`envs/.env.*` is gitignored with an exception only for the example. When something needs inspecting, the safe form is key names and value lengths, never values:

```bash
# prints key names and how long each value is, never the value itself
awk -F= '/^[A-Z]/ { printf "%-34s %d\n", $1, length($2) }' envs/.env.development
```

If a secret does end up somewhere it should not be, say so immediately and rotate it. Burying it is worse than the exposure.

---

## 1. What you must obtain

Nothing here is needed to start. The phase column is when it starts blocking work.

| What | Keys it provides | Where from | Lead time | Blocks | Needed by |
|---|---|---|---|---|---|
| **SMS provider and DLT registration** | `SMS_API_KEY`, `SMS_SENDER_ID`, `SMS_DLT_ENTITY_ID`, `SMS_DLT_TEMPLATE_*` | MSG91, Gupshup, or Twilio, plus DLT registration on an Indian telecom operator portal | **Weeks.** The longest lead time in the project | Patient login, because OTP is the only channel that works with no app installed | P1, apply in P0 |
| **WhatsApp Business Cloud API** | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID` | Meta for Developers, plus business verification | Weeks | WhatsApp notifications only. Everything else degrades cleanly without it | P5, apply in P0 |
| **Razorpay account and KYC** | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Razorpay dashboard. Test keys are issued immediately, live keys need KYC and settlement setup | Test: minutes. Live: days to weeks | Online payment. Cash and card at the counter work without it | P3 |
| **LLM provider** | `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `EMBEDDING_MODEL` | Any OpenAI-compatible endpoint, or self-hosted vLLM or Ollama, in which case there is no third party at all | Minutes | AI features only, which are designed to degrade rather than block | P4 |
| **Production SMTP** | `SMTP_URL`, `EMAIL_FROM` | Amazon SES (SMTP endpoint, not the SDK), Resend, Postmark, or your own relay | Hours to days, mostly domain verification | Production email. Development uses Mailpit and needs nothing | P5 |
| **Expo account** | `EXPO_ACCESS_TOKEN` | expo.dev | Minutes | Mobile push and EAS builds | P1 |
| **Docker Hub** | `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` | hub.docker.com, access token not password | Minutes | CI image publishing | P0 |
| **Sentry** | `SENTRY_DSN` | sentry.io. Optional, self-hosted GlitchTip works too | Minutes | Nothing. Errors still reach the logs | P6 |
| **Windows EV code-signing certificate** | CI secrets, not app env | A certificate authority, on a hardware token | **Weeks**, and it costs money | Desktop auto-update, because an unsigned updater is a malware prompt | P6, order in P0 |
| **Apple and Google developer accounts** | Store credentials, CI secrets | Apple Developer Program, Google Play Console | Days | Store releases only | P6 |

**Start now:** the SMS provider with DLT registration, the WhatsApp application, and the code-signing certificate. All three are measured in weeks and all three are ordered rather than built. Everything else can wait until its phase.

---

## 2. What you do not need to obtain

These look like credentials and are not. Nobody issues them to you.

| Key | Where it comes from |
|---|---|
| `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY` | An RSA keypair you generate. `scripts/dev/generate-jwt-keys.sh` |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | A random string **you** choose and then tell Meta. It is not issued to you |
| `DATABASE_URL`, `REDIS_URL`, `RABBITMQ_URL` | The local Compose stack, with credentials already set in `docker/compose/deps.yml` |
| `S3_ACCESS_KEY`, `S3_SECRET_KEY` | Local MinIO, credentials in the same Compose file |
| `SMTP_URL` | Local Mailpit, no authentication |
| Every `*_DRIVER` key | A choice, not a secret. All default to a stub |

---

## 3. The full key reference

Required column: **all** means every service reads it, otherwise the services named.

### 3.1 Runtime

| Key | Read by | Required | Default | Notes |
|---|---|---|---|---|
| `NODE_ENV` | all | yes | `development` | A build concern. Never conflated with `APP_ENV` |
| `APP_ENV` | all | yes | `development` | Selects the env file. The deployment concern |
| `LOG_LEVEL` | all | no | `info` | `debug` locally, `info` in production |
| `SERVICE` | all-in-one image | container only | | Selects the entrypoint. Not set in development |
| `PORT` | all | container only | per-service constant | Not set in development, where eight services cannot share one |

### 3.2 Datastores

| Key | Read by | Required | Default | Notes |
|---|---|---|---|---|
| `DATABASE_URL` | all except `gateway` | yes | | **No schema in the URL.** `packages/db` appends `?schema=<service>` |
| `DATABASE_POOL_MAX` | same | no | `10` | Per replica. Multiply by replica count against the server limit |
| `DATABASE_STATEMENT_TIMEOUT` | same | no | `15s` | A query that outlives the request is a leak, not a slow query |
| `REDIS_URL` | all | yes | | |
| `REDIS_KEY_PREFIX` | all | no | `hms` | Lets one Redis serve more than one environment |
| `RABBITMQ_URL` | all except `gateway` | yes | | |
| `RABBITMQ_EXCHANGE` | same | no | `hms.events` | |
| `RABBITMQ_DELAYED_EXCHANGE` | same | no | `hms.delayed` | Needs the delayed-message plugin, which is why the broker is self-hosted |
| `RABBITMQ_PREFETCH` | same | no | `20` | |
| `RABBITMQ_MAX_RETRIES` | same | no | `5` | Then the dead letter queue |
| `RABBITMQ_DLQ_SUFFIX` | same | no | `.dlq` | |

### 3.3 Auth

| Key | Read by | Required | Default | Notes |
|---|---|---|---|---|
| `JWT_PRIVATE_KEY` | **`identity` only** | yes | | Setting this on any other service is a defect, not a config choice |
| `JWT_PUBLIC_KEY` | all | yes | | Every service verifies independently of the gateway |
| `JWT_ISSUER` | all | no | `atelier-health` | |
| `JWT_AUDIENCE` | all | no | `atelier-health-api` | |
| `JWT_ALGORITHM` | all | no | `RS256` | Asymmetric on purpose. HS256 would put a signing key in eight services |
| `ACCESS_TOKEN_TTL` | `identity` | no | `15m` | |
| `REFRESH_TOKEN_TTL` | `identity` | no | `30d` | Rotated on every use |
| `OTP_TTL` | `identity` | no | `5m` | |
| `OTP_LENGTH` | `identity` | no | `6` | |
| `OTP_MAX_ATTEMPTS` | `identity` | no | `5` | Then lockout |
| `OTP_RESEND_COOLDOWN` | `identity` | no | `60s` | Unthrottled resend is an SMS bill |
| `OTP_LOCKOUT` | `identity` | no | `15m` | |
| `BREAK_GLASS_TTL` | `clinical` | no | `30m` | An override with no expiry is a permanent grant |

### 3.4 Gateway

Read by `apps/gateway` and nothing else.

| Key | Required | Default | Notes |
|---|---|---|---|
| `PUBLIC_URL` | yes | | Used in issued links and CORS |
| `CORS_ORIGINS` | yes | | Comma separated. Never `*` in production |
| `TRUST_PROXY` | no | `false` | `true` only behind a load balancer you control. Wrong here means spoofable client IPs, so rate limiting stops working |
| `IDENTITY_URL` … `AI_URL` | yes | localhost ports | Seven keys. Service DNS names in a container |
| `UPSTREAM_TIMEOUT` | no | `10s` | |
| `BODY_LIMIT` | no | `2mb` | |
| `RATE_LIMIT_GLOBAL` | no | `300`/min/IP | |
| `RATE_LIMIT_AUTH` | no | `10`/min | Login and OTP. Deliberately much stricter |
| `RATE_LIMIT_WINDOW` | no | `1m` | |
| `WS_HEARTBEAT` | no | `30s` | |
| `WS_MAX_CONNECTIONS_PER_USER` | no | `5` | |

### 3.5 Object storage

Read by `clinical`, `commerce`, `comms`, `ai`.

| Key | Required | Local | AWS | Notes |
|---|---|---|---|---|
| `STORAGE_DRIVER` | yes | `s3-compatible` | `aws-s3` | The only key that changes behaviour |
| `S3_ENDPOINT` | s3-compatible only | `http://localhost:9000` | unset | AWS derives it from the region |
| `S3_REGION` | yes | `us-east-1` | your region | MinIO ignores it but the client requires it |
| `S3_ACCESS_KEY` | s3-compatible only | `hmsminio` | unset | On AWS the pod uses an IAM role, not a key |
| `S3_SECRET_KEY` | s3-compatible only | `hmsminio` | unset | |
| `S3_FORCE_PATH_STYLE` | no | `true` | `true` | Required by MinIO, harmless on S3 |
| `S3_PRESIGN_TTL` | no | `300` | `300` | Seconds. Every PHI download is presigned and short-lived |
| `S3_BUCKET_DOCUMENTS` | yes | `hms-documents` | | Four separate buckets, so a policy or a retention rule can differ per class |
| `S3_BUCKET_PRESCRIPTIONS` | yes | `hms-prescriptions` | | |
| `S3_BUCKET_INVOICES` | yes | `hms-invoices` | | |
| `S3_BUCKET_LAB` | yes | `hms-lab` | | |

### 3.6 Notifications

Read by `comms`. Every driver defaults to a stub, and the stub is what makes "never send from development or test" enforceable in one place instead of in every caller.

| Key | Required when | Default | Notes |
|---|---|---|---|
| `SMS_DRIVER` | always | `console` | `console` prints, `msg91`/`gupshup`/`twilio`/`sns` send |
| `SMS_API_KEY` | driver is not console | | |
| `SMS_SENDER_ID` | driver is not console | | Six characters, DLT registered |
| `SMS_DLT_ENTITY_ID` | Indian providers | | Your registered entity |
| `SMS_DLT_TEMPLATE_OTP` | Indian providers | | One id per template. Unregistered messages are silently dropped by the operator, which is the worst possible failure mode |
| `SMS_DLT_TEMPLATE_TOKEN` | Indian providers | | |
| `SMS_DLT_TEMPLATE_REMINDER` | Indian providers | | |
| `EMAIL_DRIVER` | always | `smtp` | |
| `SMTP_URL` | driver is smtp | Mailpit | SES is used through its SMTP endpoint, never its SDK, so email has no AWS dependency |
| `EMAIL_FROM` | always | | Must be a verified sender in production |
| `EMAIL_FROM_NAME` | no | `Atelier Health` | |
| `PUSH_DRIVER` | always | `console` | |
| `EXPO_ACCESS_TOKEN` | driver is expo | | |
| `WHATSAPP_DRIVER` | always | `console` | |
| `WHATSAPP_TOKEN` | driver is cloud-api | | Rotate on a schedule. Meta tokens expire |
| `WHATSAPP_PHONE_ID` | driver is cloud-api | | |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | driver is cloud-api | | |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | driver is cloud-api | | A random string you choose and give to Meta |
| `NOTIFY_QUIET_HOURS_START` | no | `21:00` | Queue notifications ignore quiet hours. A patient waiting in a corridor is awake |
| `NOTIFY_QUIET_HOURS_END` | no | `08:00` | |

### 3.7 Payments

Read by `commerce`.

| Key | Required when | Default | Notes |
|---|---|---|---|
| `PAYMENT_DRIVER` | always | `stub` | |
| `PAYMENT_CURRENCY` | no | `INR` | |
| `RAZORPAY_KEY_ID` | driver is razorpay | | `rzp_test_*` until KYC clears |
| `RAZORPAY_KEY_SECRET` | driver is razorpay | | |
| `RAZORPAY_WEBHOOK_SECRET` | driver is razorpay | | HMAC verified against the **raw** body. Parsing before verification breaks the signature |

### 3.8 AI

Read by `ai`.

| Key | Required when | Default | Notes |
|---|---|---|---|
| `LLM_DRIVER` | always | `stub` | |
| `LLM_BASE_URL` | driver is set | | Any OpenAI-compatible endpoint, including your own vLLM or Ollama |
| `LLM_API_KEY` | driver is set | | Not needed for a local endpoint |
| `LLM_MODEL` | driver is set | | Recorded on every output, so a past answer can be reproduced |
| `LLM_TIMEOUT` | no | `30s` | Nothing on the critical path waits on this |
| `LLM_MAX_TOKENS` | no | `2048` | |
| `EMBEDDING_MODEL` | semantic search | | |
| `EMBEDDING_DIMENSIONS` | semantic search | `1536` | **Must match the pgvector column.** Changing it is a migration and a reindex, not a config edit |

### 3.9 Product behaviour

Not secrets. Defaults a hospital may override in its own settings.

| Key | Read by | Default | Notes |
|---|---|---|---|
| `DEFAULT_TIMEZONE` | `directory`, `scheduling` | `Asia/Kolkata` | A fallback only. Every hospital sets its own, and the token day derives from that, never from this |
| `DEFAULT_LOCALE` | `comms` | `en-IN` | |
| `NEAR_TURN_TOKENS` | `scheduling` | `3` | How many tokens ahead the patient is warned |
| `QUEUE_POSITION_PUBLISH_INTERVAL` | `scheduling` | `2s` | Inside the two-second p95 promise |
| `NO_SHOW_GRACE` | `scheduling` | `15m` | |
| `LAB_RESULT_SLA` | `clinical` | `24h` | Starts the timer on `lab.order.created` |
| `IDEMPOTENCY_KEY_TTL` | `scheduling`, `commerce` | `24h` | How long a replayed key returns the original response |
| `PRESCRIPTION_PDF_RETRY` | `clinical` | `3` | |

### 3.10 Clients

| Key | Read by | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `apps/web` | Baked into the browser bundle. **Never put a secret behind a `NEXT_PUBLIC_` or `EXPO_PUBLIC_` prefix** |
| `NEXT_PUBLIC_WS_URL` | `apps/web` | |
| `EXPO_PUBLIC_API_URL` | `apps/mobile` | Same warning |
| `UPDATE_FEED_URL` | desktop, mobile | Auto-update feed |
| `MIN_SUPPORTED_MOBILE_VERSION` | `gateway` | Below this, the client is told to update rather than served |
| `MIN_SUPPORTED_DESKTOP_VERSION` | `gateway` | |

### 3.11 Observability

| Key | Read by | Default | Notes |
|---|---|---|---|
| `OTEL_ENABLED` | all | `false` | |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | all | | Tempo, self-hosted on every profile including AWS |
| `OTEL_SERVICE_NAME` | all | `SERVICE` | |
| `METRICS_ENABLED` | all | `true` | |
| `METRICS_PATH` | all | `/metrics` | Scraped by Prometheus, never exposed publicly |
| `SENTRY_DSN` | all | | Optional |
| `SENTRY_TRACES_SAMPLE_RATE` | all | `0.1` | |

---

## 4. What changes per profile

The same keys throughout. Only the values change, which is the point of the whole arrangement.

| Key group | `.env.development` | `.env.testing` | `.env.container` | `.env.production` |
|---|---|---|---|---|
| Hosts | `localhost` | `localhost`, throwaway ports | Compose or Kubernetes service names | Real endpoints, injected as secrets |
| `DATABASE_URL` | local Compose | **throwaway database**, dropped per run | service name `postgres` | RDS or self-hosted, from the secret store |
| `SERVICE`, `PORT` | not set | not set | set per container | set per container |
| Every `*_DRIVER` | stub or console | **stub, always** | stub unless staging | real providers |
| `JWT_*` | locally generated pair | ephemeral pair per run | mounted secret | secret store, rotated |
| `LOG_LEVEL` | `debug` | `warn` | `info` | `info` |
| `CORS_ORIGINS` | localhost origins | localhost | staging origins | the real origins, never `*` |
| `OTEL_ENABLED` | `false` | `false` | `true` | `true` |

**Testing is the profile that matters most for safety.** Every driver is a stub, no exceptions, and the database is destroyed after the run. A test suite that can reach a real SMS provider is one environment variable away from texting real patients.

### Local versus AWS: the whole difference

| | `local`, `single-host`, `portable` | `aws` |
|---|---|---|
| Storage | `STORAGE_DRIVER=s3-compatible`, MinIO endpoint and keys | `STORAGE_DRIVER=aws-s3`, no endpoint, no keys, the pod uses an IAM role |
| Secrets | An env file, or a Kubernetes Secret | External Secrets pulls from Secrets Manager into the same Kubernetes Secret |
| Database | Compose Postgres, or self-hosted | RDS. Same `DATABASE_URL` shape |
| Redis | Compose Redis | ElastiCache. Same `REDIS_URL` shape |
| RabbitMQ | Self-hosted | **Still self-hosted.** Amazon MQ cannot install the delayed-message plugin |
| Email | Mailpit | SES through its **SMTP endpoint**, so `SMTP_URL` and nothing else |
| Everything else | identical | identical |

That is four lines of difference across twenty-two dependencies, and no service reads an `AWS_*` key in any of them.

---

## 5. CI and release secrets

GitHub Actions secrets. These are **not** in any env file and no service reads them.

| Secret | Used by | Notes |
|---|---|---|
| `DOCKERHUB_USERNAME` | `main.yml` | |
| `DOCKERHUB_TOKEN` | `main.yml` | An access token, never the account password |
| `AWS_ROLE_ARN` | `main.yml`, ECR job | OIDC role assumption. **No long-lived AWS key in CI.** Commented out until ECR is used |
| `EXPO_TOKEN` | mobile build | |
| `CSC_LINK`, `CSC_KEY_PASSWORD` | desktop build | Windows code-signing certificate |
| `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` | macOS notarisation | Only if a macOS desktop build ships |
| `ANDROID_KEYSTORE`, `ANDROID_KEYSTORE_PASSWORD` | Play release | |
| `SENTRY_AUTH_TOKEN` | source map upload | Optional |

---

## 6. Infrastructure variables

Terraform and Helm, not application configuration. Listed here so the boundary is explicit: an application never reads a cloud credential, which is what makes the AWS profile an override rather than a fork.

| Variable | Where | Profile |
|---|---|---|
| `AWS_REGION`, `aws_account_id` | Terraform `modules/aws` | `aws` only |
| `cluster_name`, `node_instance_types`, `desired_size` | Terraform | `aws` |
| `db_instance_class`, `db_allocated_storage` | Terraform | `aws` |
| `domain_name`, `acm_certificate_arn` | Terraform | `aws` |
| `external_secrets_role_arn` | Helm `values-aws.yaml` | `aws` |
| `image.registry`, `image.tag`, `image.mode` | Helm values | all |
| `ingress.className`, `ingress.host` | Helm values | all |
| `storageClass` | Helm values | all |

---

## 7. The minimum to boot today

For P0 and P1, the entire local stack, you need **nothing from any third party**:

```bash
cp envs/.env.example envs/.env.development
bash scripts/dev/generate-jwt-keys.sh    # writes JWT_PRIVATE_KEY and JWT_PUBLIC_KEY
pnpm deps:up
pnpm db:migrate
pnpm dev
```

Every driver is a stub or a local container. OTP prints to the console, email lands in Mailpit at <http://localhost:8025>, payments are stubbed, AI is stubbed, and files go to MinIO at <http://localhost:9001>.

The first key you will actually need is `SMS_API_KEY`, and only when patient login has to work on a real phone. That is why the DLT registration is the one thing to start this week.

---

See [`docs/portability.md`](../docs/portability.md) for the capability matrix behind section 4, and [`docs/developer.md`](../docs/developer.md) section 7 for how `packages/config` loads and validates all of this.
