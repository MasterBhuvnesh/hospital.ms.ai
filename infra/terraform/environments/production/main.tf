# =============================================================================
#  production. AWS substrate plus the same provider-agnostic Kubernetes layer
#  that a customer runs on their own cluster.
#
#  The composition is the whole argument:
#
#    modules/aws         provisions the substrate: VPC, EKS, RDS, ElastiCache,
#                        S3, ECR, IRSA, Secrets Manager, DNS, CDN, KMS.
#
#    modules/kubernetes  installs what runs INSIDE it, minus what AWS supplies.
#                        No CloudNativePG (RDS), no in-cluster Redis
#                        (ElastiCache), no MinIO (S3).
#
#                        BUT rabbitmq and observability ARE installed here, on
#                        AWS, exactly as they are on a hospital's k3s box.
#                        Amazon MQ cannot run the delayed-message plugin and
#                        CloudWatch is unavailable to a self-hosting customer.
#
#  Nothing in the Helm chart changes between this environment and
#  portable-example. Only values do.
# =============================================================================

locals {
  name      = "hms-production"
  namespace = "hms-production"
}

# ---------------------------------------------------------------------------
# Substrate
# ---------------------------------------------------------------------------
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

  # Never a single NAT in production. One NAT makes one AZ's failure
  # everyone's problem.
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

  endpoint_public_access = true
  public_access_cidrs    = var.operator_cidrs

  secrets_kms_key_arn = module.kms.key_arns["secrets"]
  logs_kms_key_arn    = module.kms.key_arns["logs"]
  storage_kms_key_arn = module.kms.key_arns["storage"]

  access_entries = var.access_entries
}

module "rds" {
  source = "../../modules/aws/rds"

  name            = local.name
  vpc_id          = module.vpc.vpc_id
  data_subnet_ids = module.vpc.data_subnet_ids
  # A security group reference, not a CIDR. The rule stays correct when the
  # subnet is reused.
  allowed_security_group_id = module.eks.cluster_security_group_id

  instance_class        = var.rds_instance_class
  allocated_storage     = 200
  max_allocated_storage = 1000
  multi_az              = true
  deletion_protection   = true
  kms_key_arn           = module.kms.key_arns["database"]

  backup_retention_period    = 35
  cross_region_backup_region = var.dr_region
}

module "elasticache" {
  source = "../../modules/aws/elasticache"

  name                      = local.name
  vpc_id                    = module.vpc.vpc_id
  data_subnet_ids           = module.vpc.data_subnet_ids
  allowed_security_group_id = module.eks.cluster_security_group_id

  node_type          = var.cache_node_type
  num_cache_clusters = 2
  kms_key_arn        = module.kms.key_arns["cache"]
}

module "s3" {
  source = "../../modules/aws/s3"

  prefix              = "hms"
  environment         = "prod"
  kms_key_arn         = module.kms.key_arns["storage"]
  object_lock_enabled = true
  cors_origins        = ["https://app.atelier.health"]
}

module "ecr" {
  source = "../../modules/aws/ecr"

  kms_key_arn         = module.kms.key_arns["storage"]
  pull_principal_arns = [module.eks.node_role_arn]
  push_principal_arns = var.ci_role_arns
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
  backup_bucket_arn = module.s3.bucket_arns["backups"]
  loki_bucket_arn   = module.s3.bucket_arns["loki"]
  tempo_bucket_arn  = module.s3.bucket_arns["tempo"]

  storage_kms_key_arn = module.kms.key_arns["storage"]
  secrets_kms_key_arn = module.kms.key_arns["secrets"]
  secret_prefix       = "hms/production"
  hosted_zone_id      = var.hosted_zone_id
}

module "secrets_manager" {
  source = "../../modules/aws/secrets-manager"

  prefix      = "hms/production"
  kms_key_arn = module.kms.key_arns["secrets"]

  # Written once, because Terraform generated them. Everything else, including
  # every provider token and the JWT signing key, is created as an empty
  # container and populated out of band.
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

# ---------------------------------------------------------------------------
# DNS and the update feed
# ---------------------------------------------------------------------------
module "route53" {
  source = "../../modules/aws/route53"

  domain      = var.domain
  environment = "production"
  zone_id     = var.hosted_zone_id

  api_hostname     = "api.${var.domain}"
  updates_hostname = "updates.${var.domain}"

  # The NLB is created by the ingress-nginx Service, so these are read back
  # rather than provisioned. Terraform creating a load balancer that Kubernetes
  # also manages is two controllers fighting over one resource.
  load_balancer_hostname = var.ingress_lb_hostname
  load_balancer_zone_id  = var.ingress_lb_zone_id
  cloudfront_domain      = module.cloudfront.domain_name
}

module "acm_cloudfront" {
  source = "../../modules/aws/acm"
  providers = {
    aws = aws.us_east_1
  }

  domain_name = "updates.${var.domain}"
  zone_id     = var.hosted_zone_id
}

module "cloudfront" {
  source = "../../modules/aws/cloudfront"

  name                        = local.name
  bucket_id                   = module.s3.bucket_names["documents"]
  bucket_arn                  = module.s3.bucket_arns["documents"]
  bucket_regional_domain_name = "${module.s3.bucket_names["documents"]}.s3.${var.region}.amazonaws.com"
  certificate_arn             = module.acm_cloudfront.certificate_arn
  aliases                     = ["updates.${var.domain}"]
}

# ---------------------------------------------------------------------------
# Inside the cluster. The SAME modules a customer applies against their own
# kubeconfig, minus what AWS supplies above.
# ---------------------------------------------------------------------------
module "namespaces" {
  source     = "../../modules/kubernetes/namespaces"
  depends_on = [module.eks]

  environments          = ["production"]
  pod_security_standard = "restricted"

  resource_quotas = {
    "hms-production" = {
      "requests.cpu"    = "24"
      "requests.memory" = "48Gi"
      "limits.memory"   = "96Gi"
      "pods"            = "120"
    }
  }
}

module "ingress_nginx" {
  source     = "../../modules/kubernetes/ingress-nginx"
  depends_on = [module.namespaces]

  replica_count = 3
  service_type  = "LoadBalancer"

  # An NLB, not an ALB. No AWS Load Balancer Controller, so ingress-nginx is
  # the single ingress implementation on every profile and there is one path
  # to test rather than two.
  service_annotations = {
    "service.beta.kubernetes.io/aws-load-balancer-type"                              = "external"
    "service.beta.kubernetes.io/aws-load-balancer-nlb-target-type"                   = "ip"
    "service.beta.kubernetes.io/aws-load-balancer-scheme"                            = "internet-facing"
    "service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled" = "true"
    "service.beta.kubernetes.io/aws-load-balancer-proxy-protocol"                    = "*"
  }

  use_proxy_protocol      = "true"
  service_monitor_enabled = true
}

module "cert_manager" {
  source     = "../../modules/kubernetes/cert-manager"
  depends_on = [module.namespaces]

  acme_email    = var.acme_email
  dns01_enabled = true

  dns01_region         = var.region
  dns01_hosted_zone_id = var.hosted_zone_id
  # An opaque string as far as that module is concerned. It has no aws provider.
  solver_role_arn             = module.iam_irsa.role_arns["cert_manager"]
  service_account_annotations = module.iam_irsa.service_account_annotations["cert_manager"]
  service_monitor_enabled     = true
}

module "external_secrets" {
  source     = "../../modules/kubernetes/external-secrets"
  depends_on = [module.namespaces]

  backend    = "aws"
  aws_region = var.region
  store_name = "hms-aws-store"
  # Permits GetSecretValue on hms/production/* and nothing else.
  service_account_annotations = module.iam_irsa.service_account_annotations["external_secrets"]
  service_monitor_enabled     = true
}

module "keda" {
  source     = "../../modules/kubernetes/keda"
  depends_on = [module.namespaces]

  replica_count = 2
}

# THE broker, in-cluster on AWS. See the module header for why Amazon MQ is
# not an option.
module "rabbitmq" {
  source     = "../../modules/kubernetes/rabbitmq"
  depends_on = [module.namespaces]

  namespace     = local.namespace
  replica_count = 3
  storage_class = "gp3"
  storage_size  = "50Gi"

  cpu_request    = "500m"
  memory_request = "2Gi"
  memory_limit   = "4Gi"
}

# Self-hosted observability on AWS. CloudWatch would be cheaper here and
# unavailable everywhere else, and split observability is worse than uniform
# observability that costs slightly more to run.
module "observability" {
  source     = "../../modules/kubernetes/observability"
  depends_on = [module.namespaces]

  storage_class = "gp3"

  object_storage_endpoint      = "https://s3.${var.region}.amazonaws.com"
  object_storage_endpoint_host = "s3.${var.region}.amazonaws.com"
  object_storage_region        = var.region
  object_storage_path_style    = false
  object_storage_insecure      = false

  loki_bucket  = module.s3.bucket_names["loki"]
  tempo_bucket = module.s3.bucket_names["tempo"]

  # IRSA, so no access key exists in the cluster for these two either.
  service_account_annotations = module.iam_irsa.service_account_annotations["loki"]

  metrics_retention = "90d"
  logs_retention    = "2160h"
  timezone          = "Asia/Kolkata"
}

# NOT INSTALLED HERE, and the absences are the point:
#   postgres-cnpg   RDS Multi-AZ takes its place
#   redis           ElastiCache takes its place
#   minio           S3 takes its place
#   sealed-secrets  External Secrets against Secrets Manager takes its place
