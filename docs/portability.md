# Portability: running on AWS and without AWS

> **Rule 4:** no component may depend on one cloud. Every infrastructure dependency sits behind an interface with at least one AWS and one non-AWS implementation, and the non-AWS path runs in CI.

Cloud-agnosticism that is not exercised is a claim, not a property. This document defines the contract, the profiles, and the enforcement.

---

## 1. Why this is a product requirement, not an engineering preference

Three buyers, three deployment realities:

1. **Our SaaS.** Multi-tenant, EKS, managed AWS services, our operations team.
2. **A hospital chain with its own IT.** Their Kubernetes, their data centre or their cloud, their compliance officer, their rule that patient data does not leave their infrastructure.
3. **A single hospital with one server.** No cluster, no cloud account, one Linux box, an on-site engineer who visits twice a month.

If the same commit cannot serve all three, we lose either the second buyer (the largest contracts) or the third (the fastest pilots). The portability work is therefore paid for by sales, not by engineering aesthetics.

---

## 2. Deployment profiles

Four profiles, one codebase, one commit. Kubernetes profiles deploy the eight per-service images; Compose profiles run the all-in-one image. All nine carry the same git SHA, so the profile is a configuration choice and never a code branch.

| Profile | Runs on | Dependencies | Who uses it |
|---|---|---|---|
| `local` | Docker Compose on a laptop | All in containers | Developers |
| `single-host` | Docker Compose on one VM | All in containers on the same host | One-hospital pilot, disaster recovery, offline demo |
| `portable` | Any conformant Kubernetes (k3s, kind, GKE, DigitalOcean, Hetzner, OpenShift, on-prem) | In-cluster Postgres, Redis, RabbitMQ, MinIO | Self-hosting customers, our CI |
| `aws` | EKS | RDS, ElastiCache, S3, Secrets Manager, in-cluster RabbitMQ | Our SaaS |

**`portable` is the default profile.** `aws` is a set of overrides on top of it. That ordering matters: if AWS were the default, the portable path would rot, because nobody would run it.

### 2.1 Ownership

**BHUVNESH owns deployment.** Every profile above `local` is his: he builds them, he runs them, he is the one paged when one breaks. Nobody else on the team needs a cluster, a cloud account, or a set of credentials to do their work.

**Everyone else uses `local`, and only `local`.** One command, `docker compose -f docker/compose/compose.local.yml up`, and the whole platform is running against containers on the laptop. A developer who has never opened a Helm chart should still be able to build a feature end to end, and that is the point of the profile existing.

This is a division of labour, not a restriction. If you want to learn the Kubernetes side, ask — the constraint is that nobody is *required* to.

### 2.2 Sequencing

The three deployment profiles are built after the backend is complete, in this order, and deliberately not before:

| Profile | When | Why then |
|---|---|---|
| `local` | Now, alongside every service | It is how the backend gets written at all. It is not a deployment target, it is the development environment. |
| `single-host` | Once the backend is complete | It is the smallest real deployment: one Compose file, one VM. It proves the all-in-one image boots the whole platform before any orchestrator is involved. |
| `portable` | After `single-host` | Kubernetes is where the manifests, the probes and the secret handling get exercised. Doing it before the services are stable means debugging the chart and the code at the same time. |
| `aws` | Last | It is overrides on top of `portable`. There is nothing to override until `portable` works. |

The reason for the ordering is that a deployment profile can only be validated against a system that runs. Building the Helm chart for a service whose endpoints are still moving produces a chart that is rewritten twice and trusted once. The `local` profile carries all of the risk during development; the other three carry it after.

What this does **not** mean: the profiles are an afterthought. The capability matrix in section 3 is already binding, and the ESLint gate is already enforced. Code written today must not assume a cloud that only `aws` provides — that is what makes the later profiles a configuration exercise instead of a rewrite.

### Selecting a profile

```bash
# Helm
helm upgrade --install hms infra/helm/hms -n hms-production \
  -f infra/helm/hms/values.yaml \
  -f infra/helm/hms/values-portable.yaml     # or values-aws.yaml

# Compose
docker compose -f docker/compose/compose.single-host.yml up -d
```

The base chart contains **no cloud-specific annotation, storage class, ingress class, or IAM reference.** Everything AWS lives in `values-aws.yaml`.

---

## 3. The capability matrix

Every infrastructure dependency, its interface, and at least two implementations. If a capability cannot be listed here with a working non-AWS implementation, it does not enter the system.

| # | Capability | Interface the app sees | `portable` implementation | `aws` implementation | Other proven options |
|---|---|---|---|---|---|
| 1 | Relational database | `DATABASE_URL` (Postgres wire protocol) | CloudNativePG operator in-cluster | RDS PostgreSQL Multi-AZ | Neon, Supabase, Crunchy, bare Postgres |
| 2 | Cache and pub/sub | `REDIS_URL` | Redis in-cluster (Bitnami chart) | ElastiCache for Redis | Valkey, Upstash, DragonflyDB |
| 3 | Message broker | `RABBITMQ_URL` (AMQP 0-9-1) | RabbitMQ in-cluster, our image with the delayed-message plugin | **Same in-cluster RabbitMQ**, not Amazon MQ | CloudAMQP, self-managed on VMs |
| 4 | Object storage | `StorageProvider` over the S3 API | MinIO in-cluster | Amazon S3 | Cloudflare R2, Wasabi, Ceph RGW, Supabase Storage |
| 5 | Secrets delivery | Process environment at runtime | Sealed Secrets, or External Secrets with a Vault/Kubernetes backend | External Secrets with the AWS Secrets Manager backend | HashiCorp Vault, GCP Secret Manager, Azure Key Vault |
| 6 | Container registry | Image reference string | Docker Hub, Harbor, or a local registry | ECR (job written, commented out) | GHCR, GitLab, Quay |
| 7 | Email | `EmailProvider` over SMTP | Any SMTP relay, Mailpit in dev | SES **via its SMTP endpoint**, not the SDK | Resend, Postmark, the hospital's own Exchange relay |
| 8 | SMS and OTP | `SmsProvider` (HTTP) | MSG91 or Gupshup | Same, or SNS behind the same interface | Twilio, Kaleyra, Airtel IQ |
| 9 | Push notifications | `PushProvider` | Expo Push (FCM/APNs underneath) | Same | Direct FCM |
| 10 | WhatsApp | `WhatsAppProvider` | Meta WhatsApp Business Cloud API | Same | A BSP such as Gupshup or AiSensy |
| 11 | Payments | `PaymentProvider` | Razorpay | Same | Stripe, PayU, Cashfree |
| 12 | LLM inference | OpenAI-compatible base URL plus model id | Self-hosted vLLM, or any hosted OpenAI-compatible endpoint | Same, or Bedrock behind a small adapter | NVIDIA NIM, Together, Groq, Ollama |
| 13 | Vector search | `pgvector` inside the `ai` schema | Nothing extra to run | Nothing extra to run | Qdrant behind the same repository interface |
| 14 | Full-text search | Postgres `pg_trgm` and `tsvector` | Nothing extra to run | Nothing extra to run | OpenSearch, if a customer ever needs it |
| 15 | Ingress and TLS | Kubernetes `Ingress` plus cert-manager | ingress-nginx, Let's Encrypt | **ingress-nginx, not ALB** | Traefik, HAProxy, Istio gateway |
| 16 | Autoscaling | HPA, plus KEDA for the queue-depth trigger | KEDA reading RabbitMQ directly | Same | Any HPA-compatible metrics source |
| 17 | Metrics | Prometheus scrape endpoint | kube-prometheus-stack | **Same, not CloudWatch** | Any Prometheus-compatible backend |
| 18 | Logs | JSON to stdout | Loki plus Promtail/Alloy | Same, not CloudWatch Logs | Elastic, Datadog, whatever the customer runs |
| 19 | Traces | OTLP endpoint | Tempo | Same | Jaeger, Datadog, Honeycomb |
| 20 | Database backups | pgBackRest or WAL-G to an S3-compatible target | To MinIO | To S3 | To any of the storage options in row 4 |
| 21 | Recurring schedules | Kubernetes `CronJob` | Native | Native | Native; Compose profiles use a small ticker container |
| 22 | Desktop update feed | HTTPS static files | Any object store or web server | S3 plus CloudFront | GitHub Releases (our default) |

### Rows worth explaining

**Row 3, the broker.** Amazon MQ for RabbitMQ runs a managed broker with a fixed plugin set, so `rabbitmq_delayed_message_exchange` cannot be installed. Since all scheduled work depends on it, RabbitMQ is **self-hosted in-cluster in every profile including `aws`**. This is a deliberate, documented decision, not an oversight. See [tech-stack.md 5.6](./tech-stack.md).

**Row 7, email.** SES is used through its SMTP endpoint. This keeps `EmailProvider` a plain SMTP client, means a hospital can point it at their own relay by changing one URL, and keeps the AWS SDK out of `comms`.

**Row 15, ingress.** The AWS Load Balancer Controller would give us ALB integration and a pile of `alb.ingress.kubernetes.io/*` annotations baked into the chart. We use ingress-nginx on AWS too, behind a plain NLB. One ingress path to test, one set of manifests.

**Row 17 and 18, observability.** CloudWatch would be cheaper to set up on AWS and unavailable everywhere else. Self-hosted Prometheus and Loki cost more operations effort and are the only choice that a self-hosting customer can actually run.

---

## 4. Where cloud code is allowed to live

```
packages/
├── platform/              interfaces only. No implementation, no SDK.
│   ├── storage.ts         StorageProvider
│   ├── secrets.ts         SecretsProvider
│   ├── email.ts           EmailProvider
│   ├── sms.ts             SmsProvider
│   ├── push.ts            PushProvider
│   ├── whatsapp.ts        WhatsAppProvider
│   ├── payments.ts        PaymentProvider
│   └── llm.ts             LlmProvider
│
├── platform-generic/      S3-compatible, SMTP, HTTP. Works everywhere including AWS.
├── platform-aws/          THE ONLY package permitted to import @aws-sdk/*
└── platform-registry.ts   reads env, returns the right implementation
```

Selection is data, not code:

```ts
// packages/platform-registry.ts
export const storage = pick(process.env.STORAGE_DRIVER ?? 's3-compatible', {
  's3-compatible': () => new S3CompatibleStorage(env),   // MinIO, S3, R2, Ceph
  'aws-s3':        () => new AwsS3Storage(env),          // only if a native feature is needed
})
```

Note that `s3-compatible` already covers Amazon S3. `platform-aws` exists for the cases where a native capability genuinely has no portable equivalent, and today it contains only the Secrets Manager fetcher used by the External Secrets configuration. **If `platform-aws` ever grows past a few hundred lines, that is a signal to re-examine the design, not to keep going.**

### The four anti-lock-in rules

1. **No cloud SDK outside `packages/platform-aws`.** Enforced by lint (see section 6).
2. **No cloud-specific annotation in the base Helm chart.** AWS extras live in `values-aws.yaml` only.
3. **No provider-proprietary feature on a portable capability.** No S3 Select, no S3 Object Lambda, no Aurora-only SQL, no RDS-only extension, no ElastiCache-only command, no DynamoDB anywhere.
4. **Prefer the open protocol over the vendor API.** SMTP over the SES SDK. AMQP over a proprietary queue. The Postgres wire protocol over a data API. The S3 HTTP API over an SDK-only feature.

---

## 5. Terraform, split by concern

The old structure had AWS baked into every module. It is now two layers, and the second one is optional.

```
infra/terraform/
├── modules/
│   ├── kubernetes/                 PROVIDER-AGNOSTIC. kubernetes + helm providers only.
│   │   ├── namespaces/
│   │   ├── ingress-nginx/
│   │   ├── cert-manager/
│   │   ├── postgres-cnpg/          CloudNativePG cluster
│   │   ├── redis/
│   │   ├── rabbitmq/               our image, delayed plugin enabled
│   │   ├── minio/
│   │   ├── observability/          prometheus, grafana, loki, tempo
│   │   ├── keda/
│   │   └── sealed-secrets/
│   │
│   └── aws/                        AWS ONLY. Consumed by the aws profile.
│       ├── vpc/
│       ├── eks/
│       ├── rds/
│       ├── elasticache/
│       ├── s3/
│       ├── ecr/
│       ├── iam-irsa/
│       └── secrets-manager/
│
└── environments/
    ├── local-kind/                 modules/kubernetes only
    ├── portable-example/           modules/kubernetes only, against any kubeconfig
    ├── dev/                        aws + kubernetes
    ├── staging/                    aws + kubernetes
    └── production/                 aws + kubernetes
```

A customer running `portable` needs **only** `modules/kubernetes` and a kubeconfig. They never read an AWS module, never need an AWS account, and never see a provider block they cannot satisfy.

An AWS environment composes both: `modules/aws` provisions the substrate, `modules/kubernetes` installs what runs inside it, minus the pieces AWS is providing (RDS instead of CloudNativePG, ElastiCache instead of in-cluster Redis, S3 instead of MinIO).

---

## 6. Enforcement: how we know it still works

A portability claim decays silently. Four mechanisms keep it true.

### 6.1 Dependency lint (blocks the PR)

```jsonc
// .eslintrc, applied to every package except platform-aws
"no-restricted-imports": ["error", {
  "patterns": [
    { "group": ["@aws-sdk/*", "aws-sdk"],
      "message": "Cloud SDKs belong in packages/platform-aws. Use the interface in packages/platform." }
  ]
}]
```

### 6.2 Manifest lint (blocks the PR)

`scripts/ci/check-portable-chart.sh` renders the base chart with `values-portable.yaml` and fails if the output contains `amazonaws.com`, `eks.amazonaws.com/`, `alb.ingress`, `service.beta.kubernetes.io/aws-`, or `gp2`/`gp3` storage classes.

### 6.3 The portable deployment runs in CI on every merge

`main.yml` deploys the `portable` profile to a kind cluster with in-cluster Postgres, Redis, RabbitMQ, and MinIO, then runs the full loop smoke test. **This is the load-bearing mechanism.** Everything else in this document is documentation; this is the test.

### 6.4 Quarterly single-host drill

The `single-host` Compose profile is brought up from the published image on a clean VM with no cloud credentials present, seeded, and driven through the loop. It doubles as the disaster-recovery drill ([developer.md 10](./developer.md)).

---

## 7. What we accept as the cost

Honest accounting, so nobody is surprised later:

| Cost | Detail | Why we accept it |
|---|---|---|
| Operating RabbitMQ ourselves | Upgrades, monitoring, disk pressure, clustering | Amazon MQ cannot run the plugin we need. Self-hosting is the only path that is identical on and off AWS |
| Operating Prometheus, Loki, Grafana | More moving parts than CloudWatch | A self-hosting customer cannot use CloudWatch, and split observability is worse than uniform observability |
| Not using managed Kubernetes add-ons | No ALB controller, no EBS CSI-specific features in the chart | One ingress path, one storage path, tested everywhere |
| An adapter layer | Roughly a dozen small interfaces | It is a few hundred lines against a rewrite when a customer says "not AWS" |
| Slightly higher AWS bill | In-cluster RabbitMQ and observability run on our nodes | Predictable, and the same nodes serve every profile |

**What we do not give up:** RDS Multi-AZ, ElastiCache, S3 durability, IRSA, and Secrets Manager are all still used on the `aws` profile. Cloud-agnostic means the code does not care, not that we refuse managed services where they are available.

---

## 8. Exit checklist for a new dependency

Before adding any infrastructure dependency, all six must be true:

- [ ] It speaks an open protocol or has an interface in `packages/platform`
- [ ] It has a working implementation in the `portable` profile
- [ ] It has a working implementation in the `aws` profile (which may be the same one)
- [ ] It has a container image that runs in Compose for `local` and `single-host`
- [ ] It appears in the capability matrix in section 3
- [ ] The CI portable deployment still passes with it

If a dependency cannot satisfy these, the correct answer is to solve the problem without it.
