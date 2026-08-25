# =============================================================================
#  Redis. Cache, rate limiting, WebSocket pub/sub fanout, and the refresh-token
#  revocation set.
#
#  Not installed on the aws profile: ElastiCache takes its place, and the
#  application sees REDIS_URL either way.
#
#  Everything in Redis is rebuildable. The revocation set is derived from the
#  refresh-token families in Postgres, which are the authoritative record, so
#  losing this instance costs a cold cache and a slower minute, not a session.
#  That is why persistence is off by default: an AOF fsync on the request path
#  buys nothing when the data is disposable.
# =============================================================================

resource "random_password" "redis" {
  count   = var.auth_enabled ? 1 : 0
  length  = 32
  special = false
}

resource "helm_release" "redis" {
  name       = var.release_name
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "redis"
  version    = var.chart_version # pinned. The Bitnami catalogue changed terms
  namespace  = var.namespace     # during 2025 and unpinned installs can break

  atomic  = true
  wait    = true
  timeout = 600

  values = [yamlencode({
    architecture = var.architecture

    auth = {
      enabled  = var.auth_enabled
      password = var.auth_enabled ? random_password.redis[0].result : ""
    }

    master = {
      persistence = {
        enabled      = var.persistence_enabled
        size         = var.storage_size
        storageClass = var.storage_class
      }
      resources = {
        requests = { cpu = "100m", memory = var.memory_request }
        limits   = { memory = var.memory_limit }
      }
      configuration = <<-EOT
        maxmemory ${var.max_memory}
        maxmemory-policy ${var.eviction_policy}
        # Keyspace notifications drive the queue fanout: a token state change
        # publishes, gateway relays to every watching socket.
        notify-keyspace-events Ex
        tcp-keepalive 60
      EOT
    }

    replica = {
      replicaCount = var.architecture == "replication" ? var.replica_count : 0
      persistence = {
        enabled      = var.persistence_enabled
        size         = var.storage_size
        storageClass = var.storage_class
      }
      resources = {
        requests = { cpu = "100m", memory = var.memory_request }
        limits   = { memory = var.memory_limit }
      }
    }

    metrics = {
      enabled = var.metrics_enabled
      serviceMonitor = {
        enabled = var.service_monitor_enabled
      }
    }

    networkPolicy = {
      enabled = false # the hms chart owns the policy for this namespace
    }
  })]
}
