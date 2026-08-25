# =============================================================================
#  CloudNativePG. The database for every profile that has no managed one.
#
#  Not installed on the aws profile: RDS Multi-AZ takes its place there. The
#  application cannot tell the difference, because it sees DATABASE_URL and the
#  Postgres wire protocol either way.
#
#  One cluster, one schema per service. Not one database per service: eight
#  Postgres clusters to operate for a system this size is a cost with no
#  matching benefit, and the schema boundary is enforced in code by
#  ScopedRepository rather than by the connection string.
#
#  Backups go to an S3-compatible target, which is MinIO here and S3 on the aws
#  profile. Identical configuration, one bucket name apart.
# =============================================================================

resource "helm_release" "cnpg_operator" {
  count = var.install_operator ? 1 : 0

  name       = "cnpg"
  repository = "https://cloudnative-pg.github.io/charts"
  chart      = "cloudnative-pg"
  version    = var.operator_chart_version
  namespace  = var.operator_namespace

  create_namespace = var.create_namespace
  atomic           = true
  wait             = true
  timeout          = 600

  values = [yamlencode({
    monitoring = {
      podMonitorEnabled = var.service_monitor_enabled
    }
    resources = {
      requests = { cpu = "50m", memory = "128Mi" }
      limits   = { memory = "256Mi" }
    }
  })]
}

resource "random_password" "app" {
  length  = 32
  special = false # some clients still mangle a URL-encoded password
}

resource "kubernetes_secret" "app_credentials" {
  metadata {
    name      = "${var.cluster_name}-app"
    namespace = var.namespace
    labels = {
      "cnpg.io/reload" = "true"
    }
  }

  type = "kubernetes.io/basic-auth"

  data = {
    username = var.database_user
    password = random_password.app.result
  }
}

resource "kubectl_manifest" "cluster" {
  depends_on = [helm_release.cnpg_operator, kubernetes_secret.app_credentials]

  yaml_body = yamlencode({
    apiVersion = "postgresql.cnpg.io/v1"
    kind       = "Cluster"
    metadata = {
      name      = var.cluster_name
      namespace = var.namespace
    }
    spec = {
      instances             = var.instances
      imageName             = var.postgres_image
      primaryUpdateStrategy = "unsupervised"

      # Spread across zones where the cluster has them. On a single-node k3s
      # box this constraint is simply unsatisfiable and CNPG proceeds.
      topologySpreadConstraints = [{
        maxSkew           = 1
        topologyKey       = "topology.kubernetes.io/zone"
        whenUnsatisfiable = "ScheduleAnyway"
        labelSelector = {
          matchLabels = { "cnpg.io/cluster" = var.cluster_name }
        }
      }]

      bootstrap = {
        initdb = {
          database = var.database_name
          owner    = var.database_user
          secret   = { name = kubernetes_secret.app_credentials.metadata[0].name }
          # pgvector for the ai schema, pg_trgm for the search box. Both are
          # Postgres extensions, so neither adds a service to operate.
          postInitSQL = [
            "CREATE EXTENSION IF NOT EXISTS vector",
            "CREATE EXTENSION IF NOT EXISTS pg_trgm",
            "CREATE EXTENSION IF NOT EXISTS pgcrypto",
            "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"",
          ]
        }
      }

      postgresql = {
        parameters = merge({
          max_connections                = "200"
          shared_buffers                 = "512MB"
          effective_cache_size           = "1536MB"
          work_mem                       = "8MB"
          maintenance_work_mem           = "128MB"
          random_page_cost               = "1.1" # SSD, not spinning rust
          # Every query slower than this lands in the log, which is how the
          # slow-query dashboard gets its data.
          log_min_duration_statement     = "500"
          log_checkpoints                = "on"
          log_lock_waits                 = "on"
          shared_preload_libraries       = "pg_stat_statements"
          "pg_stat_statements.max"       = "10000"
          "pg_stat_statements.track"     = "all"
        }, var.extra_parameters)
      }

      storage = merge(
        { size = var.storage_size },
        var.storage_class == "" ? {} : { storageClass = var.storage_class }
      )

      resources = {
        requests = { cpu = var.cpu_request, memory = var.memory_request }
        limits   = { memory = var.memory_limit }
      }

      monitoring = {
        enablePodMonitor = var.service_monitor_enabled
      }

      # Continuous WAL archiving plus PITR. RPO 5 minutes is measured against
      # this, not assumed from it.
      backup = var.backup_enabled ? {
        retentionPolicy = var.backup_retention
        barmanObjectStore = {
          destinationPath = var.backup_destination
          endpointURL     = var.backup_endpoint
          s3Credentials = {
            accessKeyId     = { name = var.backup_secret_name, key = "ACCESS_KEY_ID" }
            secretAccessKey = { name = var.backup_secret_name, key = "SECRET_ACCESS_KEY" }
          }
          wal = {
            compression = "gzip"
            maxParallel = 4
          }
          data = {
            compression = "gzip"
            jobs        = 2
          }
        }
      } : null
    }
  })
}

# A backup nobody has restored is a file, not a recovery plan. This schedule is
# half of that; the quarterly restore drill is the other half.
resource "kubectl_manifest" "scheduled_backup" {
  count      = var.backup_enabled ? 1 : 0
  depends_on = [kubectl_manifest.cluster]

  yaml_body = yamlencode({
    apiVersion = "postgresql.cnpg.io/v1"
    kind       = "ScheduledBackup"
    metadata = {
      name      = "${var.cluster_name}-daily"
      namespace = var.namespace
    }
    spec = {
      schedule             = var.backup_schedule
      backupOwnerReference = "self"
      cluster              = { name = var.cluster_name }
    }
  })
}
