variable "name" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "data_subnet_ids" {
  type = list(string)
}

variable "allowed_security_group_id" {
  type = string
}

variable "engine_version" {
  type    = string
  default = "7.1"
}

variable "node_type" {
  type    = string
  default = "cache.t4g.medium"
}

variable "num_cache_clusters" {
  description = "2 or more enables automatic failover and Multi-AZ."
  type        = number
  default     = 2
}

variable "kms_key_arn" {
  type = string
}

variable "snapshot_retention_limit" {
  description = "A snapshot of a cache is a snapshot of derived state. One day, for diagnostics only."
  type        = number
  default     = 1
}

variable "maintenance_window" {
  type    = string
  default = "sun:22:00-sun:23:00"
}

variable "log_group_name" {
  type    = string
  default = ""
}

variable "tags" {
  type    = map(string)
  default = {}
}
