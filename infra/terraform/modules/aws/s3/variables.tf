variable "prefix" {
  type    = string
  default = "hms"
}

variable "environment" {
  type = string
}

variable "kms_key_arn" {
  type = string
}

variable "object_lock_enabled" {
  description = <<-EOT
    Governance-mode object lock on prescriptions, lab reports and clinical
    documents. A signed prescription can never be edited: a correction is a new
    prescription that supersedes it. Object lock makes that structural rather
    than a rule the application promises to follow.
  EOT
  type        = bool
  default     = true
}

variable "cors_buckets" {
  type    = list(string)
  default = ["documents", "lab"]
}

variable "cors_origins" {
  type    = list(string)
  default = ["https://app.atelier.health"]
}

variable "tags" {
  type    = map(string)
  default = {}
}
