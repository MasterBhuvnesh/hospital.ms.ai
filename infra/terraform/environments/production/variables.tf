variable "region" {
  description = "ap-south-1. Data residency under the DPDP Act, enforced by an SCP that denies every other region."
  type        = string
  default     = "ap-south-1"
}

variable "dr_region" {
  description = "Cross-region automated backup copy. The RTO commitment is in-region; this is for the case where the region is the incident."
  type        = string
  default     = "ap-southeast-1"
}

variable "vpc_cidr" {
  type    = string
  default = "10.60.0.0/16"
}

variable "kubernetes_version" {
  type    = string
  default = "1.33"
}

variable "operator_cidrs" {
  description = "Operator bastion and CI runner ranges. NEVER 0.0.0.0/0."
  type        = list(string)
  default     = []

  validation {
    condition     = !contains(var.operator_cidrs, "0.0.0.0/0")
    error_message = "The production API server endpoint must not be open to the internet."
  }
}

variable "rds_instance_class" {
  type    = string
  default = "db.m7g.large"
}

variable "cache_node_type" {
  type    = string
  default = "cache.t4g.medium"
}

variable "domain" {
  type    = string
  default = "atelier.health"
}

variable "hosted_zone_id" {
  description = "The zone lives in the shared account. This environment only adds records."
  type        = string
  default     = ""
}

variable "acme_email" {
  type    = string
  default = "ops@atelier.health"
}

variable "ingress_lb_hostname" {
  description = <<-EOT
    The NLB the ingress-nginx Service created. Read back and passed in rather
    than provisioned: Terraform creating a load balancer that Kubernetes also
    manages is two controllers fighting over one resource.

    First apply leaves this empty and the DNS record is skipped. Fill it in and
    apply again.
  EOT
  type        = string
  default     = ""
}

variable "ingress_lb_zone_id" {
  type    = string
  default = ""
}

variable "ci_role_arns" {
  description = "The GitHub Actions OIDC deploy role. The only principal that may push an image."
  type        = list(string)
  default     = []
}

variable "access_entries" {
  description = "SSO permission sets mapped to cluster access. No aws-auth editing by hand."
  type        = map(any)
  default     = {}
}
