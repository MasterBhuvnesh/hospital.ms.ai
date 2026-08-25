variable "cluster_name" {
  type = string
}

variable "region" {
  type    = string
  default = "ap-south-1"
}

variable "oidc_provider_arn" {
  type = string
}

variable "oidc_provider_url" {
  description = "Issuer URL without the https:// prefix."
  type        = string
}

variable "app_namespace" {
  type    = string
  default = "hms-production"
}

variable "document_bucket_arns" {
  description = "documents, prescriptions, invoices, lab. Not backups, not the observability buckets."
  type        = list(string)
}

variable "backup_bucket_arn" {
  type = string
}

variable "loki_bucket_arn" {
  type = string
}

variable "tempo_bucket_arn" {
  type = string
}

variable "storage_kms_key_arn" {
  type = string
}

variable "secrets_kms_key_arn" {
  type = string
}

variable "secret_prefix" {
  description = "Secrets Manager path prefix, for example hms/production."
  type        = string
  default     = "hms/production"
}

variable "hosted_zone_id" {
  type    = string
  default = ""
}

variable "tags" {
  type    = map(string)
  default = {}
}
