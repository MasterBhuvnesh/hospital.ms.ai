output "namespace" {
  value = var.namespace
}

output "otlp_endpoint" {
  description = "Set as OTEL_EXPORTER_OTLP_ENDPOINT in the Helm config block."
  value       = "http://tempo.${var.namespace}.svc.cluster.local:4318"
}

output "prometheus_url" {
  value = "http://kube-prometheus-stack-prometheus.${var.namespace}.svc.cluster.local:9090"
}

output "loki_url" {
  value = "http://loki-gateway.${var.namespace}.svc.cluster.local"
}

output "grafana_admin_secret" {
  description = "Read the password from this Secret. It is never an output value."
  value       = "kube-prometheus-stack-grafana"
}
