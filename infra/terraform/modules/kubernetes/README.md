# infra/terraform/modules/kubernetes

**Provider-agnostic.** Uses only the `kubernetes` and `helm` providers, so these modules apply to EKS, GKE, k3s, kind, OpenShift or a cluster in a hospital basement.

| Module | Installs |
|---|---|
| `namespaces/` | `hms-dev`, `hms-staging`, `hms-production` |
| `ingress-nginx/` | Ingress controller, on **every** profile including AWS |
| `cert-manager/` | TLS, Let's Encrypt or a customer certificate |
| `sealed-secrets/` | Secret delivery where External Secrets is not available |
| `postgres-cnpg/` | CloudNativePG cluster, for profiles without a managed database |
| `redis/` | In-cluster Redis |
| `rabbitmq/` | **Every profile.** Our image, with the delayed-message plugin |
| `minio/` | In-cluster object storage |
| `observability/` | Prometheus, Grafana, Loki, Tempo |
| `keda/` | Queue-depth autoscaling for `scheduling` |

## Two of these run on AWS too

`rabbitmq` and `observability` are installed here on **every** profile. Amazon MQ cannot run the delayed-message plugin the platform depends on, and CloudWatch is unavailable to a self-hosting customer. Running one implementation everywhere means one set of failure modes and one runbook.

No module here may reference an ARN, an AWS storage class, or an `alb.ingress` annotation. CI fails the build if one appears.
