variable "chart_version" {
  type    = string
  default = "20.1.0"
}

variable "release_name" {
  type    = string
  default = "hms-redis"
}

variable "namespace" {
  type = string
}

variable "architecture" {
  description = "standalone for kind, replication for a real portable deployment."
  type        = string
  default     = "replication"
}

variable "replica_count" {
  type    = number
  default = 2
}

variable "auth_enabled" {
  type    = bool
  default = true
}

variable "persistence_enabled" {
  description = "Off by default. Everything here is rebuildable from Postgres."
  type        = bool
  default     = false
}

variable "storage_size" {
  type    = string
  default = "8Gi"
}

variable "storage_class" {
  type    = string
  default = ""
}

variable "memory_request" {
  type    = string
  default = "256Mi"
}

variable "memory_limit" {
  type    = string
  default = "1Gi"
}

variable "max_memory" {
  description = "Below the container limit, so Redis evicts before the OOM killer acts."
  type        = string
  default     = "768mb"
}

variable "eviction_policy" {
  type    = string
  default = "allkeys-lru"
}

variable "metrics_enabled" {
  type    = bool
  default = true
}

variable "service_monitor_enabled" {
  type    = bool
  default = true
}
