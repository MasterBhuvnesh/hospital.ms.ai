variable "environments" {
  description = "Environment suffixes to create as hms-<env> namespaces."
  type        = list(string)
  default     = ["dev", "staging", "production"]
}

variable "platform_namespaces" {
  description = "Namespaces for platform components installed by the other modules."
  type        = list(string)
  default = [
    "ingress-nginx",
    "cert-manager",
    "external-secrets",
    "sealed-secrets",
    "observability",
    "keda",
    "cnpg-system",
  ]
}

variable "pod_security_standard" {
  description = "Pod Security Admission level. Empty string disables the labels."
  type        = string
  default     = "restricted"

  validation {
    condition     = contains(["", "privileged", "baseline", "restricted"], var.pod_security_standard)
    error_message = "pod_security_standard must be one of: privileged, baseline, restricted, or empty."
  }
}

variable "resource_quotas" {
  description = "Optional quota per namespace, keyed by full namespace name."
  type        = map(map(string))
  default     = {}
}
