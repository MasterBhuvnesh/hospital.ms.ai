variable "domain" {
  type    = string
  default = "atelier.health"
}

variable "environment" {
  type = string
}

variable "create_zone" {
  description = "False when the zone lives in the shared account and this environment only adds records."
  type        = bool
  default     = false
}

variable "zone_id" {
  type    = string
  default = ""
}

variable "api_hostname" {
  type    = string
  default = ""
}

variable "app_hostname" {
  type    = string
  default = ""
}

variable "updates_hostname" {
  description = "The desktop auto-update feed, served by CloudFront."
  type        = string
  default     = ""
}

variable "load_balancer_hostname" {
  description = "The NLB created by the ingress-nginx Service. Terraform does not create it."
  type        = string
  default     = ""
}

variable "load_balancer_zone_id" {
  type    = string
  default = ""
}

variable "app_target" {
  type    = string
  default = ""
}

variable "cloudfront_domain" {
  type    = string
  default = ""
}

variable "health_check_enabled" {
  type    = bool
  default = true
}

variable "mail_records_enabled" {
  description = "SPF and DMARC for the SES SMTP sender."
  type        = bool
  default     = true
}

variable "tags" {
  type    = map(string)
  default = {}
}
