variable "name" {
  description = "Environment prefix, for example hms-production."
  type        = string
}

variable "region" {
  description = "ap-south-1. Data residency under the DPDP Act, and latency to the customer base."
  type        = string
  default     = "ap-south-1"
}

variable "cidr_block" {
  type    = string
  default = "10.60.0.0/16"
}

variable "availability_zones" {
  type    = list(string)
  default = ["ap-south-1a", "ap-south-1b", "ap-south-1c"]
}

variable "az_count" {
  type    = number
  default = 3

  validation {
    condition     = var.az_count >= 2 && var.az_count <= 3
    error_message = "az_count must be 2 or 3. Multi-AZ RDS needs at least two."
  }
}

variable "single_nat_gateway" {
  description = "True in dev to save money. Never in production: one NAT makes one AZ's failure everyone's problem."
  type        = bool
  default     = false
}

variable "enable_endpoints" {
  description = "S3 and DynamoDB gateway endpoints, plus interface endpoints for ECR, Secrets Manager, STS, KMS and Logs."
  type        = bool
  default     = true
}

variable "flow_logs_enabled" {
  type    = bool
  default = true
}

variable "flow_logs_bucket_arn" {
  type    = string
  default = ""
}

variable "tags" {
  type    = map(string)
  default = {}
}
