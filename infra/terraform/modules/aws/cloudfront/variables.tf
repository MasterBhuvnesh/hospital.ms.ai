variable "name" {
  type = string
}

variable "bucket_id" {
  type = string
}

variable "bucket_arn" {
  type = string
}

variable "bucket_regional_domain_name" {
  type = string
}

variable "certificate_arn" {
  description = "Must be issued in us-east-1. CloudFront accepts no other region."
  type        = string
}

variable "aliases" {
  type    = list(string)
  default = []
}

variable "price_class" {
  description = "PriceClass_200 covers India and the regions the desktop app is actually installed in."
  type        = string
  default     = "PriceClass_200"
}

variable "web_acl_arn" {
  description = "WAF. Attached here because this is the one public static surface."
  type        = string
  default     = null
}

variable "log_bucket_domain_name" {
  type    = string
  default = null
}

variable "tags" {
  type    = map(string)
  default = {}
}
