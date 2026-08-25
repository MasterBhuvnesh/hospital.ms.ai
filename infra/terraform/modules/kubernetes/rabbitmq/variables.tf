variable "chart_version" {
  type    = string
  default = "14.6.6"
}

variable "release_name" {
  type    = string
  default = "hms-rabbitmq"
}

variable "namespace" {
  type = string
}

# ---------------------------------------------------------------------------
# Our image, built from docker/rabbitmq/Dockerfile. The stock image has no
# delayed-message plugin, and every scheduled job depends on it.
# ---------------------------------------------------------------------------
variable "image_registry" {
  type    = string
  default = "docker.io"
}

variable "image_repository" {
  type    = string
  default = "atelierhealth/hms-rabbitmq"
}

variable "image_tag" {
  type    = string
  default = "3.13-delayed"
}

variable "image_pull_policy" {
  description = "Never on kind, where the image is side-loaded rather than pulled."
  type        = string
  default     = "IfNotPresent"
}

variable "username" {
  type    = string
  default = "hms"
}

variable "replica_count" {
  description = "1 for kind, 3 for anything real. Quorum needs an odd number."
  type        = number
  default     = 3
}

variable "storage_size" {
  type    = string
  default = "20Gi"
}

variable "storage_class" {
  type    = string
  default = ""
}

variable "cpu_request" {
  type    = string
  default = "250m"
}

variable "memory_request" {
  type    = string
  default = "1Gi"
}

variable "memory_limit" {
  type    = string
  default = "2Gi"
}

variable "disk_free_limit" {
  description = "Below this, RabbitMQ blocks publishers. A blocked publisher looks like a hung service."
  type        = string
  default     = "2GB"
}

variable "metrics_enabled" {
  type    = bool
  default = true
}

variable "service_monitor_enabled" {
  type    = bool
  default = true
}
