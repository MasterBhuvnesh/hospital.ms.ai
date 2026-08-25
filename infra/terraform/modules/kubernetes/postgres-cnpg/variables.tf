variable "install_operator" {
  description = "Set false when the operator is already present cluster-wide."
  type        = bool
  default     = true
}

variable "operator_chart_version" {
  type    = string
  default = "0.22.1"
}

variable "operator_namespace" {
  type    = string
  default = "cnpg-system"
}

variable "create_namespace" {
  type    = bool
  default = false
}

variable "namespace" {
  description = "Where the Cluster object lives. Same namespace as the services."
  type        = string
}

variable "cluster_name" {
  type    = string
  default = "hms-postgres"
}

variable "postgres_image" {
  description = "Carries pgvector, so the ai schema needs nothing extra to run."
  type        = string
  default     = "ghcr.io/cloudnative-pg/postgresql:16.4"
}

variable "instances" {
  description = "1 for kind, 3 for a real portable deployment."
  type        = number
  default     = 3
}

variable "database_name" {
  type    = string
  default = "hms"
}

variable "database_user" {
  type    = string
  default = "hms"
}

variable "storage_size" {
  type    = string
  default = "50Gi"
}

variable "storage_class" {
  description = "Empty means the cluster default. No cloud storage class is named in this module."
  type        = string
  default     = ""
}

variable "cpu_request" {
  type    = string
  default = "500m"
}

variable "memory_request" {
  type    = string
  default = "2Gi"
}

variable "memory_limit" {
  type    = string
  default = "4Gi"
}

variable "extra_parameters" {
  type    = map(string)
  default = {}
}

variable "backup_enabled" {
  type    = bool
  default = true
}

variable "backup_destination" {
  description = "s3://bucket/path. MinIO on portable, S3 on aws. Identical configuration."
  type        = string
  default     = "s3://hms-backups/postgres"
}

variable "backup_endpoint" {
  description = "MinIO service URL, or empty for Amazon S3."
  type        = string
  default     = "http://hms-minio:9000"
}

variable "backup_secret_name" {
  description = "Secret holding ACCESS_KEY_ID and SECRET_ACCESS_KEY for the backup target."
  type        = string
  default     = "hms-backup-credentials"
}

variable "backup_retention" {
  type    = string
  default = "30d"
}

variable "backup_schedule" {
  description = "Six-field cron. Off-peak: no clinic runs at 02:00."
  type        = string
  default     = "0 0 2 * * *"
}

variable "service_monitor_enabled" {
  type    = bool
  default = true
}
