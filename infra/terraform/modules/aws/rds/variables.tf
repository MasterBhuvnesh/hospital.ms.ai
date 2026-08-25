variable "name" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "data_subnet_ids" {
  description = "The private data tier. No route to the internet."
  type        = list(string)
}

variable "allowed_security_group_id" {
  description = "The EKS cluster security group. The only source permitted on 5432."
  type        = string
}

variable "engine_version" {
  type    = string
  default = "16.4"
}

variable "instance_class" {
  type    = string
  default = "db.m7g.large"
}

variable "allocated_storage" {
  type    = number
  default = 100
}

variable "max_allocated_storage" {
  description = "Storage autoscaling ceiling. A full disk is a total outage."
  type        = number
  default     = 500
}

variable "database_name" {
  type    = string
  default = "hms"
}

variable "master_username" {
  type    = string
  default = "hms"
}

variable "multi_az" {
  description = "Always true in production. The 99.5% availability commitment assumes it."
  type        = bool
  default     = true
}

variable "kms_key_arn" {
  type = string
}

variable "backup_retention_period" {
  description = "35 days, the RDS maximum. PITR within this window is what delivers RPO 5 minutes."
  type        = number
  default     = 35
}

variable "backup_window" {
  description = "UTC. 20:30 UTC is 02:00 IST, when no clinic is running."
  type        = string
  default     = "20:30-21:30"
}

variable "maintenance_window" {
  type    = string
  default = "sun:21:45-sun:22:45"
}

variable "deletion_protection" {
  type    = bool
  default = true
}

variable "performance_insights_enabled" {
  type    = bool
  default = true
}

variable "cross_region_backup_region" {
  description = "Empty disables it. Set in production only."
  type        = string
  default     = ""
}

variable "cross_region_kms_key_arn" {
  type    = string
  default = null
}

variable "tags" {
  type    = map(string)
  default = {}
}
