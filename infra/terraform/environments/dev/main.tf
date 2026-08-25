# =============================================================================
#  dev. Where main lands after every merge.
#
#  This is the cheapest AWS environment, and the trade-offs it makes are stated
#  rather than discovered:
#
#    single NAT gateway     saves roughly $70/month. One AZ's failure becomes
#                           everyone's problem, which is acceptable here and
#                           never in staging or production
#    single-AZ RDS          failover is rehearsed in staging, not here
#    one RabbitMQ node      clustering behaviour is a staging concern
#    spot burst group       an interrupted dev pod costs nothing
#    short retention        7 days of metrics, 24 hours of logs
#
#  What does NOT change: the ingress path, the IRSA roles, the secret store,
#  the network topology, and the Helm chart. Every one of those is something a
#  cheap environment could plausibly cut and every one of them would then be
#  untested until production.
# =============================================================================

locals {
  name      = "hms-dev"
  namespace = "hms-dev"
}

module "kms" {
  source = "../../modules/aws/kms"
  name   = local.name
}

module "vpc" {
  source = "../../modules/aws/vpc"

  name       = local.name
  region     = var.region
  cidr_block = var.vpc_cidr
  az_count   = 2

  # The one place production's topology is not matched, and the saving is the
  # entire reason.
  single_nat_gateway = true
  enable_endpoints   = true
  flow_logs_enabled  = false
}

module "eks" {
  source = "../../modules/aws/eks"

  name               = local.name
  kubernetes_version = var.kubernetes_version
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids

  public_access_cidrs = var.operator_cidrs
  secrets_kms_key_arn = module.kms.key_arns["secrets"]
  logs_kms_key_arn    = module.kms.key_arns["logs"]
  storage_kms_key_arn = module.kms.key_arns["storage"]

  control_plane_log_retention = 7

  node_groups = {
    system = {
      instance_types = ["t3.medium"]
      capacity_type  = "ON_DEMAND"
      disk_size      = 30
      desired_size   = 1
      min_size       = 1
      max_size       = 2
      labels         = { "atelier.health/pool" = "system" }
      taints         = []
    }
    app = {
      instance_types = ["t3.large", "t3a.large", "m6i.large"]
      capacity_type  = "SPOT"
      disk_size      = 50
      desired_size   = 2
      min_size       = 1
      max_size       = 4
      labels         = { "atelier.health/pool" = "app" }
      taints         = []
    }
  }
}

module "rds" {
  source = "../../modules/aws/rds"

  name                      = local.name
  vpc_id                    = module.vpc.vpc_id
  data_subnet_ids           = module.vpc.data_subnet_ids
  allowed_security_group_id = module.eks.cluster_security_group_id

  instance_class               = "db.t4g.small"
  allocated_storage            = 20
  max_allocated_storage        = 100
  multi_az                     = false
  deletion_protection          = false
  performance_insights_enabled = false
  kms_key_arn                  = module.kms.key_arns["database"]
  backup_retention_period      = 7
}

module "elasticache" {
  source = "../../modules/aws/elasticache"

  name                      = local.name
  vpc_id                    = module.vpc.vpc_id
  data_subnet_ids           = module.vpc.data_subnet_ids
  allowed_security_group_id = module.eks.cluster_security_group_id

  node_type = "cache.t4g.micro"
  # One node, no failover. Everything in the cache is rebuildable.
  num_cache_clusters = 1
  kms_key_arn        = module.kms.key_arns["cache"]
}

module "s3" {
  source = "../../modules/aws/s3"

  prefix              = "hms"
  environment         = "dev"
  kms_key_arn         = module.kms.key_arns["storage"]
  object_lock_enabled = false
  cors_origins        = ["http://localhost:3000", "https://dev-app.atelier.health"]
}

module "iam_irsa" {
  source = "../../modules/aws/iam-irsa"

  cluster_name      = module.eks.cluster_name
  region            = var.region
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = module.eks.oidc_provider_url
  app_namespace     = local.namespace

  # The same roles, scoped the same way. An IRSA policy that is only ever
  # exercised in production is an IRSA policy nobody has tested.
  document_bucket_arns = [
    module.s3.bucket_arns["documents"],
    module.s3.bucket_arns["prescriptions"],
    module.s3.bucket_arns["invoices"],
    module.s3.bucket_arns["lab"],
  ]
  backup_bucket_arn   = module.s3.bucket_arns["backups"]
  loki_bucket_arn     = module.s3.bucket_arns["loki"]
  tempo_bucket_arn    = module.s3.bucket_arns["tempo"]
  storage_kms_key_arn = module.kms.key_arns["storage"]
  secrets_kms_key_arn = module.kms.key_arns["secrets"]
  secret_prefix       = "hms/dev"
  hosted_zone_id      = var.hosted_zone_id
}

module "secrets_manager" {
  source = "../../modules/aws/secrets-manager"

  prefix                  = "hms/dev"
  kms_key_arn             = module.kms.key_arns["secrets"]
  recovery_window_in_days = 30

  database_secret = {
    username = module.rds.username
    host     = module.rds.endpoint
    password = module.rds.password
  }

  redis_secret = {
    host     = module.elasticache.primary_endpoint
    password = module.elasticache.auth_token
  }
}

# --- in-cluster ------------------------------------------------------------
module "namespaces" {
  source     = "../../modules/kubernetes/namespaces"
  depends_on = [module.eks]

  environments          = ["dev"]
  pod_security_standard = "restricted"
}

module "ingress_nginx" {
  source     = "../../modules/kubernetes/ingress-nginx"
  depends_on = [module.namespaces]

  replica_count = 1
  service_type  = "LoadBalancer"
  service_annotations = {
    "service.beta.kubernetes.io/aws-load-balancer-type"            = "external"
    "service.beta.kubernetes.io/aws-load-balancer-nlb-target-type" = "ip"
    "service.beta.kubernetes.io/aws-load-balancer-scheme"          = "internet-facing"
    "service.beta.kubernetes.io/aws-load-balancer-proxy-protocol"  = "*"
  }
  use_proxy_protocol = "true"
}

module "cert_manager" {
  source     = "../../modules/kubernetes/cert-manager"
  depends_on = [module.namespaces]

  acme_email                  = var.acme_email
  dns01_enabled               = true
  dns01_region                = var.region
  dns01_hosted_zone_id        = var.hosted_zone_id
  solver_role_arn             = module.iam_irsa.role_arns["cert_manager"]
  service_account_annotations = module.iam_irsa.service_account_annotations["cert_manager"]
}

module "external_secrets" {
  source     = "../../modules/kubernetes/external-secrets"
  depends_on = [module.namespaces]

  backend                     = "aws"
  aws_region                  = var.region
  store_name                  = "hms-aws-store"
  service_account_annotations = module.iam_irsa.service_account_annotations["external_secrets"]
}

module "keda" {
  source     = "../../modules/kubernetes/keda"
  depends_on = [module.namespaces]

  replica_count = 1
}

module "rabbitmq" {
  source     = "../../modules/kubernetes/rabbitmq"
  depends_on = [module.namespaces]

  namespace      = local.namespace
  replica_count  = 1
  storage_class  = "gp3"
  storage_size   = "8Gi"
  cpu_request    = "100m"
  memory_request = "512Mi"
  memory_limit   = "1Gi"
}

module "observability" {
  source     = "../../modules/kubernetes/observability"
  depends_on = [module.namespaces]

  storage_class                = "gp3"
  object_storage_endpoint      = "https://s3.${var.region}.amazonaws.com"
  object_storage_endpoint_host = "s3.${var.region}.amazonaws.com"
  object_storage_region        = var.region
  object_storage_path_style    = false
  object_storage_insecure      = false
  loki_bucket                  = module.s3.bucket_names["loki"]
  tempo_bucket                 = module.s3.bucket_names["tempo"]
  service_account_annotations  = module.iam_irsa.service_account_annotations["loki"]

  metrics_retention      = "7d"
  metrics_retention_size = "10GB"
  metrics_storage_size   = "20Gi"
  logs_retention         = "24h"
  traces_retention       = "24h"
  loki_deployment_mode   = "SingleBinary"
  loki_replication_factor = 1
  blackbox_enabled       = false
}
