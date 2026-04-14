# DevOps Implementation Roadmap

> A practical guide for implementing production-grade DevOps tooling on the HMS (Hospital Management System) backend — a 21-microservice architecture with 5 infrastructure components.

---

## Current State

| Layer | What Exists | Status |
|-------|-------------|--------|
| Containerization | Multi-stage Dockerfiles per service | Done |
| Orchestration | Docker Compose (db, local, production) | Done |
| CI/CD | GitHub Actions (build + push on tag) | Basic |
| Build Automation | Makefile (build/push all or per-service) | Done |
| Image Registry | Docker Hub (`verma2904/hms-*`) | Done |
| Monitoring | `@hms/common-observatory` placeholder | Not Started |
| Infrastructure as Code | None | Not Started |
| Kubernetes | None | Not Started |
| GitOps | None | Not Started |

---

## Phase 1: Terraform (Infrastructure as Code)

### What

Provision the cloud infrastructure and Kubernetes cluster using Terraform so the entire platform is reproducible from code.

### Why Implement

- An interviewer will ask "how did you provision the cluster?" — clicking buttons in the AWS console kills credibility.
- Terraform proves infrastructure can be created, modified, and destroyed reproducibly.
- It is the industry-standard IaC tool (HashiCorp ecosystem, massive community, every cloud provider supported).
- State management and plan/apply workflow teaches disciplined infrastructure changes.

### Scope

| Resource | Purpose |
|----------|---------|
| VPC + Subnets | Network isolation for the cluster |
| Security Groups | Firewall rules for nodes, databases, ingress |
| IAM Roles & Policies | Least-privilege access for K8s nodes, CI/CD, ArgoCD |
| EKS/GKE Cluster | Managed Kubernetes control plane |
| Node Groups | Worker nodes for running the 21 services |
| Remote State Backend | S3 + DynamoDB (state locking) or GCS |
| (Optional) RDS | Managed PostgreSQL — avoids running stateful DB in K8s |
| (Optional) ElastiCache | Managed Redis — same reason |

### What NOT to Do

- Do not Terraform the application layer (Helm/ArgoCD handles that).
- Do not over-modularize — keep it practical with 3-4 modules (network, cluster, database, IAM).

### CV Talking Points

- "I provisioned the entire platform using Terraform modules — VPC, EKS cluster, node groups, IAM. One `terraform apply` creates everything from scratch."
- "State is stored remotely with locking to prevent concurrent modifications."
- "Managed databases (RDS/ElastiCache) for stateful workloads instead of running them in K8s — I made that tradeoff deliberately because [reason]."

---

## Phase 2: Kubernetes + Helm

### 2A: Kubernetes

#### What

Migrate all 21 services from Docker Compose to Kubernetes, with proper resource management, health checks, and scaling policies.

#### Why Implement

- 21 microservices managed by Docker Compose in production is a red flag. Kubernetes is the industry standard for container orchestration.
- It separates "I can run containers" from "I can orchestrate production systems."
- Real-world HMS would need zero-downtime deployments, auto-scaling during peak hours (morning OPD rush), and self-healing when services crash.
- This is the #1 skill recruiters look for in DevOps roles.

#### K8s Resources to Create

| Resource | Use Case |
|----------|----------|
| Deployments | All 21 Node.js microservices |
| StatefulSets | PostgreSQL, Redis, Elasticsearch (if not using managed) |
| Services (ClusterIP) | Internal communication between services |
| Services (LoadBalancer/NodePort) | API Gateway external access |
| Ingress | L7 routing, TLS termination, path-based routing |
| ConfigMaps | Non-sensitive config (NODE_ENV, service URLs, ports) |
| Secrets | Database passwords, JWT secrets, API keys (replacing `.env` files) |
| Namespaces | `hms-core` (services), `hms-infra` (databases/queues), `hms-monitoring` |
| HorizontalPodAutoscaler | Auto-scale queue-service, appointment-service under load |
| PersistentVolumeClaims | PostgreSQL data, Redis AOF, Elasticsearch indices, MinIO storage |
| Resource Requests/Limits | CPU and memory per service (21 services competing for resources) |
| Liveness Probes | Restart unhealthy containers |
| Readiness Probes | Only route traffic to ready containers |
| NetworkPolicies | Restrict which services can talk to which (e.g., only API Gateway receives external traffic) |

#### CV Talking Points

- "I manage 21 microservices across 3 namespaces with resource limits, HPA, and health probes."
- "NetworkPolicies ensure only the API Gateway receives external traffic — internal services communicate over ClusterIP."
- "StatefulSets with PVCs handle persistent workloads (PostgreSQL, Redis, Elasticsearch)."

---

### 2B: Helm Charts

#### What

Templatize Kubernetes manifests using Helm so deployments are parameterized and repeatable across environments.

#### Why Implement

- Writing raw K8s YAML for 21 services is unmaintainable (thousands of lines of duplicated YAML).
- All 21 services share the same structure (Express + Prisma + common middleware) — one generic chart handles all of them.
- Helm values files per environment (`values.dev.yaml`, `values.staging.yaml`, `values.prod.yaml`) enable clean multi-environment promotion.
- It is the standard package manager for Kubernetes.

#### Chart Structure

```
helm/
├── charts/
│   ├── hms-service/              # Generic chart for all Node.js microservices
│   │   ├── Chart.yaml
│   │   ├── values.yaml           # Defaults
│   │   └── templates/
│   │       ├── deployment.yaml
│   │       ├── service.yaml
│   │       ├── hpa.yaml
│   │       ├── configmap.yaml
│   │       ├── secret.yaml
│   │       ├── ingress.yaml
│   │       └── _helpers.tpl
│   ├── postgresql/               # Use Bitnami chart or custom
│   ├── redis/                    # Use Bitnami chart
│   ├── elasticsearch/            # Use Elastic official chart
│   ├── rabbitmq/                 # Use Bitnami chart
│   └── minio/                    # Use MinIO official chart
├── hms-umbrella/                 # Umbrella chart — deploys everything
│   ├── Chart.yaml                # Dependencies on all sub-charts
│   ├── values.yaml
│   ├── values.dev.yaml
│   ├── values.staging.yaml
│   └── values.prod.yaml
```

#### Why One Generic Chart Works

Every HMS service follows the same pattern:

- Node.js container on a specific port
- DATABASE_URL environment variable (16 of 21 services)
- Optional REDIS_URL, RABBITMQ_URL, ELASTICSEARCH_URL
- Same health check endpoint
- Same resource profile (small variations)

The `hms-service` chart is parameterized — each service just provides different values:

```yaml
# values for identity-service
serviceName: identity-service
image: verma2904/hms-identity-service
port: 5001
database:
  name: hms_identity
  enabled: true
redis:
  enabled: true
resources:
  requests:
    memory: 128Mi
    cpu: 100m
```

#### CV Talking Points

- "One generic Helm chart serves all 21 services — parameterized by values files, not duplicated YAML."
- "Umbrella chart deploys the entire HMS stack with `helm install hms ./hms-umbrella`."
- "Environment-specific values files enable clean promotion from dev to staging to production."

---

## Phase 3: CI/CD Pipeline

### 3A: GitHub Actions (Enhanced)

#### What

Expand the existing GitHub Actions pipelines from basic build-and-push to a full production-grade CI/CD pipeline with testing, security scanning, and multi-environment deployment.

#### Why Implement

- The current pipeline only builds Docker images on tags — no testing, no validation, no security scanning.
- A production pipeline needs gates: code must pass lint, type-check, tests, and security scan before it reaches any environment.
- Shows CI/CD maturity — not just "I can build an image" but "I have a quality gate."

#### Pipeline Stages to Add

```
PR Pipeline (runs on every pull request):
  ├── Lint (eslint)
  ├── Type Check (tsc --noEmit)
  ├── Unit Tests (jest/vitest)
  ├── Helm Lint (helm lint + helm template)
  ├── Terraform Plan (show infra changes)
  └── Security Scan (trivy on Dockerfile, npm audit)

Merge Pipeline (runs on merge to main):
  ├── Build Docker Image
  ├── Push to Registry (with commit SHA tag)
  ├── Trivy Scan (on built image)
  ├── Update Helm Values (bump image tag)
  └── ArgoCD picks up the change (GitOps)

Release Pipeline (runs on version tag):
  ├── Build Docker Image
  ├── Push to Registry (with version tag + latest)
  └── Update production Helm values
```

#### What NOT to Do

- Do not add Jenkins. GitHub Actions is modern, widely adopted, and already in place. Running both looks confused, not thorough.
- Do not add GitLab CI, CircleCI, or any other CI tool for the same reason.

#### CV Talking Points

- "Every PR must pass lint, type-check, tests, Helm validation, and security scanning before merge."
- "Images are tagged with commit SHA for traceability — I can tell exactly which commit is running in any environment."
- "Terraform changes show up as a plan comment on the PR before any infrastructure modification."

---

### 3B: ArgoCD (GitOps)

#### What

Deploy ArgoCD in the Kubernetes cluster to handle all deployments via GitOps — the Git repository becomes the single source of truth for what runs in the cluster.

#### Why Implement

- GitOps is the industry standard for Kubernetes deployments. No one should be running `kubectl apply` from their laptop.
- It closes the CI/CD loop: GitHub Actions builds images and updates Helm values → ArgoCD detects the change → syncs to cluster.
- Rollback becomes `git revert` — not a panicked `kubectl rollout undo`.
- ArgoCD dashboard gives a visual overview of all 21 services' health and sync status.

#### What It Demonstrates

| Concept | How It Shows Up |
|---------|----------------|
| Declarative deployments | Git repo IS the desired state |
| Automatic sync | New image tag in values → auto-deploy |
| Manual approval | Production deployments require approval |
| Rollback | Git revert = production rollback |
| Multi-environment | Separate Application CRDs for dev/staging/prod |
| Health monitoring | ArgoCD dashboard shows all 21 services |
| Drift detection | Alerts if cluster state differs from Git |

#### GitOps Flow

```
Developer pushes code
  → GitHub Actions builds image (verma2904/hms-doctor-service:abc123)
  → GitHub Actions updates helm/hms-umbrella/values.staging.yaml (image tag → abc123)
  → ArgoCD detects values change
  → ArgoCD syncs staging environment
  → (Manual approval or automated promotion)
  → Update values.prod.yaml
  → ArgoCD syncs production
```

#### CV Talking Points

- "All deployments go through Git — no manual kubectl commands. ArgoCD watches Helm values and auto-syncs."
- "Production requires manual approval in ArgoCD; staging auto-syncs on merge."
- "Rollback is a git revert — ArgoCD detects the change and rolls back the deployment."

---

## Phase 4: Observability

### 4A: Prometheus + Grafana

#### What

Instrument all 21 services with Prometheus metrics, deploy Prometheus to scrape them, and build Grafana dashboards for infrastructure and application monitoring.

#### Why Implement

- 21 microservices without monitoring is a production horror story. Every DevOps interview asks "how do you know when something is broken?"
- The `@hms/common-observatory` package already exists as a placeholder — building it out shows intentional design.
- Prometheus + Grafana is the de-facto open-source monitoring stack for Kubernetes.
- Custom dashboards specific to HMS (queue wait times, appointment booking rates) show domain understanding, not just tool knowledge.

#### Implementation Plan

**Application Metrics (per service, via `prom-client` npm package):**

- `http_requests_total` — counter, labels: method, path, status_code
- `http_request_duration_seconds` — histogram, labels: method, path
- `http_request_in_flight` — gauge (current active requests)
- Service-specific: `appointments_booked_total`, `queue_tokens_issued_total`, `prescriptions_created_total`

**Infrastructure Metrics (via exporters):**

| Exporter | What It Monitors |
|----------|-----------------|
| postgres-exporter | Connections, queries, replication lag, table sizes |
| redis-exporter | Memory usage, connected clients, keyspace hits/misses |
| elasticsearch-exporter | Cluster health, index sizes, search latency |
| rabbitmq-exporter | Queue depth, message rates, consumer count |
| node-exporter | CPU, memory, disk, network (per K8s node) |
| kube-state-metrics | Pod status, deployment replicas, resource usage |

**Grafana Dashboards:**

| Dashboard | Key Panels |
|-----------|-----------|
| HMS Overview | All 21 services: up/down status, request rate, error rate |
| Service Detail | Per-service: latency percentiles (p50/p95/p99), error breakdown, throughput |
| Infrastructure | PostgreSQL connections, Redis memory, RabbitMQ queue depth, ES cluster health |
| Business Metrics | Appointments/hour, avg queue wait time, consultations/day, prescriptions issued |
| Node Health | CPU, memory, disk, network per K8s node |

**Alerting Rules:**

- Service down for > 30 seconds
- Error rate > 5% for any service
- P99 latency > 2 seconds
- RabbitMQ queue depth > 1000 (consumer falling behind)
- PostgreSQL connections > 80% of max
- Disk usage > 85%
- Pod restart count > 3 in 5 minutes

#### Architecture Decisions

**One single `prometheus.yml` — NOT one per service.**

Prometheus is a centralized pull-based scraper. Each service just exposes `/metrics` on its own port and knows nothing about Prometheus. One config file lists all scrape targets:

```yaml
# infrastructure/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - 'rules/*.yml'

scrape_configs:
  - job_name: 'api-gateway'
    static_configs:
      - targets: ['hms-api-gateway:4000']

  - job_name: 'identity-service'
    static_configs:
      - targets: ['hms-identity-service:5001']

  - job_name: 'doctor-service'
    static_configs:
      - targets: ['hms-doctor-service:5002']

  - job_name: 'hospital-service'
    static_configs:
      - targets: ['hms-hospital-service:5003']

  - job_name: 'search-service'
    static_configs:
      - targets: ['hms-search-service:5004']

  - job_name: 'appointment-service'
    static_configs:
      - targets: ['hms-appointment-service:5005']

  - job_name: 'queue-service'
    static_configs:
      - targets: ['hms-queue-service:5006']

  - job_name: 'patient-records-service'
    static_configs:
      - targets: ['hms-patient-records-service:5007']

  - job_name: 'consultation-service'
    static_configs:
      - targets: ['hms-consultation-service:5008']

  - job_name: 'prescription-service'
    static_configs:
      - targets: ['hms-prescription-service:5009']

  - job_name: 'lab-test-service'
    static_configs:
      - targets: ['hms-lab-test-service:5010']

  - job_name: 'lab-result-service'
    static_configs:
      - targets: ['hms-lab-result-service:5011']

  - job_name: 'pharmacy-service'
    static_configs:
      - targets: ['hms-pharmacy-service:5012']

  - job_name: 'inventory-service'
    static_configs:
      - targets: ['hms-inventory-service:5013']

  - job_name: 'billing-service'
    static_configs:
      - targets: ['hms-billing-service:5014']

  - job_name: 'notification-service'
    static_configs:
      - targets: ['hms-notification-service:5015']

  - job_name: 'patient-sheet-service'
    static_configs:
      - targets: ['hms-patient-sheet-service:5016']

  - job_name: 'realtime-service'
    static_configs:
      - targets: ['hms-realtime-service:5017']

  - job_name: 'analytics-service'
    static_configs:
      - targets: ['hms-analytics-service:5018']

  - job_name: 'calling-service'
    static_configs:
      - targets: ['hms-calling-service:5019']

  - job_name: 'whatsapp-service'
    static_configs:
      - targets: ['hms-whatsapp-service:5020']

  # Infrastructure exporters
  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']
```

> In K8s, this gets replaced by `ServiceMonitor` CRDs (Prometheus Operator) which auto-discover services via labels — no manual target list needed. The static config above is for Docker Compose / local dev.

**Dashboard strategy: one shared template + per-service only when needed.**

All 21 services expose the same standard metrics (`{prefix}_http_requests_total`, `{prefix}_http_request_duration_seconds`) — they only differ by metric prefix. So:

1. **One "Service Overview" template dashboard** — uses a Grafana `$service` variable dropdown. Select any service and see its request rate, latency percentiles, error rate. This single dashboard covers 90% of monitoring for all 21 services. No duplicated dashboards.

2. **Per-service dashboards only for custom business metrics** — e.g., identity-service has `identity_login_attempts_total` (success/failed/locked) and `identity_registrations_total` (by role) which no other service has. Those get a dedicated "Identity Service" dashboard. Most services won't need one initially.

```
grafana/
  provisioning/
    datasources/
      prometheus.yml              # Points Grafana to Prometheus
    dashboards/
      dashboard.yml               # Auto-load config
  dashboards/
    service-overview.json         # Shared template — covers all 21 services
    infrastructure.json           # PostgreSQL, Redis, RabbitMQ, ES
    node-health.json              # K8s node CPU/memory/disk
    identity-service.json         # Login attempts, registrations (custom metrics)
    appointment-service.json      # Booking rates, slot utilization (custom metrics)
    queue-service.json            # Token issuance, avg wait time (custom metrics)
```

**Metric naming convention across all services:**

Each service uses its own prefix to avoid collisions in the shared Prometheus instance:

| Service | Metric Prefix |
|---------|---------------|
| identity-service | `identity_` |
| doctor-service | `doctor_` |
| appointment-service | `appointment_` |
| queue-service | `queue_` |
| billing-service | `billing_` |
| ... | `{service-name}_` |

Standard metrics every service must expose:
- `{prefix}_http_requests_total` (counter) — labels: method, route, status_code
- `{prefix}_http_request_duration_seconds` (histogram) — labels: method, route, status_code
- Process metrics via `collectDefaultMetrics({ prefix: '{prefix}_' })`

This convention is what makes the shared template dashboard work — Grafana queries use the `$service` variable to swap the prefix.

#### CV Talking Points

- "Every service exposes a `/metrics` endpoint via `prom-client`. Prometheus scrapes all 21 services + infrastructure exporters from a single config."
- "One templated Grafana dashboard covers all services via a dropdown variable — per-service dashboards only exist for custom business metrics."
- "Grafana dashboards cover the RED method (Rate, Error, Duration) per service, plus domain-specific business metrics."
- "Alerting rules catch service degradation before users notice — error rate spikes, latency increases, queue buildup."

---

### 4B: Centralized Logging (EFK Stack) — Optional

#### What

Add Fluentd (or Filebeat) + Kibana to aggregate logs from all 21 services into Elasticsearch (which already exists in the stack).

#### Why Implement

- Currently, each service writes logs to its own `./logs` directory via Winston. Debugging a cross-service issue (e.g., booking → queue → notification) requires SSH-ing into multiple containers.
- Centralized logging lets you trace a single request ID across all 21 services.
- Elasticsearch already exists in the stack — adding Fluentd + Kibana leverages existing infrastructure.

#### Why It's Optional

- Prometheus + Grafana covers most observability needs.
- If time is limited, skip this — but mention it in interviews as "what I'd add next."

---

## DO NOT Implement

| Tool | Why Skip |
|------|----------|
| **Jenkins** | Redundant with GitHub Actions. Using both looks confused, not thorough. GitHub Actions is more modern and widely preferred for cloud-native projects. |
| **Ansible / Chef / Puppet** | Configuration management tools for VMs and bare-metal servers. This project is fully containerized — Kubernetes IS the configuration management layer. Adding Ansible to a K8s project signals a misunderstanding of the architecture. |
| **Vagrant** | VM provisioning tool. Docker + Kubernetes already handles all environments. Vagrant adds no value to a containerized project. |
| **Docker Swarm** | Competing container orchestrator to Kubernetes. Pick one. Kubernetes has won the industry. Adding Swarm alongside K8s looks like resume padding. |
| **Istio / Service Mesh** | Overkill for a CV project at this scale. Adds significant operational complexity (sidecar proxies, control plane) without clear benefit for 21 services that communicate through an API gateway and message queue. In an interview, say: "I'd add a service mesh when we need mTLS between services or advanced traffic shaping like canary deployments at the network level — but at current scale, the API gateway and RabbitMQ handle routing and decoupling." That answer demonstrates more maturity than blindly implementing it. |
| **HashiCorp Vault** | Enterprise-grade secrets management. Kubernetes Secrets + Sealed Secrets (or SOPS) is sufficient for this scale. Mention Vault as "what I'd add in an enterprise setting with compliance requirements" — that is a better interview answer than actually implementing it. |

---

## Implementation Order Summary

```
Phase 1: Terraform ............. Foundation — provision cloud infra + K8s cluster
   │
Phase 2: Kubernetes + Helm ..... Orchestration — migrate from Docker Compose to K8s
   │
Phase 3: GitHub Actions + ArgoCD  CI/CD — full pipeline with GitOps deployment
   │
Phase 4: Prometheus + Grafana .. Observability — metrics, dashboards, alerting
   │
(Optional) EFK Stack .......... Centralized logging
```

Each phase builds on the previous one. At any phase, you have a working and demonstrable system.

---

## Directory Structure After Full Implementation

```
backend/
├── .github/
│   └── workflows/
│       ├── pr-checks.yml              # Lint, test, scan on PR
│       ├── build-and-push.yml         # Build image on merge
│       ├── release.yml                # Tag-based release
│       └── terraform-plan.yml         # Infra change preview on PR
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── backend.tf                     # Remote state config
│   ├── modules/
│   │   ├── network/                   # VPC, subnets, security groups
│   │   ├── cluster/                   # EKS/GKE cluster + node groups
│   │   ├── database/                  # RDS, ElastiCache (optional)
│   │   └── iam/                       # Roles and policies
│   └── environments/
│       ├── dev.tfvars
│       ├── staging.tfvars
│       └── prod.tfvars
├── helm/
│   ├── charts/
│   │   └── hms-service/              # Generic chart for all 21 services
│   └── hms-umbrella/                 # Umbrella chart
│       ├── Chart.yaml
│       ├── values.yaml
│       ├── values.dev.yaml
│       ├── values.staging.yaml
│       └── values.prod.yaml
├── argocd/
│   ├── applications/                  # ArgoCD Application CRDs
│   │   ├── hms-dev.yaml
│   │   ├── hms-staging.yaml
│   │   └── hms-prod.yaml
│   └── projects/
│       └── hms.yaml                   # ArgoCD AppProject
├── monitoring/
│   ├── prometheus/
│   │   ├── prometheus.yaml            # Prometheus config
│   │   └── rules/                     # Alerting rules
│   └── grafana/
│       └── dashboards/                # Dashboard JSON exports
├── packages/                          # (existing application code)
├── docker-compose.db.yml             # (existing — still useful for local dev)
├── docker-compose.local.yml          # (existing — still useful for local dev)
└── docs/
    └── devops-roadmap.md             # This file
```
