# =============================================================================
#  portable-example. THE REFERENCE FOR CUSTOMER-HOSTED DEPLOYMENTS.
#
#  This is a real, working configuration, not a sample. It is what a hospital
#  copies, and it is what proves the portable claim is a property rather than a
#  press release.
#
#  It runs against ANY conformant Kubernetes: k3s, RKE2, GKE, DigitalOcean,
#  Hetzner, OpenShift, or a cluster in a hospital basement. The only input that
#  matters is a kubeconfig.
#
#  Everything the platform needs is here and in-cluster:
#    Postgres (CloudNativePG), Redis, RabbitMQ with the delayed plugin, MinIO,
#    ingress-nginx, cert-manager, KEDA, Prometheus, Grafana, Loki, Tempo.
#
#  There is no AWS module in this file, no ARN, no cloud storage class, and no
#  provider block a customer without a cloud account could not satisfy.
# =============================================================================

locals {
  namespace = "hms-${var.environment}"

  common_storage_class = var.storage_class
}

module "namespaces" {
  source = "../../modules/kubernetes/namespaces"

  environments          = [var.environment]
  pod_security_standard = "restricted"

  resource_quotas = {
    (local.namespace) = {
      "requests.cpu"    = "16"
      "requests.memory" = "32Gi"
      "limits.memory"   = "64Gi"
      "pods"            = "80"
    }
  }
}

# --- cluster services ------------------------------------------------------
module "ingress_nginx" {
  source     = "../../modules/kubernetes/ingress-nginx"
  depends_on = [module.namespaces]

  replica_count = 2
  service_type  = var.ingress_service_type
  # A customer on a bare-metal cluster with MetalLB passes their pool
  # annotation here. Nothing about this module assumes a cloud load balancer.
  service_annotations     = var.ingress_service_annotations
  service_monitor_enabled = true
}

module "cert_manager" {
  source     = "../../modules/kubernetes/cert-manager"
  depends_on = [module.namespaces]

  # A hospital using an internal CA sets acme_enabled to false and points the
  # Ingress at their own ClusterIssuer instead.
  acme_enabled            = var.acme_enabled
  acme_email              = var.acme_email
  service_monitor_enabled = true
}

module "sealed_secrets" {
  source     = "../../modules/kubernetes/sealed-secrets"
  depends_on = [module.namespaces]
}

module "external_secrets" {
  source     = "../../modules/kubernetes/external-secrets"
  depends_on = [module.namespaces]

  # kubernetes backend by default. A customer with Vault switches one variable
  # and changes nothing else in the platform.
  backend       = var.secrets_backend
  vault_address = var.vault_address
  store_name    = "hms-store"
}

module "keda" {
  source     = "../../modules/kubernetes/keda"
  depends_on = [module.namespaces]
}

# --- data plane ------------------------------------------------------------
module "postgres" {
  source     = "../../modules/kubernetes/postgres-cnpg"
  depends_on = [module.namespaces]

  namespace     = local.namespace
  instances     = var.postgres_instances
  storage_size  = var.postgres_storage_size
  storage_class = local.common_storage_class

  # Backups to MinIO, using exactly the configuration that points at S3 on the
  # aws profile. One bucket name apart.
  backup_enabled     = true
  backup_destination = "s3://hms-backups/postgres"
  backup_endpoint    = module.minio.endpoint
  backup_secret_name = module.minio.backup_secret_name
  backup_retention   = "30d"
}

module "redis" {
  source     = "../../modules/kubernetes/redis"
  depends_on = [module.namespaces]

  namespace     = local.namespace
  architecture  = "replication"
  replica_count = 2
  storage_class = local.common_storage_class
}

module "rabbitmq" {
  source     = "../../modules/kubernetes/rabbitmq"
  depends_on = [module.namespaces]

  namespace     = local.namespace
  replica_count = var.rabbitmq_replicas
  storage_class = local.common_storage_class

  # Our image. A customer pulls it from the public registry, or mirrors it into
  # their own. The delayed-message plugin is why there is no managed
  # alternative on any profile.
  image_repository = var.rabbitmq_image_repository
  image_tag        = var.rabbitmq_image_tag
}

module "minio" {
  source     = "../../modules/kubernetes/minio"
  depends_on = [module.namespaces]

  namespace     = local.namespace
  mode          = var.minio_mode
  replica_count = var.minio_replicas
  storage_size  = var.minio_storage_size
  storage_class = local.common_storage_class
}

# --- observability ---------------------------------------------------------
module "observability" {
  source     = "../../modules/kubernetes/observability"
  depends_on = [module.namespaces, module.minio]

  storage_class = local.common_storage_class

  # Loki and Tempo against MinIO. Identical to the aws environment except for
  # the endpoint, which is the whole argument for not using CloudWatch.
  object_storage_endpoint      = "http://${module.minio.credentials_secret}.${local.namespace}.svc.cluster.local:9000"
  object_storage_endpoint_host = "${module.minio.credentials_secret}.${local.namespace}.svc.cluster.local:9000"
  object_storage_path_style    = true
  object_storage_insecure      = true

  loki_deployment_mode = var.loki_deployment_mode
  timezone             = var.timezone
}
