variable "prefix" {
  description = "Path prefix, for example hms/production. The IRSA policy is scoped to it."
  type        = string
}

variable "kms_key_arn" {
  type = string
}

variable "recovery_window_in_days" {
  description = "A deleted secret is recoverable for this long. Zero would make a mistaken destroy permanent."
  type        = number
  default     = 30
}

variable "database_secret" {
  description = "Written once, by Terraform, because Terraform generated it."
  type        = map(string)
  default     = null
  sensitive   = true
}

variable "redis_secret" {
  type      = map(string)
  default   = null
  sensitive = true
}

variable "rabbitmq_secret" {
  type      = map(string)
  default   = null
  sensitive = true
}

variable "database_rotation_lambda_arn" {
  type    = string
  default = ""
}

variable "rotation_days" {
  type    = number
  default = 90
}

variable "tags" {
  type    = map(string)
  default = {}
}
