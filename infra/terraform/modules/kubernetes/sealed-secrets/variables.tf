variable "chart_version" {
  type    = string
  default = "2.16.1"
}

variable "namespace" {
  type    = string
  default = "sealed-secrets"
}

variable "create_namespace" {
  type    = bool
  default = false
}

variable "key_renew_period" {
  description = "Sealing key rotation. Old keys are retained for decryption."
  type        = string
  default     = "720h"
}

variable "service_monitor_enabled" {
  type    = bool
  default = false
}
