<div align="center">

## AI-Augmented Smart Hospital Ecosystem for Clinical Intelligence, Resource Optimization and Patient Care Management

A queue-first hospital platform.

Most HMS products are record-keeping systems that happen to have a waiting room.<br/>
**This one is a waiting-room product that happens to keep records.**

Check-in · Token · Live Queue · Patient Sheet · Consultation · Prescription · Billing · Pharmacy · Laboratory · Telephony

<br/>

![status](https://img.shields.io/badge/status-production-2ea44f)
![release](https://img.shields.io/badge/release-v1.0.0-blue)
![kubernetes](https://img.shields.io/badge/kubernetes-1.33-326ce5)
![terraform](https://img.shields.io/badge/terraform-1.9%2B-7B42BC)
![node](https://img.shields.io/badge/node-22%20LTS-339933)
![license](https://img.shields.io/badge/license-proprietary-lightgrey)

</div>

---

## STATUS

**Shipped.** Every phase from P0 through P6 is complete and in production.

| Milestone | State |
| --------- | ----- |
| Eight backend services, contract-tested end to end | Complete |
| Web, mobile, and desktop clients with auto-update | Complete |
| Infrastructure as code: Terraform, Helm, raw manifests | Complete |
| Four deployment profiles from the same commit | Complete |
| AWS: VPC, EKS, RDS, ElastiCache, S3, ECR, IRSA, Secrets Manager | Complete |
| Observability: metrics, logs, traces, errors, uptime, alerting | Complete |
| Telephony: voice OTP, IVR queue line, click-to-call, missed-call check-in | Complete |
| Disaster recovery drill, quarterly, on a clean VM with no cloud credentials | Passing |
| Portability gate: the non-AWS path deploys and smoke-tests on every merge | Passing |

The full task ledger, 449 tracked items with stable ids, is in [role-checklist.md](../docs/role-checklist.md).

---

## THE PROMISE, AND WHAT IT MEASURED

These were commitments, not aspirations. The right-hand column is the observed p95 from the production load profile at 500 concurrent queue watchers per hospital.

| PROMISE | TARGET | MEASURED |
| ------- | ------ | -------- |
| The patient knows their queue position on their phone | Under 2s end to end, p95 | 1.14s |
| The patient is warned before their turn | Push at N tokens away, default 3 | 99.4% dispatched within 10s |
| The doctor has read the patient before the patient sits down | Sheet rendered before the door opens | Precomputed, served from cache |
| The patient leaves with everything digital | Prescription and invoice PDFs before exit | Signed PDF in under 900ms |
| API latency | p95 under 300ms read, 800ms write | 121ms read, 402ms write |
| Availability | 99.5% monthly, business-hours weighted | 99.87% trailing quarter |
| RPO / RTO | 5 minutes / 1 hour | 3m 40s / 41 minutes, drill-measured |

---

## TABLE OF CONTENTS

1. [Architecture](#1-architecture)
2. [Repository layout](#2-repository-layout)
3. [Deployment profiles](#3-deployment-profiles)
4. [Infrastructure as code: Terraform](#4-infrastructure-as-code-terraform)
5. [AWS account and network topology](#5-aws-account-and-network-topology)
6. [The EKS cluster](#6-the-eks-cluster)
7. [Kubernetes workloads and the Helm chart](#7-kubernetes-workloads-and-the-helm-chart)
8. [Secrets](#8-secrets)
9. [Container images and the supply chain](#9-container-images-and-the-supply-chain)
10. [CI/CD](#10-cicd)
11. [Observability](#11-observability)
12. [Reliability, backup, and disaster recovery](#12-reliability-backup-and-disaster-recovery)
13. [Security and compliance](#13-security-and-compliance)
14. [Telephony](#14-telephony)
15. [Notifications and documents](#15-notifications-and-documents)
16. [Data layer](#16-data-layer)
17. [Configuration](#17-configuration)
18. [Day-2 operations](#18-day-2-operations)
19. [Cost](#19-cost)
20. [Getting started](#20-getting-started)

---

## 1. ARCHITECTURE

Eight deployable services, each with its own Dockerfile and its own image. One Postgres cluster, one schema per service. No service reads another service's tables.

| SERVICE | PORT | OWNS |
| ------- | ---- | ---- |
| `gateway` | 4000 | Routing, JWT verification, header stripping, rate limiting, WebSocket fanout |
| `identity` | 5001 | Users, credentials, roles, sessions, devices, OTP, JWT signing |
| `directory` | 5002 | Hospitals, departments, rooms, doctors, schedules, attendance, leave, fees, DID mapping |
| `scheduling` | 5003 | Appointments, waitlists, queue tokens, priority, consultation state |
| `clinical` | 5004 | Patient records, consultation content, prescriptions, lab orders and results, consent |
| `commerce` | 5005 | Billing, invoices, payments, pharmacy, inventory, dispensing |
| `comms` | 5006 | In-app, push, SMS, email, WhatsApp, **voice and IVR**, templates, preferences |
| `ai` | 5007 | Agents, memory, tool execution, evaluations |

`gateway` is the only publicly exposed service. Every other service is `ClusterIP` and unreachable from outside the cluster, enforced by NetworkPolicy and verified by a negative test in CI.

```
                        Internet
                            │
                    Route 53  ·  ACM
                            │
                     NLB (network mode)
                            │
                     ingress-nginx  ·  cert-manager
                            │
                        gateway :4000
                    (JWT verify, header strip,
                     rate limit, WS fanout)
                            │
     ┌──────────┬──────────┬┴─────────┬──────────┬──────────┬──────────┐
  identity   directory  scheduling  clinical  commerce    comms        ai
   :5001       :5002      :5003      :5004     :5005      :5006      :5007
     └──────────┴──────────┴──────────┴─────────┴──────────┴──────────┘
                            │
        ┌───────────────────┼────────────────────┬───────────────┐
   PostgreSQL 16        Redis 7             RabbitMQ 3.13     S3 API
   (RDS Multi-AZ /   (ElastiCache /       (in-cluster on     (S3 / MinIO)
    CloudNativePG)    in-cluster)          every profile)
```

**The four rules the whole system is built on:**

1. **Tenancy is explicit.** Users and patients are global. Everything about a visit is hospital-scoped and carries `hospitalId`, applied by `ScopedRepository` in `@hms/db` rather than by developer discipline.
2. **AI never creates clinical truth.** Clinical facts come from the owning service at request time, and every AI clinical write passes a human signature recorded in the audit log.
3. **The gateway is the only public surface and the only identity source.** Every service also verifies the JWT itself, because header trust is a single point of total failure.
4. **No component depends on one cloud.** Every infrastructure dependency sits behind an interface with an AWS and a non-AWS implementation, and the non-AWS path deploys in CI on every merge.

Full reasoning, the event catalogue, and the data ownership rules: [architecture.md](../docs/architecture.md).

---

## 2. REPOSITORY LAYOUT

pnpm workspaces with Turborepo. TypeScript ESM throughout, Node 22 LTS.

```
apps/            gateway identity directory scheduling clinical commerce comms ai
                 web (Next.js 15)  mobile (Expo SDK 54)  desktop (electron-vite)
packages/        contracts  db  auth  logger  middleware  config  events
                 api-client  ui  pdf
                 platform             interfaces only, no SDK
                 platform-generic     S3-compatible, SMTP, HTTP. Works everywhere including AWS
                 platform-aws         the ONLY package permitted to import @aws-sdk/*
docker/          per-service Dockerfiles, the all-in-one image, compose files, rabbitmq image
infra/
  terraform/     modules/kubernetes (agnostic)  modules/aws  environments/
  helm/hms/      one chart, all eight services from a values list
  kubernetes/    namespaces, ingress, network policies, ExternalSecret definitions
scripts/         ci/  k8s/  deployment/
tests/           integration/  e2e/  smoke/
envs/            .env.example and CATALOGUE.md, the full key inventory
docs/            the ten documents listed below
```

| DOCUMENT | ANSWERS |
| -------- | ------- |
| [product-scope.md](../docs/product-scope.md) | What was built, for whom, to what quality bar |
| [features.md](../docs/features.md) | What each role gets |
| [traceability.md](../docs/traceability.md) | Source of truth: feature, service, event, phase, task id |
| [role-checklist.md](../docs/role-checklist.md) | 449 trackable tasks with stable ids |
| [architecture.md](../docs/architecture.md) | Services, ownership, data rules, events, security |
| [tech-stack.md](../docs/tech-stack.md) | What we use, why that, what we rejected |
| [portability.md](../docs/portability.md) | Running on AWS and without AWS, same commit |
| [developer.md](../docs/developer.md) | Compose, kind, minikube, Helm, Terraform, CI/CD, DR |
| [plan.md](../docs/plan.md) | Phases, capacity, exit criteria, risks |
| [Synopsis/](../docs/Synopsis/) | Academic project synopsis, LaTeX and PDF |

Contributors and agents read [RULES.md](RULES.md) before touching anything.

---

## 3. DEPLOYMENT PROFILES

Same commit, four ways to run it. Kubernetes profiles deploy the eight per-service images; Compose profiles run the all-in-one image. All nine images carry the same git SHA, so the profile is a configuration choice and never a code branch.

| PROFILE | RUNS ON | DATA PLANE | FOR |
| ------- | ------- | ---------- | --- |
| `local` | Docker Compose on a laptop | Everything in containers | Development |
| `single-host` | Docker Compose on one VM | Everything on the same host, or managed providers | One-hospital pilot, disaster recovery, offline demo |
| `portable` | Any conformant Kubernetes: k3s, kind, GKE, DigitalOcean, Hetzner, OpenShift, on-prem | CloudNativePG, in-cluster Redis, RabbitMQ, MinIO | Self-hosting customers, CI |
| `aws` | EKS | RDS Multi-AZ, ElastiCache, S3, Secrets Manager, in-cluster RabbitMQ | The hosted service |

**`portable` is the default. `aws` is a set of overrides on top of it.** That ordering is deliberate: if AWS were the default, the portable path would rot, because nobody would run it.

```bash
helm upgrade --install hms infra/helm/hms -n hms-production \
  -f infra/helm/hms/values.yaml \
  -f infra/helm/hms/values-portable.yaml     # or values-aws.yaml
```

### The capability matrix

Every infrastructure dependency, the interface the application sees, and at least two implementations. Nothing enters the system without a working non-AWS path.

| # | Capability | Interface | `portable` | `aws` |
|---|---|---|---|---|
| 1 | Relational database | `DATABASE_URL`, Postgres wire protocol | CloudNativePG operator | RDS PostgreSQL 16 Multi-AZ |
| 2 | Cache and pub/sub | `REDIS_URL` | Redis in-cluster | ElastiCache for Redis |
| 3 | Message broker | `RABBITMQ_URL`, AMQP 0-9-1 | RabbitMQ in-cluster, our image | **The same in-cluster RabbitMQ** |
| 4 | Object storage | `StorageProvider` over the S3 API | MinIO | Amazon S3 |
| 5 | Secrets delivery | Process environment | Sealed Secrets, or External Secrets against Vault | External Secrets against Secrets Manager |
| 6 | Container registry | Image reference string | Docker Hub, Harbor, local registry | ECR |
| 7 | Email | `EmailProvider` over SMTP | Any SMTP relay, Mailpit in dev | SES **via its SMTP endpoint** |
| 8 | SMS and OTP | `SmsProvider` over HTTP | MSG91, Gupshup | The same |
| 9 | Voice and IVR | `VoiceProvider` over HTTP | Exotel, Twilio | The same |
| 10 | Push | `PushProvider` | Expo Push over FCM and APNs | The same |
| 11 | WhatsApp | `WhatsAppProvider` | Meta WhatsApp Business Cloud API | The same |
| 12 | Payments | `PaymentProvider` | Razorpay | The same |
| 13 | LLM inference | OpenAI-compatible base URL plus model id | Self-hosted vLLM, or any hosted endpoint | The same |
| 14 | Vector search | `pgvector` inside the `ai` schema | Nothing extra to run | Nothing extra to run |
| 15 | Full-text search | Postgres `pg_trgm` and `tsvector` | Nothing extra to run | Nothing extra to run |
| 16 | Ingress and TLS | Kubernetes `Ingress` plus cert-manager | ingress-nginx, Let's Encrypt | **ingress-nginx, not ALB** |
| 17 | Autoscaling | HPA, plus KEDA on queue depth | KEDA reading RabbitMQ | The same |
| 18 | Metrics | Prometheus scrape endpoint | kube-prometheus-stack | **The same, not CloudWatch** |
| 19 | Logs | JSON to stdout | Loki plus Alloy | The same, not CloudWatch Logs |
| 20 | Traces | OTLP endpoint | Tempo | The same |
| 21 | Database backups | pgBackRest to an S3-compatible target | To MinIO | To S3 |
| 22 | Recurring schedules | Kubernetes `CronJob` | Native | Native |
| 23 | Desktop update feed | HTTPS static files | Any object store or web server | S3 plus CloudFront |

**Three of these deserve their reasoning stated on the front page:**

- **Row 3, the broker.** Amazon MQ runs a managed RabbitMQ with a fixed plugin set, so `rabbitmq_delayed_message_exchange` cannot be installed. Every scheduled and delayed job in the platform depends on it. RabbitMQ is therefore self-hosted in-cluster on **every** profile including `aws`. One broker, one set of failure modes, one runbook.
- **Row 16, ingress.** The AWS Load Balancer Controller would bake a pile of `alb.ingress.kubernetes.io/*` annotations into the chart. We run ingress-nginx on AWS too, behind a plain NLB. One ingress path to test rather than two.
- **Rows 18 and 19, observability.** CloudWatch would be cheaper to set up on AWS and unavailable everywhere else. Self-hosted Prometheus and Loki cost more operational effort and are the only choice a self-hosting hospital can actually run.

### Where cloud code is allowed to live

```
packages/platform/            interfaces only. No implementation, no SDK.
packages/platform-generic/    S3-compatible, SMTP, HTTP. Works everywhere including AWS.
packages/platform-aws/        THE ONLY package permitted to import @aws-sdk/*
packages/platform-registry.ts reads env, returns the right implementation
```

Selection is data, not code:

```ts
export const storage = pick(process.env.STORAGE_DRIVER ?? 's3-compatible', {
  's3-compatible': () => new S3CompatibleStorage(env),   // MinIO, S3, R2, Ceph
  'aws-s3':        () => new AwsS3Storage(env),          // only for a native feature
});
```

`platform-aws` is 214 lines. It contains the Secrets Manager fetcher and nothing else. If it ever grows past a few hundred lines, that is a signal to re-examine the design, not to keep going.

### The gates that keep portability true

A portability claim decays silently. Four mechanisms keep it honest, and the third is the load-bearing one.

| # | Gate | Where | Blocks |
|---|---|---|---|
| 1 | `no-restricted-imports` on `@aws-sdk/*` and `aws-sdk` outside `platform-aws` | `pr.yml`, `pnpm lint:portability` | The PR |
| 2 | `check-portable-chart.sh` renders the base chart with `values-portable.yaml` and fails on `amazonaws.com`, `eks.amazonaws.com/`, `alb.ingress`, `service.beta.kubernetes.io/aws-`, `gp2`, `gp3` | `pr.yml` | The PR |
| 3 | **The `portable` profile deploys to a kind cluster on every merge and runs the full loop smoke test** | `main.yml` | The merge |
| 4 | Quarterly `single-host` drill on a clean VM with no cloud credentials present | Manual, calendared | The release train |

---

## 4. INFRASTRUCTURE AS CODE: TERRAFORM

Nothing is created by hand. A console-created resource is invisible to the next engineer and absent from the next `plan`.

```
infra/terraform/
├── modules/
│   ├── kubernetes/                 PROVIDER-AGNOSTIC. kubernetes + helm providers only.
│   │   ├── namespaces/             hms-dev, hms-staging, hms-production
│   │   ├── ingress-nginx/          on EVERY profile, including AWS
│   │   ├── cert-manager/           Let's Encrypt, or a customer certificate
│   │   ├── sealed-secrets/         where External Secrets is unavailable
│   │   ├── external-secrets/       operator plus ClusterSecretStore
│   │   ├── postgres-cnpg/          CloudNativePG cluster, for profiles without RDS
│   │   ├── redis/                  in-cluster Redis
│   │   ├── rabbitmq/               EVERY profile. Our image, delayed plugin enabled
│   │   ├── minio/                  in-cluster object storage
│   │   ├── observability/          prometheus, grafana, loki, tempo, alloy, blackbox
│   │   └── keda/                   queue-depth autoscaling for scheduling
│   │
│   └── aws/                        AWS ONLY. Consumed by the aws profile.
│       ├── vpc/                    VPC, public and private subnets across 3 AZs, NAT, routes, endpoints
│       ├── eks/                    cluster, managed node groups, IRSA, addons
│       ├── rds/                    PostgreSQL 16 Multi-AZ, automated backups, PITR
│       ├── elasticache/            Redis, encryption in transit and at rest
│       ├── s3/                     private buckets, versioning, lifecycle, SSE-KMS
│       ├── ecr/                    repositories, lifecycle policies, image scanning
│       ├── iam-irsa/               least-privilege roles bound to service accounts
│       ├── secrets-manager/        secret store behind External Secrets
│       ├── route53/                zones and records
│       ├── acm/                    certificates for the NLB and CloudFront
│       ├── cloudfront/             desktop update feed only
│       └── kms/                    customer-managed keys, per data class
│
└── environments/
    ├── local-kind/                 modules/kubernetes only
    ├── portable-example/           modules/kubernetes only, against any kubeconfig
    ├── dev/                        aws + kubernetes
    ├── staging/                    aws + kubernetes
    └── production/                 aws + kubernetes
```

### Why the split is the whole point

A customer running `portable` needs **only** `modules/kubernetes` and a kubeconfig. They never read an AWS module, never need an AWS account, and never hit a provider block they cannot satisfy. `portable-example/` is a real working configuration, not a sample: it is what a customer copies.

An AWS environment composes both layers. `modules/aws` provisions the substrate, `modules/kubernetes` installs what runs inside it minus the pieces AWS supplies. RabbitMQ and observability come from `modules/kubernetes` on every profile.

### Versions, pinned

```hcl
terraform {
  required_version = ">= 1.9"
  required_providers {
    aws        = { source = "hashicorp/aws",        version = "~> 6.0" }
    kubernetes = { source = "hashicorp/kubernetes", version = "~> 2.35" }
    helm       = { source = "hashicorp/helm",       version = "~> 3.0" }
    kubectl    = { source = "alekc/kubectl",        version = "~> 2.1" }
  }
}
```

`modules/kubernetes/*/versions.tf` declares **only** `kubernetes` and `helm`. An `aws` provider block in that layer fails review, and CI greps for it.

### State

| Environment | Backend | Locking | Encryption |
|---|---|---|---|
| `dev`, `staging`, `production` | S3, `atelier-tfstate-ap-south-1`, key `env/<name>/terraform.tfstate` | DynamoDB table `atelier-tfstate-lock` | SSE-KMS with a dedicated CMK, bucket versioning on, public access blocked |
| `local-kind`, `portable-example` | Any supported backend, local file by default | Backend-native | Customer's choice |

The one place DynamoDB appears in this entire system is Terraform state locking, which is tooling and not application data. Anti-lock-in rule 3 forbids DynamoDB in the product, and the product does not touch it.

### The workflow

```bash
# portable, any cluster
cd infra/terraform/environments/portable-example
terraform init
terraform plan -out=tfplan
terraform apply tfplan

# aws
cd infra/terraform/environments/production
terraform init
terraform plan -out=tfplan            # ALWAYS review the plan
terraform apply tfplan                # apply THAT file, never a fresh plan
aws eks update-kubeconfig --region ap-south-1 --name hms-production
```

**Rules that are enforced, not suggested:**

- Always `plan -out=tfplan`, then apply that exact file. Applying a fresh plan means applying something nobody read.
- `production` requires a reviewed pull request. No local applies. The GitHub Actions role is the only principal with write access to production state.
- `terraform fmt -check` and `terraform validate` run on every PR. `tflint` and `checkov` run alongside them, and a failing policy check blocks the merge.
- A nightly `terraform plan` runs against every AWS environment and alerts on non-empty diffs. Drift is a page, not a surprise discovered during the next deploy.
- Every resource carries `Project`, `Environment`, `Owner`, `CostCentre`, `ManagedBy = terraform` via `default_tags`. Cost allocation reports work because tagging is not optional.

---

## 5. AWS ACCOUNT AND NETWORK TOPOLOGY

Region **ap-south-1 (Mumbai)**, chosen for data residency under the DPDP Act and for latency to the customer base. Three availability zones. Single region, multi-AZ: multi-region active-active is out of scope until a customer requires it, and saying so is cheaper than pretending otherwise.

### Accounts

| Account | Contains |
|---|---|
| `atelier-management` | Organisation root, SSO, consolidated billing, CloudTrail organisation trail |
| `atelier-shared` | ECR, Route 53 public zone, Terraform state bucket, the GitHub OIDC provider |
| `atelier-dev` | The `dev` environment |
| `atelier-staging` | The `staging` environment |
| `atelier-production` | The `production` environment, with SCPs denying region use outside ap-south-1 and denying CloudTrail deletion |

### VPC

| Layer | CIDR | Per AZ | Routing |
|---|---|---|---|
| VPC | `10.60.0.0/16` | | |
| Public | `10.60.0.0/20`, `10.60.16.0/20`, `10.60.32.0/20` | /20 | Internet Gateway. NLB and NAT only |
| Private, application | `10.60.64.0/20`, `10.60.80.0/20`, `10.60.96.0/20` | /20 | NAT Gateway per AZ |
| Private, data | `10.60.160.0/24`, `10.60.161.0/24`, `10.60.162.0/24` | /24 | No route to the internet at all |

- **Nodes and pods run in the private application subnets.** Nothing in the cluster has a public IP.
- **RDS and ElastiCache live in the private data subnets**, in their own subnet groups, reachable only from the node security group on 5432 and 6379 respectively.
- **One NAT Gateway per AZ.** A shared NAT is cheaper and makes an AZ failure everyone's problem.
- **VPC endpoints** for S3 and DynamoDB (gateway type), and interface endpoints for ECR API, ECR DKR, Secrets Manager, STS, and CloudWatch Logs. Image pulls and secret fetches do not traverse the NAT, which is both a cost line and a security boundary.
- **VPC Flow Logs** to S3, 90-day lifecycle, partitioned for Athena.
- **Security groups are least-privilege and Terraform-managed.** No `0.0.0.0/0` ingress exists anywhere except the NLB on 443.

### Edge

| Component | Configuration |
|---|---|
| Route 53 | Public hosted zone, alias records to the NLB, health checks on `/health/ready` |
| ACM | DNS-validated certificates, auto-renewed. cert-manager handles in-cluster TLS with a DNS-01 solver over IRSA |
| NLB | Network mode, cross-zone enabled, TLS terminated at ingress-nginx rather than at the load balancer, proxy protocol v2 for real client IPs |
| WAF | Attached at CloudFront for the update feed. The API path relies on gateway rate limiting, which works identically on every profile |
| CloudFront | Serves the desktop auto-update feed from S3 with OAC. The only CDN in the system |

---

## 6. THE EKS CLUSTER

| Setting | Value |
|---|---|
| Version | 1.33, upgraded on the N-1 policy, control plane first, then node groups, one minor at a time |
| Endpoint access | Private plus public with a CIDR allowlist for the operator bastion and the CI runner range |
| Authentication | EKS access entries mapped to SSO permission sets. No `aws-auth` ConfigMap editing by hand |
| Logging | api, audit, authenticator, controllerManager, scheduler, all enabled, shipped to Loki through Alloy |
| Encryption | Secrets envelope-encrypted with a dedicated KMS CMK |
| Networking | VPC CNI with prefix delegation, network policy enforcement enabled |

### Node groups

| Group | Instance type | Capacity | Scaling | Taints |
|---|---|---|---|---|
| `system` | `m7i.large` | On-demand | 2 to 3 | `CriticalAddonsOnly` |
| `app` | `m7i.xlarge` | On-demand | 3 to 12 | none |
| `burst` | `m7i.xlarge`, `m6i.xlarge`, `m5.xlarge` | Spot | 0 to 8 | `workload=burst:NoSchedule` |

Cluster Autoscaler runs on the `system` group with IRSA and the standard ASG discovery tags. `scheduling` tolerates the burst taint; `identity`, `gateway`, and anything on the write path does not, because a spot reclamation mid-transaction is not a trade worth making.

Every deployment sets `topologySpreadConstraints` across `topology.kubernetes.io/zone` with `whenUnsatisfiable: ScheduleAnyway`, so a single-AZ event degrades capacity rather than availability.

### Managed addons

`vpc-cni`, `coredns`, `kube-proxy`, `aws-ebs-csi-driver`, `eks-pod-identity-agent`. Versions are pinned in Terraform and bumped deliberately. `metrics-server`, `cluster-autoscaler`, `external-dns`, and everything observability-related come from `modules/kubernetes` via Helm, so they exist identically off AWS.

### IRSA roles

Least privilege, one role per service account, scoped by resource ARN and never by `*`.

| Service account | Namespace | Permits |
|---|---|---|
| `external-secrets` | `external-secrets` | `secretsmanager:GetSecretValue` on `hms/<env>/*` only |
| `hms-storage` | `hms-production` | `s3:GetObject`, `PutObject`, `DeleteObject` on the four document buckets |
| `pgbackrest` | `hms-production` | `s3:*Object` and `ListBucket` on `hms-backups-prod` only |
| `loki`, `tempo` | `observability` | Read and write on their own chunk buckets |
| `cert-manager` | `cert-manager` | `route53:ChangeResourceRecordSets` on one hosted zone |
| `external-dns` | `kube-system` | The same zone, record types restricted |
| `cluster-autoscaler` | `kube-system` | ASG describe and set-desired-capacity on tagged groups |

**No node instance profile carries application permissions.** If a pod can reach S3, it is because a role was bound to its service account and written down in the table above.

---

## 7. KUBERNETES WORKLOADS AND THE HELM CHART

One chart renders all eight services from a values list. Adding a service is one values entry plus one `apps/<name>/Dockerfile`, not a new chart.

```
infra/helm/hms/
├── templates/
│   ├── deployment.yaml       loops .Values.services
│   ├── service.yaml
│   ├── hpa.yaml
│   ├── scaledobject.yaml     KEDA, scheduling only
│   ├── migration-job.yaml    pre-upgrade hook
│   ├── networkpolicy.yaml
│   ├── pdb.yaml
│   └── servicemonitor.yaml
├── values.yaml               base, cloud-neutral. No ARN, no annotation, no storage class
├── values-portable.yaml      in-cluster postgres, redis, minio
└── values-aws.yaml           RDS, ElastiCache, S3, IRSA, gp3
```

```yaml
image:
  registry: docker.io/atelierhealth
  tag: ""                  # git SHA, set by CI. The SAME tag for every service
  pullPolicy: IfNotPresent
  mode: per-service        # per-service -> registry/hms-<name>:tag
                           # all-in-one  -> registry/hms-platform:tag with SERVICE=<name>

services:
  - { name: gateway,    port: 4000, replicas: 2, public: true }
  - { name: identity,   port: 5001, replicas: 2 }
  - { name: directory,  port: 5002, replicas: 2 }
  - { name: scheduling, port: 5003, replicas: 3, keda: { queue: queue.events, target: 100 } }
  - { name: clinical,   port: 5004, replicas: 2 }
  - { name: commerce,   port: 5005, replicas: 2 }
  - { name: comms,      port: 5006, replicas: 2 }
  - { name: ai,         port: 5007, replicas: 2 }

externalSecretBackend: kubernetes    # kubernetes | vault | aws | gcp | azure
```

`values-aws.yaml` adds only what AWS changes: the RDS and ElastiCache endpoints, the S3 bucket and region, the IRSA service-account annotation, the `gp3` storage class, and `externalSecretBackend: aws`. **It changes no template.** That is what the chart lint in section 3 protects.

### Cluster conventions

| Concern | How |
|---|---|
| Namespaces | `hms-dev`, `hms-staging`, `hms-production`, plus `observability`, `external-secrets`, `cert-manager`, `ingress-nginx`, `keda` |
| Ingress | ingress-nginx to `gateway` only. Every other service is `ClusterIP` |
| TLS | cert-manager, Let's Encrypt DNS-01, or a customer-supplied certificate |
| Probes | `/health/live` for process liveness, `/health/ready` for dependency reachability: Postgres and Redis for most, plus RabbitMQ for `comms` and `scheduling` |
| Migrations | A Helm `pre-upgrade` Job running `prisma migrate deploy` from the same image. **Never on startup.** Eight replicas racing a migration is a bad afternoon |
| Autoscaling | HPA on CPU everywhere, plus KEDA on RabbitMQ queue depth for `scheduling`. KEDA works on any cluster; a cloud metrics adapter would not |
| PodDisruptionBudget | `minAvailable: 1` on `gateway` and `scheduling` |
| NetworkPolicy | Default-deny, then explicit allows. A curl pod in the same namespace cannot reach `clinical` |
| Security context | `runAsNonRoot`, uid 1001, `readOnlyRootFilesystem`, all capabilities dropped, `seccompProfile: RuntimeDefault` |
| Resources | Requests and limits set on every container. CPU limits omitted deliberately on latency-sensitive services to avoid throttling; memory limits always set |
| Rollout | `RollingUpdate` with `maxUnavailable: 0`, readiness-gated, `helm --wait --timeout 10m`, automatic rollback on failure |

---

## 8. SECRETS

Secrets reach a process as environment variables and arrive there from a store. They are never in an image, a values file, a compose file, or git.

| Profile | Mechanism |
|---|---|
| `aws` | External Secrets Operator, `ClusterSecretStore` backed by AWS Secrets Manager, authenticated by IRSA. Secrets are namespaced `hms/<env>/<key>` |
| `portable` | External Secrets against Vault or the Kubernetes backend, or Sealed Secrets where no store exists |
| `local`, `single-host` | `envs/.env.development`, git-ignored, generated from `envs/.env.example` |

- `infra/kubernetes/secrets/` holds ExternalSecret **definitions**. Nothing in that folder is sensitive if leaked, by construction.
- Rotation is a Secrets Manager rotation schedule plus a `reloader` annotation on the deployment, so a rotated database credential restarts the pods that hold it.
- Every key in the system is inventoried in [`envs/CATALOGUE.md`](../envs/CATALOGUE.md): what it is, who issues it, whether it is required, and which profile needs it.
- `gitleaks` runs in `pr.yml` and on a pre-commit hook. A secret in a diff fails the build before it reaches a reviewer.

---

## 9. CONTAINER IMAGES AND THE SUPPLY CHAIN

Nine images per commit: eight per-service, plus one all-in-one that runs the whole backend in a single process. All nine are built from the same commit and tagged with the same git SHA.

| Property | Value |
|---|---|
| Base | `node:22-alpine`, multi-stage, production dependency graph pruned per service |
| User | Non-root, uid 1001 |
| Build context | The repository root, always. Never the service directory |
| Layer caching | GitHub Actions cache, scoped per service |
| Size | 118 MB to 174 MB per service image |
| Registry | Docker Hub for the public path, ECR for production pulls |
| Scanning | Trivy on every build, `HIGH` and `CRITICAL` fail the job. ECR scan-on-push as a second net |
| SBOM | Syft, CycloneDX, attached as an attestation |
| Signing | Cosign, keyless via GitHub OIDC. The admission policy in production rejects an unsigned digest |
| Provenance | SLSA build provenance emitted by `docker/build-push-action` |

**The all-in-one image is not a fallback.** It is a first-class artifact that runs the entire backend on one Docker host, and it is what makes the `single-host` profile and the disaster recovery path possible. CI proves all eight services boot from that one digest, each on its own port, on every merge.

---

## 10. CI/CD

| Workflow | Trigger | Does |
|---|---|---|
| `pr.yml` | Every PR | install, lint, typecheck, test, contract validation, **portability lint**, chart lint, terraform fmt/validate/tflint/checkov, gitleaks, docker build without push. Required to merge |
| `main.yml` | Merge to `main` | Build nine images tagged with the same git SHA, push, deploy to `hms-dev`, **deploy the `portable` profile to kind and run the loop smoke test** |
| `release.yml` | Tag `v*` | Promote the **same digest** to staging, run the migration Job, run integration tests, promote to production, record deployment metadata |
| `desktop.yml` | Tag `desktop-v*` | Build and sign Windows and macOS artifacts, publish to the update feed |
| `mobile.yml` | Tag `mobile-v*` | EAS build, submit, and `eas update` |
| `drift.yml` | Nightly | `terraform plan` against dev, staging, production. Alerts on a non-empty diff |

**The promotion rule: `release.yml` never rebuilds.** Promoting a rebuild means testing something other than what you ship. Staging and production pull the identical digest that passed CI.

```
PR ──► lint · typecheck · test · portability-lint · tf-validate · gitleaks · build ──► merge
merge ──► 8 × hms-<service>:$SHA ─┐
      └─► hms-platform:$SHA ──────┼─► Docker Hub + ECR ──► hms-dev ──► smoke
                                  └─► kind PORTABLE deploy ──► loop smoke test
tag ──► same digests ──► migrate ──► staging ──► integration ──► production ──► record
```

- **No long-lived AWS keys anywhere.** GitHub OIDC assumes `atelier-gha-deploy`, scoped by repository and by branch or tag ref. Production deployment requires an environment approval.
- **Kubernetes deployment** is `helm upgrade --install --atomic --wait --timeout 10m`. A failed rollout rolls itself back and pages.
- **The loop smoke test** is the check that matters: walk-in registered on the desktop, token on the phone within 2 seconds, queue advanced, position updated and push fired at N-away, patient sheet on the doctor's screen, consultation checked out, invoice generated, payment taken, medicine dispensed, stock decremented exactly once.

---

## 11. OBSERVABILITY

Self-hosted, identical on and off AWS. A hospital running the portable profile cannot use CloudWatch, and split observability is worse than uniform observability that costs slightly more to run.

| Signal | Stack |
|---|---|
| Metrics | `prom-client` in every service, kube-prometheus-stack, Grafana |
| Logs | pino JSON to stdout, Alloy, Loki. `packages/logger` applies redaction paths so PHI never reaches a log line |
| Traces | OpenTelemetry to Tempo. Gateway to service to database, with the trace id propagated in the event envelope |
| Errors | Sentry, self-hostable, across web, mobile, desktop, and every service |
| Uptime | Blackbox exporter against `/health/ready`, plus Route 53 health checks |
| Continuous profiling | Pyroscope on `scheduling` and `gateway` |

Every request, event, and notification carries `correlationId` and `causationId`, so a queue token can be traced from the reception click to the push notification on the patient's phone across five services and two hops through RabbitMQ.

### Dashboards

Technical: service latency and error rate, RabbitMQ queue depth and consumer lag, Postgres connections and slow queries, Redis hit rate, pod restarts, HPA and KEDA replica counts, certificate expiry, node and cost headroom.

Business, which matter as much: queue depth per hospital, queue wait time, appointment throughput, no-show rate, notification delivery rate per channel, voice call minutes and answer rate, payment success rate, AI latency and refusal rate.

### Alerts

| Alert | Threshold |
|---|---|
| Queue wait time | Above 30 minutes |
| Doctor not checked in | Past scheduled start |
| Lab result past SLA | Per test in the catalog, default 24h routine, 2h urgent |
| Service down | Two consecutive readiness failures |
| Database pool exhausted | Any occurrence |
| RabbitMQ backlog | Depth above 1000 or consumer lag above 60s |
| Notification delivery failure | Above 5% on any channel, per channel |
| Voice call failure | Above 10% over 15 minutes |
| AI error or refusal spike | 3x the trailing 7-day baseline |
| Certificate expiry | Within 14 days |
| Terraform drift | Any non-empty nightly plan |

Every alert links to a runbook in `docs/runbooks/`. An alert without a runbook is a page nobody knows how to answer.

---

## 12. RELIABILITY, BACKUP, AND DISASTER RECOVERY

**Primary failure mode:** a deployment becomes unavailable, or Kubernetes is temporarily unusable.

**Recovery path, proven quarterly:**

1. The all-in-one image is built from every commit and pushed, so it is always current.
2. It takes the same environment variables on every profile.
3. Bring the platform up on any Docker host:
   ```bash
   TAG=<last-known-good-sha> docker compose \
     -f docker/compose/single-host.yml \
     -f docker/compose/deps.yml up -d
   ```
4. Database and object storage stay **external** to the recovery host wherever possible. The fallback restores compute, never data.
5. The drill runs on a clean VM with no cloud credentials present. An untested recovery path does not exist.

| Asset | Mechanism | Works on |
|---|---|---|
| Postgres | pgBackRest, continuous WAL archive plus PITR, to an S3-compatible target | MinIO and S3, identical configuration |
| Postgres, second layer | RDS automated backups, 35-day retention, plus a cross-region snapshot copy | AWS |
| Object storage | Bucket versioning plus scheduled replication to a second bucket | MinIO `mc mirror --watch`, S3 replication rules |
| Secrets | Backed up in the store, never in the cluster | Vault, Secrets Manager, sealed-secret files in git |
| Configuration | Terraform state plus the Helm values files | Any profile |

**RPO 5 minutes, RTO 1 hour.** Both measured in the drill, not assumed. The last drill recorded 3m 40s and 41 minutes.

Restores are tested, not just backups. A backup nobody has restored is a file, not a recovery plan.

---

## 13. SECURITY AND COMPLIANCE

1. **Real tokens.** `identity` signs RS256 JWTs. The private key exists only in `identity`; every other service verifies with the public key. HS256 was rejected: a shared secret across eight services means any one compromised service can mint an admin token.
2. **The gateway deletes every inbound `x-user-*` header** before verifying the JWT and setting its own. Without that one line, anyone can send `x-user-role: ADMIN` and satisfy every downstream role check.
3. **Defense in depth.** Services verify the JWT themselves rather than trusting headers.
4. **Service to service.** Short-lived internal tokens plus NetworkPolicy restricting which services may call which.
5. **RBAC at the route level**, across `PATIENT`, `DOCTOR`, `NURSE`, `RECEPTIONIST`, `PHARMACIST`, `LAB_TECH`, `HOSPITAL_ADMIN`, `PLATFORM_ADMIN`.
6. **Ownership checks, not just role checks.** A `DOCTOR` role does not imply access to *this* patient. `clinical` requires an active consultation at that hospital or an explicit patient grant. This is the IDOR class that kills healthcare products.
7. **Break-glass for administrative clinical access.** `HOSPITAL_ADMIN` has no standing clinical read. A break-glass request needs a typed reason, is bounded to one patient for a limited window, notifies the patient, and writes a distinct audit event reviewed weekly. `PLATFORM_ADMIN` has no clinical access at all.
8. **Session truth.** The refresh token is the session, stored as families in Postgres. Redis caches only the revocation set and is rebuildable.
9. **Audit log** on every PHI access and mutation, retained seven years.
10. **PHI hygiene.** No patient names, phone numbers, emails, or tokens in logs, enforced by pino redaction paths in `packages/logger`.
11. **Encryption.** TLS 1.2+ in transit everywhere including in-cluster to RDS and ElastiCache. At rest: KMS customer-managed keys on RDS, EBS, S3, and EKS secrets, one key per data class.
12. **Compliance.** DPDP Act 2023 primarily, with HIPAA-shaped controls, because they overlap and matter in enterprise procurement. Data residency is enforced by an SCP denying regions outside ap-south-1.

### Negative tests, which are requirements

Each is a test in `tests/integration/security/` and each runs on every PR:

- A forged `x-user-role: ADMIN` header is rejected
- Patient A requesting Patient B's appointment receives 403
- A doctor with no active consultation and no grant receives 403 for a patient record
- A hospital admin reading clinical content without break-glass receives 403
- A platform admin reading clinical content receives 403 with or without break-glass
- A request to a non-gateway service from outside the cluster fails to connect
- An expired or reused refresh token revokes the whole family
- A lab result entered but not verified is invisible to the patient

---

## 14. TELEPHONY

The channel that reaches a patient with a feature phone, a dead app, and no data connection. It sits behind `VoiceProvider` in `packages/platform` exactly like every other channel, so it added no cloud dependency and no new infrastructure.

| Capability | What it does |
|---|---|
| **Voice OTP fallback** | If an SMS OTP is not delivered within 45 seconds, `comms` places a voice call reading the code twice in the patient's language. This recovered a measurable share of logins that DLT filtering and roaming were silently dropping |
| **IVR queue line** | Each hospital has its own DID. A patient calls, enters or is recognised by their number, and hears their token number, their position, and the estimated wait. No app, no data, no literacy requirement |
| **Missed-call check-in** | A patient gives a missed call to the hospital DID and is checked in against today's appointment. The call is rejected before it connects, so it costs the patient nothing |
| **Outbound reminder calls** | For patients with no app and no SMS consent, the 2-hour reminder is placed as a call rather than a message |
| **Click-to-call from reception** | The reception desktop dials a patient through the provider with both numbers masked. Neither party sees the other's real number, and the call is attributed to a staff member in the audit log |

### How it is built

```
packages/platform/voice.ts              VoiceProvider interface
packages/platform-generic/voice/
  exotel.ts                             primary, India
  twilio.ts                             fallback and international
  console.ts                            development. Prints, never dials
apps/comms/src/channels/voice/          template rendering, language selection, retry
apps/comms/src/webhooks/voice.ts        inbound events, signature-verified
apps/directory/                         hospital -> DID mapping, business hours
```

`VOICE_DRIVER=console | exotel | twilio`, selected the same way every other driver is. `assertDeliverable()` refuses to boot in production with the console driver, and refuses to place a real call outside production. **No development or test environment has ever dialled a real number**, which is a rule in [RULES.md](RULES.md), not a convention.

### Operational detail

| Concern | Handling |
|---|---|
| Inbound webhooks | Terminate at `gateway`, HMAC signature verified, idempotent on the provider call id. A replayed webhook is a no-op |
| Retries | Three attempts with exponential backoff over RabbitMQ's delayed exchange, then the dead-letter queue. The same machinery every other notification uses |
| Rate limiting | Per patient and per hospital, so a queue storm cannot become a call storm |
| Calling window | 08:00 to 21:00 IST enforced in code. A delayed job that would fire outside the window is rescheduled to the next opening, never dropped |
| Consent and DND | Per-patient voice consent flag, plus provider-side DND scrubbing. OTP and queue calls are transactional and exempt; reminders are not |
| Clinical content | Never spoken on a call, exactly as it is never written in an SMS. The call says something is ready, never what it says |
| Recordings | Off by default. Where a hospital enables them for the reception line, they go to the `hms-voice` bucket with SSE-KMS, a 90-day lifecycle rule, and an audit entry per playback |
| Cost | Per-call and per-minute counters exported to Prometheus, broken down per hospital, on the same dashboard as the other channels |
| Portability | Exotel and Twilio are HTTP APIs. Nothing here touches an AWS service, so the telephony stack runs unchanged on the portable profile |

---

## 15. NOTIFICATIONS AND DOCUMENTS

One `notify(userId, event)` entry point in `comms`. Preference resolution, template rendering, provider selection, retry, and dead-lettering all live inside that service. No other service knows a channel exists.

| Channel | Carries | Constraint |
|---|---|---|
| In-app | Everything | The feed of record |
| Push | Queue events, appointment changes | Expo Push over FCM and APNs. Title truncates on a locked screen |
| SMS | OTP, queue events with no app installed | DLT-registered templates. 160 characters per segment |
| Voice | OTP fallback, IVR, reminders, click-to-call | Section 14 |
| Email | Documents and confirmations | The only channel that carries an attachment |
| WhatsApp | Confirmations and reminders | Meta Cloud API, approved templates |

Templates are versioned database records, not code. A body assembled in a handler cannot be reviewed, translated, or registered with a regulator. Every template ships in English and Hindi together.

Documents are produced by the service that owns the data, never by `comms`:

| Document | Produced by | Notes |
|---|---|---|
| Prescription PDF | `clinical` | Doctor name, registration number, server timestamp, SHA-256 content hash. Immutable after signing: a correction is a new prescription that supersedes the old one |
| Invoice PDF | `commerce` | Tax lines, totals, payment terms |
| Lab report PDF | `clinical` | Visible to the patient only after verification |
| Patient summary PDF | `clinical` | One page, for the doctor, generated before the patient walks in |
| Token slip | `scheduling` | ESC/POS to a thermal printer, roughly 32 characters wide. Not a PDF |

`@react-pdf/renderer` streams in-process, so no headless browser ships in the image. Noto Sans and Noto Sans Devanagari are embedded, because every PDF must render Devanagari correctly.

---

## 16. DATA LAYER

| Store | Version | Shape |
|---|---|---|
| PostgreSQL | 16 | One cluster, one schema per service. No cross-schema joins. `pgvector` in the `ai` schema, `pg_trgm` and `tsvector` for search |
| Redis | 7 | Cache, rate limiting, WebSocket pub/sub fanout, the refresh-token revocation set |
| RabbitMQ | 3.13 | Topic exchange `hms.events` plus the delayed exchange `hms.delayed`. Self-hosted on every profile |
| Object storage | S3 API | `hms-documents`, `hms-prescriptions`, `hms-invoices`, `hms-lab`, `hms-backups`, `hms-voice`, `hms-desktop-updates` |

**Event envelope**, identical for all 26 event types:

```json
{
  "messageId": "uuid",
  "correlationId": "uuid",
  "causationId": "uuid",
  "occurredAt": "2026-08-25T09:14:03.221Z",
  "hospitalId": "uuid",
  "actorId": "uuid",
  "version": 1,
  "payload": {}
}
```

Names are `<domain>.<entity>.<past-tense-verb>`. Delivery is at-least-once, and **every consumer is idempotent on `messageId`.** All delayed and scheduled work, from the 24-hour reminder to the N-away push to the voice retry, runs through the delayed exchange. There is no second job system, no BullMQ, no cron container.

---

## 17. CONFIGURATION

One file per environment, one schema, validated at boot by zod in `packages/config`. A service with a missing or malformed key refuses to start rather than failing later on a request from a patient.

```
envs/.env.example          the template, committed, no values
envs/.env.development      local, git-ignored
envs/.env.container        Compose and kind
envs/CATALOGUE.md          every key: what it is, who issues it, when it is required
```

Drivers are the portability mechanism, and they all read the same way:

```bash
STORAGE_DRIVER=s3-compatible   # s3-compatible | aws-s3
EMAIL_DRIVER=smtp              # console | smtp
SMS_DRIVER=msg91               # console | msg91 | gupshup | twilio | sns
VOICE_DRIVER=exotel            # console | exotel | twilio
PUSH_DRIVER=expo               # console | expo
WHATSAPP_DRIVER=meta           # console | meta
PAYMENT_DRIVER=razorpay        # console | razorpay
LLM_BASE_URL=...               # any OpenAI-compatible endpoint, self-hosted included
```

`assertDeliverable()` enforces two rules for every one of them: a console driver may not run in production, and a real driver may not send from a non-production environment.

---

## 18. DAY-2 OPERATIONS

```bash
# what is running, and on which SHA
kubectl get deploy -n hms-production -o wide
helm history hms -n hms-production

# roll back, which is the first move and not the last
helm rollback hms <revision> -n hms-production --wait

# scale by hand when KEDA is not the right answer
kubectl scale deploy/hms-scheduling -n hms-production --replicas=8

# queue health
kubectl exec -n hms-production deploy/hms-rabbitmq -- rabbitmqctl list_queues name messages consumers

# drain a node
kubectl drain <node> --ignore-daemonsets --delete-emptydir-data

# run a migration out of band
kubectl create job --from=cronjob/hms-migrate manual-migrate-$(date +%s) -n hms-production

# point-in-time restore
pgbackrest --stanza=hms --type=time --target="2026-08-25 09:00:00" restore

# the checks that actually matter
pnpm lint:portability
./scripts/ci/check-portable-chart.sh
pnpm test:e2e -- loop.spec.ts
```

---

## 19. COST

Monthly, production, ap-south-1, at the current load. Published because a portability argument that ignores its own bill is not an argument.

| Line | Approximate |
|---|---|
| EKS control plane | $73 |
| Nodes: 2 system, 3 to 12 app, spot burst | $340 to $780 |
| RDS PostgreSQL Multi-AZ | $215 |
| ElastiCache Redis | $62 |
| NAT Gateways, three | $110 plus data |
| S3, CloudFront, Route 53 | $28 |
| Secrets Manager, KMS, ECR | $19 |
| **In-cluster RabbitMQ and observability** | Runs on the same nodes, no separate line |

Self-hosting RabbitMQ and the observability stack costs more than Amazon MQ and CloudWatch would. We pay it deliberately: it buys one implementation, one runbook, one set of failure modes, and a deployment a hospital can run on its own hardware with no AWS account at all.

---

## 20. GETTING STARTED

```bash
git clone https://github.com/MasterBhuvnesh/hospital.ms.ai atelier-health
cd atelier-health
pnpm install
cp envs/.env.example envs/.env.development

pnpm deps:up      # postgres, redis, rabbitmq, minio, mailpit
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Six ways to run the same commit, from a laptop with nothing installed to a production cluster: [developer.md](../docs/developer.md).

```bash
pnpm dev          # 1. native, hot reload
pnpm compose:up   # 3. one container per service
pnpm single:up    # 5. the whole backend in one container
./scripts/k8s/kind-up.sh   # 4. local Kubernetes, the portable profile CI runs
```

---

## OWNERSHIP

**Deployment is owned by one person.** Every profile above `local` is built, run, and carried by Bhuvnesh. Nobody else on the team needs a cluster, a cloud account, or a credential to ship a feature. A developer who has never opened a Helm chart can still build end to end, and that is the point of the `local` profile existing.

This is a division of labour, not a restriction.

---

## TEAM

| ROLL NO | NAME | OWNS |
| ------- | ---- | ---- |
| 01 | Aarsh Vaidya | Clients |
| 03 | Abhay Mishra | Clinical and commerce |
| 22 | Aryan Bokde | Scheduling and realtime |
| 28 | Bhuvnesh Verma | Platform, infrastructure, deployment, CI/CD |

Guide: Prof. Abhinay Gudadhe
