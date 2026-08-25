variable "kubeconfig_path" {
  type    = string
  default = "~/.kube/config"
}

variable "kube_context" {
  description = "Whatever the customer's cluster is called."
  type        = string
  default     = ""
}

variable "environment" {
  type    = string
  default = "production"
}

variable "storage_class" {
  description = <<-EOT
    Empty uses the cluster's default provisioner, which is the right answer for
    most customers. No cloud storage class is named anywhere in this
    configuration, and CI fails the build if one appears.
  EOT
  type        = string
  default     = ""
}

variable "ingress_service_type" {
  description = "LoadBalancer with MetalLB or a cloud LB, NodePort on bare metal without one."
  type        = string
  default     = "LoadBalancer"
}

variable "ingress_service_annotations" {
  type    = map(string)
  default = {}
}

variable "acme_enabled" {
  description = "False for a hospital using their own certificate authority."
  type        = bool
  default     = true
}

variable "acme_email" {
  type    = string
  default = "ops@example.org"
}

variable "secrets_backend" {
  type    = string
  default = "kubernetes"
}

variable "vault_address" {
  type    = string
  default = ""
}

variable "postgres_instances" {
  description = "3 for real. One primary and two replicas, so a node loss is not an outage."
  type        = number
  default     = 3
}

variable "postgres_storage_size" {
  type    = string
  default = "100Gi"
}

variable "rabbitmq_replicas" {
  description = "Odd number. Quorum queues need one."
  type        = number
  default     = 3
}

variable "rabbitmq_image_repository" {
  type    = string
  default = "atelierhealth/hms-rabbitmq"
}

variable "rabbitmq_image_tag" {
  type    = string
  default = "3.13-delayed"
}

variable "minio_mode" {
  type    = string
  default = "distributed"
}

variable "minio_replicas" {
  type    = number
  default = 4
}

variable "minio_storage_size" {
  type    = string
  default = "200Gi"
}

variable "loki_deployment_mode" {
  type    = string
  default = "SimpleScalable"
}

variable "timezone" {
  type    = string
  default = "Asia/Kolkata"
}
