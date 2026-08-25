variable "chart_version" {
  description = "Pinned ingress-nginx chart version."
  type        = string
  default     = "4.11.3"
}

variable "namespace" {
  type    = string
  default = "ingress-nginx"
}

variable "create_namespace" {
  type    = bool
  default = false
}

variable "replica_count" {
  type    = number
  default = 2
}

variable "service_type" {
  description = "LoadBalancer on a real cluster, NodePort on kind."
  type        = string
  default     = "LoadBalancer"
}

variable "service_annotations" {
  description = <<-EOT
    The only seam through which a cloud influences this module. The aws
    environment passes NLB hints here. Nothing cloud-specific is hardcoded in
    main.tf, so this module still applies unchanged to k3s or OpenShift.
  EOT
  type        = map(string)
  default     = {}
}

variable "use_proxy_protocol" {
  description = "Enable with an NLB configured for proxy protocol v2, so real client IPs survive."
  type        = string
  default     = "false"
}

variable "host_port_enabled" {
  description = "kind only. Binds 80 and 443 on the ingress-ready node."
  type        = bool
  default     = false
}

variable "node_selector" {
  type    = map(string)
  default = {}
}

variable "tolerations" {
  type    = list(any)
  default = []
}

variable "metrics_enabled" {
  type    = bool
  default = true
}

variable "service_monitor_enabled" {
  description = "Requires the Prometheus operator CRDs to exist first."
  type        = bool
  default     = false
}
