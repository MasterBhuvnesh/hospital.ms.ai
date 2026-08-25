# =============================================================================
#  RabbitMQ. INSTALLED ON EVERY PROFILE, INCLUDING AWS.
#
#  This is the one row of the capability matrix where the managed service was
#  rejected on a hard technical constraint rather than a preference.
#
#  Amazon MQ for RabbitMQ runs a managed broker with a fixed plugin set, so
#  rabbitmq_delayed_message_exchange cannot be installed. Every piece of
#  scheduled work in this platform runs through that plugin: the 24-hour and
#  2-hour appointment reminders, the N-away queue push, notification retries,
#  and the voice-call backoff. There is no second job system to fall back on,
#  by design, because a second job system is a second set of failure modes.
#
#  So we run our own image, built from docker/rabbitmq/Dockerfile, with the
#  plugin enabled, and we run it identically on kind, on a hospital's k3s box,
#  and on EKS. One broker, one runbook.
#
#  The cost of that choice is stated plainly in docs/portability.md section 7:
#  we operate upgrades, monitoring, disk pressure and clustering ourselves.
# =============================================================================

resource "random_password" "rabbitmq" {
  length  = 32
  special = false
}

resource "random_password" "erlang_cookie" {
  length  = 32
  special = false
}

resource "helm_release" "rabbitmq" {
  name       = var.release_name
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "rabbitmq"
  version    = var.chart_version
  namespace  = var.namespace

  atomic  = true
  wait    = true
  timeout = 900

  values = [yamlencode({
    # OUR image. The stock chart has no delayed-message plugin, which is the
    # entire reason this module exists rather than a two-line helm_release.
    image = {
      registry   = var.image_registry
      repository = var.image_repository
      tag        = var.image_tag
      pullPolicy = var.image_pull_policy
    }

    auth = {
      username     = var.username
      password     = random_password.rabbitmq.result
      erlangCookie = random_password.erlang_cookie.result
    }

    replicaCount = var.replica_count

    clustering = {
      enabled     = var.replica_count > 1
      rebalance   = true
      forceBoot   = false
    }

    # Enabled explicitly rather than relying on the image's enabled_plugins,
    # so a chart upgrade cannot silently drop the one plugin we cannot lose.
    extraPlugins = "rabbitmq_delayed_message_exchange rabbitmq_prometheus rabbitmq_management"

    persistence = {
      enabled      = true
      size         = var.storage_size
      storageClass = var.storage_class
    }

    resources = {
      requests = { cpu = var.cpu_request, memory = var.memory_request }
      limits   = { memory = var.memory_limit }
    }

    # Disk pressure blocks publishers, and a blocked publisher looks exactly
    # like a hung service from the outside. Alarm early, alert on it.
    extraConfiguration = <<-EOT
      disk_free_limit.absolute = ${var.disk_free_limit}
      vm_memory_high_watermark.relative = 0.7
      # At-least-once delivery, so every consumer is idempotent on messageId.
      # Nothing here compensates for that; it is enforced in the consumers.
      queue_master_locator = min-masters
      log.console.formatter = json
    EOT

    metrics = {
      enabled = var.metrics_enabled
      serviceMonitor = {
        enabled = var.service_monitor_enabled
      }
    }

    podAntiAffinityPreset = "soft"

    topologySpreadConstraints = var.replica_count > 1 ? [{
      maxSkew           = 1
      topologyKey       = "topology.kubernetes.io/zone"
      whenUnsatisfiable = "ScheduleAnyway"
      labelSelector = {
        matchLabels = { "app.kubernetes.io/name" = "rabbitmq" }
      }
    }] : []

    networkPolicy = {
      enabled = false
    }
  })]
}

# The topology the platform expects. Declared here so a fresh cluster is usable
# before the first service starts, rather than depending on whichever consumer
# happens to connect first.
resource "kubernetes_config_map" "definitions" {
  metadata {
    name      = "${var.release_name}-topology"
    namespace = var.namespace
  }

  data = {
    "topology.md" = <<-EOT
      Exchanges
        hms.events    topic, durable    every domain event
        hms.delayed   x-delayed-message, durable, x-delayed-type=topic
                      all scheduled and delayed work
        hms.dlx       topic, durable    dead letters

      Routing keys are <domain>.<entity>.<past-tense-verb>.

      Queues are declared by their consuming service at boot, bound to
      hms.events by the patterns that service subscribes to, with
      x-dead-letter-exchange set to hms.dlx. Declaring them here as well would
      put the same topology in two places and let them drift.
    EOT
  }
}
