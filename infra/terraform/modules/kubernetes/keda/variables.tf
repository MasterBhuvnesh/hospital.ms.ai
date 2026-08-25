variable "chart_version" {
  type    = string
  default = "2.15.1"
}

variable "namespace" {
  type    = string
  default = "keda"
}

variable "create_namespace" {
  type    = bool
  default = false
}

variable "replica_count" {
  type    = number
  default = 1
}

variable "watch_namespace" {
  description = "Empty watches all namespaces. Narrow it where the cluster is shared."
  type        = string
  default     = ""
}

variable "metrics_enabled" {
  type    = bool
  default = true
}

variable "service_monitor_enabled" {
  type    = bool
  default = true
}
