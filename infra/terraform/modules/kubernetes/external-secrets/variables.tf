variable "chart_version" {
  type    = string
  default = "0.10.5"
}

variable "namespace" {
  type    = string
  default = "external-secrets"
}

variable "create_namespace" {
  type    = bool
  default = false
}

variable "replica_count" {
  type    = number
  default = 1
}

variable "service_account_name" {
  type    = string
  default = "external-secrets"
}

variable "service_account_annotations" {
  description = "IRSA role on AWS. Empty on every other profile."
  type        = map(string)
  default     = {}
}

variable "create_store" {
  type    = bool
  default = true
}

variable "store_name" {
  description = "Referenced by name from the Helm chart's ExternalSecret."
  type        = string
  default     = "hms-store"
}

variable "backend" {
  description = "Which store backs the secrets. The application never learns which one it got."
  type        = string
  default     = "kubernetes"

  validation {
    condition     = contains(["aws", "vault", "kubernetes"], var.backend)
    error_message = "backend must be one of: aws, vault, kubernetes."
  }
}

variable "aws_region" {
  description = "Used only when backend is aws. A plain string; this module has no aws provider."
  type        = string
  default     = ""
}

variable "vault_address" {
  type    = string
  default = ""
}

variable "vault_mount" {
  type    = string
  default = "kv"
}

variable "vault_role" {
  type    = string
  default = "hms"
}

variable "kubernetes_remote_namespace" {
  type    = string
  default = "hms-secrets"
}

variable "service_monitor_enabled" {
  type    = bool
  default = false
}
