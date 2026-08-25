# =============================================================================
#  MinIO. Object storage for every profile without S3.
#
#  The application talks to the S3 HTTP API through StorageProvider, so these
#  four keys address MinIO here, Amazon S3 on the aws profile, and Cloudflare
#  R2 or Ceph RGW at a customer who prefers either. No AWS SDK is loaded on any
#  of those paths: packages/platform-generic uses the S3-compatible client.
#
#  Buckets are created here rather than by the application at boot. A service
#  that creates its own bucket needs bucket-creation rights in production, and
#  that is a permission nobody should hold at runtime.
# =============================================================================

resource "random_password" "root" {
  length  = 40
  special = false
}

resource "helm_release" "minio" {
  name       = var.release_name
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "minio"
  version    = var.chart_version
  namespace  = var.namespace

  atomic  = true
  wait    = true
  timeout = 900

  values = [yamlencode({
    mode = var.mode

    auth = {
      rootUser     = var.root_user
      rootPassword = random_password.root.result
    }

    statefulset = var.mode == "distributed" ? {
      replicaCount = var.replica_count
      drivesPerNode = var.drives_per_node
    } : {}

    # Versioning is on for every bucket. It is half of the object-storage
    # recovery story in docs/developer.md section 10; scheduled replication to
    # a second bucket is the other half.
    defaultBuckets = join(",", [for b in var.buckets : "${b}:versioned"])

    persistence = {
      enabled      = true
      size         = var.storage_size
      storageClass = var.storage_class
    }

    resources = {
      requests = { cpu = "200m", memory = var.memory_request }
      limits   = { memory = var.memory_limit }
    }

    metrics = {
      serviceMonitor = {
        enabled = var.service_monitor_enabled
      }
      prometheusAuthType = "public"
    }

    networkPolicy = {
      enabled = false
    }
  })]
}

# Credentials for the backup target, consumed by postgres-cnpg. Written here
# because this module is the one that knows the root credential exists.
resource "kubernetes_secret" "backup_credentials" {
  count = var.create_backup_credentials ? 1 : 0

  metadata {
    name      = var.backup_secret_name
    namespace = var.namespace
  }

  type = "Opaque"

  data = {
    ACCESS_KEY_ID     = var.root_user
    SECRET_ACCESS_KEY = random_password.root.result
  }
}
