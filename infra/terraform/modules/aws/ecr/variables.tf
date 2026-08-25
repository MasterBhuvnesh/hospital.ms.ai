variable "services" {
  description = "One repository per service, plus hms-platform for the all-in-one image."
  type        = list(string)
  default = [
    "gateway",
    "identity",
    "directory",
    "scheduling",
    "clinical",
    "commerce",
    "comms",
    "ai",
  ]
}

variable "kms_key_arn" {
  type = string
}

variable "keep_tagged" {
  description = "Enough history to roll back several releases, not enough to pay for a year of them."
  type        = number
  default     = 30
}

variable "untagged_days" {
  type    = number
  default = 7
}

variable "pull_principal_arns" {
  description = "The EKS node role."
  type        = list(string)
  default     = []
}

variable "push_principal_arns" {
  description = "The GitHub Actions OIDC deploy role. Nothing else pushes, ever."
  type        = list(string)
  default     = []
}

variable "tags" {
  type    = map(string)
  default = {}
}
