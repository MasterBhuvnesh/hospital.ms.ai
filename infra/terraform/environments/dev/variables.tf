variable "region" {
  type    = string
  default = "ap-south-1"
}

variable "vpc_cidr" {
  type    = string
  default = "10.62.0.0/16"
}

variable "kubernetes_version" {
  type    = string
  default = "1.33"
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
