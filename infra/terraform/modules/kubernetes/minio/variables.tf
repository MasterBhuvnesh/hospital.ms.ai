variable "chart_version" {
  type    = string
  default = "14.7.0"
}

variable "release_name" {
  type    = string
  default = "hms-minio"
}

variable "namespace" {
  type = string
}

variable "mode" {
  description = "standalone for kind, distributed for a real portable deployment."
  type        = string
  default     = "distributed"
}

variable "replica_count" {
  type    = number
  default = 4
}

variable "drives_per_node" {
  type    = number
  default = 1
}

variable "root_user" {
  type    = string
  default = "hms"
}

variable "buckets" {
  description = "Created at install with versioning on. Services never create their own."
  type        = list(string)
  default = [
    "hms-documents",
    "hms-prescriptions",
    "hms-invoices",
    "hms-lab",
    "hms-voice",
    "hms-backups",
  ]
}

variable "storage_size" {
  type    = string
  default = "100Gi"
}

variable "storage_class" {
  type    = string
  default = ""
}

variable "memory_request" {
  type    = string
  default = "1Gi"
}

variable "memory_limit" {
  type    = string
  default = "2Gi"
}

variable "create_backup_credentials" {
  description = "Write a Secret that postgres-cnpg uses as its pgBackRest target credential."
  type        = bool
  default     = true
}

variable "backup_secret_name" {
  type    = string
  default = "hms-backup-credentials"
}

variable "service_monitor_enabled" {
  type    = bool
  default = true
}
