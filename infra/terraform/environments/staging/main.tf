# =============================================================================
#  staging. Production's shape at a smaller size.
#
#  The rule for this environment: SHAPE MATCHES, SIZE DOES NOT. Multi-AZ RDS,
#  three RabbitMQ nodes, the same IRSA roles, the same ingress path, the same
#  secret store. Smaller instances and shorter retention.
#
#  A staging environment that differs in shape validates nothing. If Multi-AZ
#  failover is only ever exercised in production, the first time anyone sees it
#  is during an incident.
#
#  Staging carries production-shaped data. It is not public: the ingress
#  allowlists the VPC range.
# =============================================================================

locals {
  name      = "hms-staging"
  namespace = "hms-staging"
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
  az_count   = 3

  # Three NATs, like production. Testing an AZ failure against a single-NAT
  # topology tests the wrong topology.
  single_nat_gateway = false
  enable_endpoints   = true
  flow_logs_enabled  = true
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

  # Same three groups, fewer of each. A new Kubernetes minor lands here first.
  node_groups = {
    system = {
      instance_types = ["m7i.large"]
      capacity_type  = "ON_DEMAND"
      disk_size      = 50
      desired_size   = 2
      min_size       = 2
      max_size       = 2
      labels         = { "atelier.health/pool" = "system" }
      taints = [{ key = "CriticalAddonsOnly", value = "true", effect = "NO_SCHEDULE" }]
    }
    app = {
      instance_types = ["m7i.large"]
      capacity_type  = "ON_DEMAND"
      disk_size      = 50
      desired_size   = 2
      min_size       = 2
      max_size       = 6
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

  instance_class    = "db.t4g.medium"
  allocated_storage = 50
  # Multi-AZ even here. Failover behaviour is the thing staging exists to
  # rehearse.
  multi_az                = true
  deletion_protection     = true
  kms_key_arn             = module.kms.key_arns["database"]
  backup_retention_period = 7
}

module "elasticache" {
  source = "../../modules/aws/elasticache"

  name                      = local.name
  vpc_id                    = module.vpc.vpc_id
  data_subnet_ids           = module.vpc.data_subnet_ids
  allowed_security_group_id = module.eks.cluster_security_group_id

  node_type          = "cache.t4g.micro"
  num_cache_clusters = 2
  kms_key_arn        = module.kms.key_arns["cache"]
}

module "s3" {
  source = "../../modules/aws/s3"

  prefix      = "hms"
  environment = "staging"
  kms_key_arn = module.kms.key_arns["storage"]
  # No object lock. Staging buckets get wiped and rebuilt, and a locked object
  # cannot be.
  object_lock_enabled = false
  cors_origins        = ["https://staging-app.atelier.health"]
}

module "iam_irsa" {
  source = "../../modules/aws/iam-irsa"

  cluster_name      = module.eks.cluster_name
  region            = var.region
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = module.eks.oidc_provider_url
  app_namespace     = local.namespace

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
  secret_prefix       = "hms/staging"
  hosted_zone_id      = var.hosted_zone_id
}

module "secrets_manager" {
  source = "../../modules/aws/secrets-manager"

  prefix      = "hms/staging"
  kms_key_arn = module.kms.key_arns["secrets"]

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

  environments          = ["staging"]
  pod_security_standard = "restricted"
}

module "ingress_nginx" {
  source     = "../../modules/kubernetes/ingress-nginx"
  depends_on = [module.namespaces]

  replica_count = 2
  service_type  = "LoadBalancer"
  service_annotations = {
    "service.beta.kubernetes.io/aws-load-balancer-type"            = "external"
    "service.beta.kubernetes.io/aws-load-balancer-nlb-target-type" = "ip"
    "service.beta.kubernetes.io/aws-load-balancer-scheme"          = "internet-facing"
    "service.beta.kubernetes.io/aws-load-balancer-proxy-protocol"  = "*"
  }
  use_proxy_protocol      = "true"
  service_monitor_enabled = true
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
}

module "rabbitmq" {
  source     = "../../modules/kubernetes/rabbitmq"
  depends_on = [module.namespaces]

  namespace = local.namespace
  # Three nodes. A clustering bug that only appears above one node is exactly
  # the class of thing staging is for.
  replica_count  = 3
  storage_class  = "gp3"
  storage_size   = "20Gi"
  cpu_request    = "250m"
  memory_request = "1Gi"
  memory_limit   = "2Gi"
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

  metrics_retention    = "15d"
  logs_retention       = "168h"
  traces_retention     = "48h"
  loki_deployment_mode = "SingleBinary"
}
