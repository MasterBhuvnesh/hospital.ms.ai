variable "region" {
  type    = string
  default = "ap-south-1"
}

variable "vpc_cidr" {
  description = "Distinct from production, so the two can be peered if a data-refresh path ever needs it."
  type        = string
  default     = "10.61.0.0/16"
}

variable "kubernetes_version" {
  description = "A new minor lands here before production. That is what staging is for."
  type        = string
  default     = "1.33"
}

variable "operator_cidrs" {
  type    = list(string)
  default = []
}

variable "hosted_zone_id" {
  type    = string
  default = ""
}

variable "acme_email" {
  type    = string
  default = "ops@atelier.health"
}
