# =============================================================================
#  local-kind. A laptop cluster, and what CI brings up on every merge.
#
#  modules/kubernetes ONLY. No AWS account, no credentials, no provider block
#  anyone would have to satisfy. If this environment stops applying cleanly,
#  the portable path has broken, and the whole cloud-independence claim with it.
#
#  Everything here is sized down and single-replica: one Postgres instance, one
#  RabbitMQ node, standalone Redis and MinIO. The topology is what differs from
#  production, never the manifests.
# =============================================================================

locals {
  namespace = "hms-dev"
}

module "namespaces" {
  source = "../../modules/kubernetes/namespaces"

  environments        = ["dev"]
  platform_namespaces = ["ingress-nginx", "observability", "keda", "cnpg-system", "sealed-secrets"]
  # kind's default storage provisioner runs a pod that would fail a restricted
  # policy check. Baseline here, restricted everywhere real.
  pod_security_standard = "baseline"
}

module "ingress_nginx" {
  source     = "../../modules/kubernetes/ingress-nginx"
  depends_on = [module.namespaces]

  replica_count = 1
  # kind maps 80 and 443 from the host onto the node labelled ingress-ready.
  service_type      = "NodePort"
  host_port_enabled = true
  node_selector     = { "ingress-ready" = "true" }
  tolerations = [{
    key      = "node-role.kubernetes.io/control-plane"
    operator = "Equal"
    effect   = "NoSchedule"
  }]
  service_monitor_enabled = false
}

module "postgres" {
  source     = "../../modules/kubernetes/postgres-cnpg"
  depends_on = [module.namespaces]

  namespace    = local.namespace
  instances    = 1
  storage_size = "5Gi"

  cpu_request    = "100m"
  memory_request = "512Mi"
  memory_limit   = "1Gi"

  # No backups on a disposable cluster. The restore path is tested in the
  # quarterly drill, not here.
  backup_enabled          = false
  service_monitor_enabled = false
}

module "redis" {
  source     = "../../modules/kubernetes/redis"
  depends_on = [module.namespaces]

  namespace               = local.namespace
  architecture            = "standalone"
  auth_enabled            = false
  persistence_enabled     = false
  memory_request          = "128Mi"
  memory_limit            = "256Mi"
  max_memory              = "192mb"
  service_monitor_enabled = false
}

module "rabbitmq" {
  source     = "../../modules/kubernetes/rabbitmq"
  depends_on = [module.namespaces]

  namespace     = local.namespace
  replica_count = 1
  storage_size  = "2Gi"

  # Side-loaded with `kind load docker-image`, so it must never be pulled.
  # This is the one place the image tag differs from production, and it is
  # still OUR image with the delayed-message plugin.
  image_registry    = "docker.io"
  image_repository  = "library/hms-rabbitmq"
  image_tag         = "local"
  image_pull_policy = "Never"

  cpu_request             = "100m"
  memory_request          = "512Mi"
  memory_limit            = "1Gi"
  service_monitor_enabled = false
}

module "minio" {
  source     = "../../modules/kubernetes/minio"
  depends_on = [module.namespaces]

  namespace               = local.namespace
  mode                    = "standalone"
  storage_size            = "5Gi"
  memory_request          = "256Mi"
  memory_limit            = "512Mi"
  service_monitor_enabled = false
}

module "keda" {
  source     = "../../modules/kubernetes/keda"
  depends_on = [module.namespaces]

  replica_count           = 1
  metrics_enabled         = false
  service_monitor_enabled = false
}

# cert-manager and the observability stack are omitted deliberately. There is
# no public DNS to validate against on a laptop, and Prometheus plus Loki plus
# Tempo will not fit alongside the platform in a kind cluster's memory budget.
# Both are exercised in portable-example, which is the environment a customer
# actually copies.
