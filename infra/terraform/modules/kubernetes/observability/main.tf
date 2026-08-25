# =============================================================================
#  Prometheus, Grafana, Loki, Tempo, Alloy, Blackbox.
#
#  INSTALLED ON EVERY PROFILE, INCLUDING AWS. CloudWatch would be cheaper to
#  set up on AWS and unavailable everywhere else, and a hospital running their
#  own cluster cannot use it at all. Split observability, one stack on AWS and
#  another off it, means two sets of dashboards, two alert definitions, and two
#  runbooks for the same incident. We pay the operational cost of running this
#  ourselves to avoid that.
#
#  Object storage for Loki chunks and Tempo blocks is the S3 API, which is
#  MinIO here and S3 on the aws profile. One configuration, one bucket name
#  apart, exactly like the database backups.
# =============================================================================

resource "random_password" "grafana_admin" {
  length  = 32
  special = false
}

# ---------------------------------------------------------------------------
# Metrics and alerting
# ---------------------------------------------------------------------------
resource "helm_release" "kube_prometheus_stack" {
  name       = "kube-prometheus-stack"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  version    = var.prometheus_chart_version
  namespace  = var.namespace

  create_namespace = var.create_namespace
  atomic           = true
  wait             = true
  timeout          = 1200

  values = [yamlencode({
    prometheus = {
      prometheusSpec = {
        retention     = var.metrics_retention
        retentionSize = var.metrics_retention_size
        # Pick up ServiceMonitors from every namespace, not only this one.
        # Without these four the hms ServiceMonitors are silently ignored and
        # the dashboards are empty for a reason nothing logs.
        serviceMonitorSelectorNilUsesHelmValues = false
        podMonitorSelectorNilUsesHelmValues     = false
        ruleSelectorNilUsesHelmValues           = false
        probeSelectorNilUsesHelmValues          = false
        resources = {
          requests = { cpu = "300m", memory = "2Gi" }
          limits   = { memory = "4Gi" }
        }
        storageSpec = {
          volumeClaimTemplate = {
            spec = {
              accessModes      = ["ReadWriteOnce"]
              storageClassName = var.storage_class == "" ? null : var.storage_class
              resources        = { requests = { storage = var.metrics_storage_size } }
            }
          }
        }
      }
    }

    alertmanager = {
      alertmanagerSpec = {
        resources = {
          requests = { cpu = "50m", memory = "128Mi" }
          limits   = { memory = "256Mi" }
        }
      }
      config = {
        route = {
          group_by        = ["alertname", "namespace", "severity"]
          group_wait      = "30s"
          group_interval  = "5m"
          repeat_interval = "4h"
          receiver        = "default"
          routes = [
            {
              matchers = ["severity = critical"]
              receiver = "critical"
              # A queue that has stalled is not a four-hour problem.
              repeat_interval = "30m"
            },
          ]
        }
        receivers = [
          { name = "default" },
          { name = "critical" },
        ]
      }
    }

    grafana = {
      adminPassword = random_password.grafana_admin.result
      defaultDashboardsTimezone = var.timezone
      resources = {
        requests = { cpu = "100m", memory = "256Mi" }
        limits   = { memory = "512Mi" }
      }
      persistence = {
        enabled          = true
        size             = "10Gi"
        storageClassName = var.storage_class == "" ? null : var.storage_class
      }
      # Loki and Tempo wired in as datasources, so a trace id in a log line is
      # one click from the trace and a slow span is one click from its logs.
      additionalDataSources = [
        {
          name = "Loki"
          type = "loki"
          url  = "http://loki-gateway.${var.namespace}.svc.cluster.local"
          jsonData = {
            derivedFields = [{
              name          = "TraceID"
              matcherRegex  = "\"trace_id\":\"(\\w+)\""
              url           = "$${__value.raw}"
              datasourceUid = "tempo"
            }]
          }
        },
        {
          name = "Tempo"
          uid  = "tempo"
          type = "tempo"
          url  = "http://tempo.${var.namespace}.svc.cluster.local:3100"
          jsonData = {
            tracesToLogsV2 = {
              datasourceUid = "loki"
            }
          }
        },
      ]
      sidecar = {
        dashboards = { enabled = true, searchNamespace = "ALL" }
        datasources = { enabled = true }
      }
    }

    # kube-state-metrics and node-exporter carry the cluster-level signals the
    # capacity dashboard reads.
    kubeStateMetrics = { enabled = true }
    nodeExporter     = { enabled = true }
  })]
}

# ---------------------------------------------------------------------------
# Logs. pino writes JSON to stdout; Alloy ships it; Loki stores it.
# packages/logger applies the redaction paths, so PHI never reaches this stack
# in the first place. That is a code guarantee, not a pipeline filter.
# ---------------------------------------------------------------------------
resource "helm_release" "loki" {
  name       = "loki"
  repository = "https://grafana.github.io/helm-charts"
  chart      = "loki"
  version    = var.loki_chart_version
  namespace  = var.namespace

  atomic  = true
  wait    = true
  timeout = 900

  values = [yamlencode({
    deploymentMode = var.loki_deployment_mode

    loki = {
      auth_enabled = false
      commonConfig = { replication_factor = var.loki_replication_factor }
      schemaConfig = {
        configs = [{
          from         = "2024-04-01"
          store        = "tsdb"
          object_store = "s3"
          schema       = "v13"
          index        = { prefix = "loki_index_", period = "24h" }
        }]
      }
      limits_config = {
        retention_period            = var.logs_retention
        reject_old_samples          = true
        reject_old_samples_max_age  = "168h"
        max_query_series            = 5000
        ingestion_rate_mb           = 16
        ingestion_burst_size_mb     = 32
      }
      storage = {
        type = "s3"
        bucketNames = {
          chunks = var.loki_bucket
          ruler  = var.loki_bucket
        }
        s3 = {
          endpoint         = var.object_storage_endpoint
          region           = var.object_storage_region
          s3ForcePathStyle = var.object_storage_path_style
          insecure         = var.object_storage_insecure
          accessKeyId      = var.object_storage_access_key
          secretAccessKey  = var.object_storage_secret_key
        }
      }
    }

    # On AWS this carries the IRSA role for the chunk bucket instead of keys.
    serviceAccount = {
      annotations = var.service_account_annotations
    }

    gateway = { enabled = true }
    test    = { enabled = false }
    lokiCanary = { enabled = false }
  })]
}

resource "helm_release" "alloy" {
  name       = "alloy"
  repository = "https://grafana.github.io/helm-charts"
  chart      = "alloy"
  version    = var.alloy_chart_version
  namespace  = var.namespace

  atomic  = true
  wait    = true
  timeout = 600

  values = [yamlencode({
    alloy = {
      configMap = {
        content = <<-EOT
          discovery.kubernetes "pods" {
            role = "pod"
          }

          discovery.relabel "pods" {
            targets = discovery.kubernetes.pods.targets

            rule {
              source_labels = ["__meta_kubernetes_namespace"]
              target_label  = "namespace"
            }
            rule {
              source_labels = ["__meta_kubernetes_pod_label_app_kubernetes_io_component"]
              target_label  = "service"
            }
            rule {
              source_labels = ["__meta_kubernetes_pod_name"]
              target_label  = "pod"
            }
          }

          loki.source.kubernetes "pods" {
            targets    = discovery.relabel.pods.output
            forward_to = [loki.process.hms.receiver]
          }

          loki.process "hms" {
            forward_to = [loki.write.default.receiver]

            // Services log JSON. Lift the fields the dashboards query on, and
            // nothing else: a label with high cardinality is a Loki outage
            // waiting for a busy afternoon.
            stage.json {
              expressions = {
                level    = "level",
                trace_id = "trace_id",
                svc      = "service",
              }
            }

            stage.labels {
              values = { level = "", svc = "" }
            }
          }

          loki.write "default" {
            endpoint {
              url = "http://loki-gateway.${var.namespace}.svc.cluster.local/loki/api/v1/push"
            }
          }
        EOT
      }
      resources = {
        requests = { cpu = "100m", memory = "256Mi" }
        limits   = { memory = "512Mi" }
      }
    }
    controller = { type = "daemonset" }
  })]
}

# ---------------------------------------------------------------------------
# Traces. Gateway to service to database, with correlationId propagated in the
# event envelope so a token can be followed across two RabbitMQ hops.
# ---------------------------------------------------------------------------
resource "helm_release" "tempo" {
  name       = "tempo"
  repository = "https://grafana.github.io/helm-charts"
  chart      = "tempo"
  version    = var.tempo_chart_version
  namespace  = var.namespace

  atomic  = true
  wait    = true
  timeout = 600

  values = [yamlencode({
    tempo = {
      retention = var.traces_retention
      storage = {
        trace = {
          backend = "s3"
          s3 = {
            bucket    = var.tempo_bucket
            endpoint  = var.object_storage_endpoint_host
            region    = var.object_storage_region
            insecure  = var.object_storage_insecure
            access_key = var.object_storage_access_key
            secret_key = var.object_storage_secret_key
          }
        }
      }
      receivers = {
        otlp = {
          protocols = {
            grpc = { endpoint = "0.0.0.0:4317" }
            http = { endpoint = "0.0.0.0:4318" }
          }
        }
      }
      # Span metrics turn traces into RED metrics without a second exporter in
      # every service.
      metricsGenerator = {
        enabled = true
        remoteWriteUrl = "http://kube-prometheus-stack-prometheus.${var.namespace}.svc.cluster.local:9090/api/v1/write"
      }
    }
    persistence = {
      enabled          = true
      size             = "20Gi"
      storageClassName = var.storage_class == "" ? null : var.storage_class
    }
    serviceAccount = {
      annotations = var.service_account_annotations
    }
  })]
}

# ---------------------------------------------------------------------------
# Uptime. Probes /health/ready from outside the pod network, which is the only
# check that fails the way a patient experiences a failure.
# ---------------------------------------------------------------------------
resource "helm_release" "blackbox" {
  count = var.blackbox_enabled ? 1 : 0

  name       = "blackbox-exporter"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "prometheus-blackbox-exporter"
  version    = var.blackbox_chart_version
  namespace  = var.namespace

  atomic  = true
  wait    = true
  timeout = 300

  values = [yamlencode({
    resources = {
      requests = { cpu = "20m", memory = "64Mi" }
      limits   = { memory = "128Mi" }
    }
    config = {
      modules = {
        http_2xx = {
          prober  = "http"
          timeout = "5s"
          http = {
            valid_status_codes  = [200]
            method              = "GET"
            preferred_ip_protocol = "ip4"
          }
        }
      }
    }
  })]
}

# ---------------------------------------------------------------------------
# Alert rules. Business signals sit alongside technical ones: a stalled queue
# is an outage to a waiting room even while every pod reports ready.
# ---------------------------------------------------------------------------
resource "kubectl_manifest" "alert_rules" {
  depends_on = [helm_release.kube_prometheus_stack]

  yaml_body = yamlencode({
    apiVersion = "monitoring.coreos.com/v1"
    kind       = "PrometheusRule"
    metadata = {
      name      = "hms-alerts"
      namespace = var.namespace
      labels    = { release = "kube-prometheus-stack" }
    }
    spec = {
      groups = [
        {
          name = "hms.platform"
          rules = [
            {
              alert = "ServiceDown"
              expr  = "up{job=~\"hms-.*\"} == 0"
              for   = "2m"
              labels = { severity = "critical" }
              annotations = {
                summary  = "{{ $labels.job }} is down"
                runbook  = "docs/runbooks/service-down.md"
              }
            },
            {
              alert = "DatabasePoolExhausted"
              expr  = "hms_db_pool_waiting > 0"
              for   = "1m"
              labels = { severity = "critical" }
              annotations = { runbook = "docs/runbooks/db-pool.md" }
            },
            {
              alert = "RabbitBacklog"
              expr  = "rabbitmq_queue_messages_ready > 1000"
              for   = "5m"
              labels = { severity = "critical" }
              annotations = { runbook = "docs/runbooks/broker-backlog.md" }
            },
            {
              alert = "CertificateExpiringSoon"
              expr  = "certmanager_certificate_expiration_timestamp_seconds - time() < 14 * 24 * 3600"
              for   = "1h"
              labels = { severity = "warning" }
              annotations = { runbook = "docs/runbooks/certificates.md" }
            },
          ]
        },
        {
          name = "hms.business"
          rules = [
            {
              alert = "QueueWaitTooLong"
              expr  = "hms_queue_wait_minutes > 30"
              for   = "10m"
              labels = { severity = "warning" }
              annotations = {
                summary = "Queue wait above 30 minutes at {{ $labels.hospital }}"
                runbook = "docs/runbooks/queue-wait.md"
              }
            },
            {
              alert = "NotificationDeliveryDegraded"
              expr  = "rate(hms_notification_failed_total[15m]) / rate(hms_notification_sent_total[15m]) > 0.05"
              for   = "15m"
              labels = { severity = "critical" }
              annotations = { runbook = "docs/runbooks/notifications.md" }
            },
            {
              alert = "VoiceCallFailureRate"
              expr  = "rate(hms_voice_call_failed_total[15m]) / rate(hms_voice_call_total[15m]) > 0.10"
              for   = "15m"
              labels = { severity = "warning" }
              annotations = { runbook = "docs/runbooks/telephony.md" }
            },
            {
              alert = "LabResultPastSLA"
              expr  = "hms_lab_result_overdue_total > 0"
              for   = "5m"
              labels = { severity = "warning" }
              annotations = { runbook = "docs/runbooks/lab-sla.md" }
            },
            {
              alert = "AIRefusalSpike"
              expr  = "rate(hms_ai_refusal_total[30m]) > 3 * avg_over_time(rate(hms_ai_refusal_total[30m])[7d:30m])"
              for   = "30m"
              labels = { severity = "warning" }
              annotations = { runbook = "docs/runbooks/ai-refusals.md" }
            },
          ]
        },
      ]
    }
  })
}
