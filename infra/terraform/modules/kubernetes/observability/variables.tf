variable "namespace" {
  type    = string
  default = "observability"
}

variable "create_namespace" {
  type    = bool
  default = false
}

variable "prometheus_chart_version" {
  type    = string
  default = "65.5.1"
}

variable "loki_chart_version" {
  type    = string
  default = "6.20.0"
}

variable "alloy_chart_version" {
  type    = string
  default = "0.10.1"
}

variable "tempo_chart_version" {
  type    = string
  default = "1.12.0"
}

variable "blackbox_chart_version" {
  type    = string
  default = "9.0.1"
}

variable "blackbox_enabled" {
  type    = bool
  default = true
}

variable "storage_class" {
  type    = string
  default = ""
}

# --- retention -------------------------------------------------------------
# Operational logs 90 days, per the data retention commitment in
# product-scope.md section 4. The audit log is seven years and lives in
# Postgres, not here: a log pipeline is the wrong place for a legal record.
variable "metrics_retention" {
  type    = string
  default = "30d"
}

variable "metrics_retention_size" {
  type    = string
  default = "40GB"
}

variable "metrics_storage_size" {
  type    = string
  default = "50Gi"
}

variable "logs_retention" {
  type    = string
  default = "2160h"
}

variable "traces_retention" {
  type    = string
  default = "168h"
}

# --- object storage --------------------------------------------------------
# MinIO on portable, S3 on aws. One configuration, one bucket name apart.
variable "object_storage_endpoint" {
  description = "Full URL, as Loki expects it."
  type        = string
  default     = "http://hms-minio.hms-production.svc.cluster.local:9000"
}

variable "object_storage_endpoint_host" {
  description = "Host and port only, as Tempo expects it."
  type        = string
  default     = "hms-minio.hms-production.svc.cluster.local:9000"
}

variable "object_storage_region" {
  type    = string
  default = "us-east-1"
}

variable "object_storage_path_style" {
  type    = bool
  default = true
}

variable "object_storage_insecure" {
  type    = bool
  default = true
}

variable "object_storage_access_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "object_storage_secret_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "loki_bucket" {
  type    = string
  default = "hms-loki"
}

variable "tempo_bucket" {
  type    = string
  default = "hms-tempo"
}

variable "loki_deployment_mode" {
  description = "SingleBinary for kind, SimpleScalable for anything real."
  type        = string
  default     = "SimpleScalable"
}

variable "loki_replication_factor" {
  type    = number
  default = 3
}

variable "service_account_annotations" {
  description = "IRSA roles on AWS, so the keys above stay empty there."
  type        = map(string)
  default     = {}
}

variable "timezone" {
  description = "Grafana default. A dashboard in UTC is a dashboard nobody reads during an incident."
  type        = string
  default     = "Asia/Kolkata"
}
