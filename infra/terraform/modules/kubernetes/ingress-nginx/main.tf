# =============================================================================
#  ingress-nginx. Installed on EVERY profile, AWS included.
#
#  The AWS Load Balancer Controller would give us ALB integration and a pile of
#  alb.ingress.kubernetes.io/* annotations baked into the Helm chart. We run
#  ingress-nginx behind a plain NLB instead. One ingress path to test, one set
#  of manifests, and the chart a hospital applies is the chart we run.
#
#  The service_annotations variable is the ONE seam where a cloud can influence
#  this module, and the aws environment passes NLB hints through it. Nothing
#  cloud-specific is hardcoded below.
# =============================================================================

resource "helm_release" "ingress_nginx" {
  name       = "ingress-nginx"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  version    = var.chart_version # pinned. Unpinned charts break silently
  namespace  = var.namespace

  create_namespace = var.create_namespace
  atomic           = true
  wait             = true
  timeout          = 600

  values = [yamlencode({
    controller = {
      replicaCount = var.replica_count

      service = {
        type        = var.service_type
        annotations = var.service_annotations
        # Preserve the client IP. Without this every rate limit in gateway
        # sees the node IP and one busy hospital throttles everyone.
        externalTrafficPolicy = var.service_type == "LoadBalancer" ? "Local" : "Cluster"
      }

      config = {
        use-proxy-protocol       = var.use_proxy_protocol
        use-forwarded-headers    = "true"
        compute-full-forwarded-for = "true"
        proxy-body-size          = "12m"
        # The live queue is a WebSocket. A 60 second default read timeout
        # means every patient screen reconnects every minute.
        proxy-read-timeout       = "3600"
        proxy-send-timeout       = "3600"
        ssl-protocols            = "TLSv1.2 TLSv1.3"
        enable-ocsp              = "true"
        hsts                     = "true"
        hsts-max-age             = "31536000"
        server-tokens            = "false"
        log-format-escape-json   = "true"
        # JSON access logs, so Loki parses them without a regex that breaks
        # on the first URL containing a quote.
        log-format-upstream = "{\"time\":\"$time_iso8601\",\"remote_addr\":\"$remote_addr\",\"method\":\"$request_method\",\"path\":\"$uri\",\"status\":$status,\"bytes\":$body_bytes_sent,\"duration\":$request_time,\"upstream_duration\":\"$upstream_response_time\",\"request_id\":\"$req_id\"}"
      }

      metrics = {
        enabled = var.metrics_enabled
        serviceMonitor = {
          enabled = var.service_monitor_enabled
        }
      }

      resources = {
        requests = { cpu = "100m", memory = "256Mi" }
        limits   = { memory = "512Mi" }
      }

      topologySpreadConstraints = var.replica_count > 1 ? [{
        maxSkew           = 1
        topologyKey       = "topology.kubernetes.io/zone"
        whenUnsatisfiable = "ScheduleAnyway"
        labelSelector = {
          matchLabels = {
            "app.kubernetes.io/name"      = "ingress-nginx"
            "app.kubernetes.io/component" = "controller"
          }
        }
      }] : []

      admissionWebhooks = {
        enabled = true
      }

      # kind exposes 80 and 443 through extraPortMappings on a labelled node.
      nodeSelector = var.node_selector
      tolerations  = var.tolerations
      hostPort = {
        enabled = var.host_port_enabled
      }
    }

    defaultBackend = {
      enabled = false
    }
  })]
}
