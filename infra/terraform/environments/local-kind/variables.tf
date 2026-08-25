variable "kubeconfig_path" {
  type    = string
  default = "~/.kube/config"
}

variable "kube_context" {
  description = "kind prefixes its contexts with kind-."
  type        = string
  default     = "kind-hms"
}
