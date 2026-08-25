# =============================================================================
#  KEDA. Queue-depth autoscaling for scheduling.
#
#  CPU is the wrong signal for a queue consumer. A backlog of 4000 unprocessed
#  queue events sits at low CPU while every patient screen goes stale, and by
#  the time CPU rises the clinic has already noticed.
#
#  KEDA reads RabbitMQ directly, which works on any cluster. A cloud-specific
#  metrics adapter would give us the same behaviour on EKS and nothing at all
#  on a hospital's own cluster, so scheduling would autoscale in one place and
#  not the other. That asymmetry is exactly what the portability rule exists to
#  prevent.
#
#  The ScaledObject itself is rendered by the Helm chart, from the keda block
#  in the service's values entry. This module installs the operator only.
# =============================================================================

resource "helm_release" "keda" {
  name       = "keda"
  repository = "https://kedacore.github.io/charts"
  chart      = "keda"
  version    = var.chart_version
  namespace  = var.namespace

  create_namespace = var.create_namespace
  atomic           = true
  wait             = true
  timeout          = 600

  values = [yamlencode({
    operator = {
      replicaCount = var.replica_count
      resources = {
        requests = { cpu = "100m", memory = "128Mi" }
        limits   = { memory = "512Mi" }
      }
    }

    metricsServer = {
      resources = {
        requests = { cpu = "100m", memory = "128Mi" }
        limits   = { memory = "512Mi" }
      }
    }

    prometheus = {
      metricServer = {
        enabled = var.metrics_enabled
        serviceMonitor = {
          enabled = var.service_monitor_enabled
        }
      }
      operator = {
        enabled = var.metrics_enabled
        serviceMonitor = {
          enabled = var.service_monitor_enabled
        }
      }
    }

    # KEDA watches every namespace by default. Restricting it to the hms
    # namespaces keeps its RBAC narrow and its watch cache small.
    watchNamespace = var.watch_namespace
  })]
}
