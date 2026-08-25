variable "chart_version" {
  type    = string
  default = "v1.16.2"
}

variable "namespace" {
  type    = string
  default = "cert-manager"
}

variable "create_namespace" {
  type    = bool
  default = false
}

variable "replica_count" {
  type    = number
  default = 1
}

variable "acme_enabled" {
  description = "Create the Let's Encrypt ClusterIssuers. Off for a customer using their own CA."
  type        = bool
  default     = true
}

variable "acme_email" {
  description = "Expiry notices go here. A dead mailbox means a silent expiry."
  type        = string
  default     = "ops@atelier.health"
}

variable "ingress_class" {
  type    = string
  default = "nginx"
}

variable "dns01_enabled" {
  description = "DNS-01 for wildcards or a cluster that is not publicly reachable."
  type        = bool
  default     = false
}

variable "dns01_region" {
  type    = string
  default = ""
}

variable "dns01_hosted_zone_id" {
  type    = string
  default = ""
}

variable "solver_role_arn" {
  description = <<-EOT
    Opaque string passed through to the solver. On AWS the environment supplies
    an IRSA role ARN. This module treats it as text and has no aws provider.
  EOT
  type        = string
  default     = ""
}

variable "service_account_annotations" {
  type    = map(string)
  default = {}
}

variable "metrics_enabled" {
  type    = bool
  default = true
}

variable "service_monitor_enabled" {
  type    = bool
  default = false
}
