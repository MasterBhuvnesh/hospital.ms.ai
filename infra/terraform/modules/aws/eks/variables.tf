variable "name" {
  type = string
}

variable "kubernetes_version" {
  description = "Upgraded on the N-1 policy, control plane first, one minor at a time."
  type        = string
  default     = "1.33"
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  description = "Nodes and pods only. Nothing runs in a public subnet."
  type        = list(string)
}

variable "endpoint_public_access" {
  type    = bool
  default = true
}

variable "public_access_cidrs" {
  description = "Operator bastion and CI runner ranges. Never 0.0.0.0/0 in production."
  type        = list(string)
  default     = []
}

variable "control_plane_log_retention" {
  type    = number
  default = 90
}

variable "secrets_kms_key_arn" {
  description = "Envelope encryption for Kubernetes secrets."
  type        = string
}

variable "logs_kms_key_arn" {
  type    = string
  default = null
}

variable "storage_kms_key_arn" {
  type    = string
  default = ""
}

# ---------------------------------------------------------------------------
# Node groups.
#
#  system  the platform components. Tainted, so an application pod cannot
#          crowd out the ingress controller or the autoscaler.
#  app     the eight services. On-demand, because a spot reclamation mid
#          transaction is not a trade worth making on the write path.
#  burst   spot, tainted. Only scheduling tolerates it.
# ---------------------------------------------------------------------------
variable "node_groups" {
  type = map(object({
    instance_types = list(string)
    capacity_type  = string
    disk_size      = number
    desired_size   = number
    min_size       = number
    max_size       = number
    labels         = map(string)
    taints         = list(map(string))
  }))

  default = {
    system = {
      instance_types = ["m7i.large"]
      capacity_type  = "ON_DEMAND"
      disk_size      = 50
      desired_size   = 2
      min_size       = 2
      max_size       = 3
      labels         = { "atelier.health/pool" = "system" }
      taints = [{
        key    = "CriticalAddonsOnly"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }

    app = {
      instance_types = ["m7i.xlarge"]
      capacity_type  = "ON_DEMAND"
      disk_size      = 100
      desired_size   = 3
      min_size       = 3
      max_size       = 12
      labels         = { "atelier.health/pool" = "app" }
      taints         = []
    }

    burst = {
      # Three families, so one spot pool drying up does not stop scale-out.
      instance_types = ["m7i.xlarge", "m6i.xlarge", "m5.xlarge"]
      capacity_type  = "SPOT"
      disk_size      = 100
      desired_size   = 0
      min_size       = 0
      max_size       = 8
      labels         = { "atelier.health/pool" = "burst" }
      taints = [{
        key    = "workload"
        value  = "burst"
        effect = "NO_SCHEDULE"
      }]
    }
  }
}

variable "addons" {
  description = "Versions pinned in Terraform and bumped deliberately."
  type        = map(any)
  default = {
    vpc-cni                 = { version = "v1.19.0-eksbuild.1" }
    coredns                 = { version = "v1.11.4-eksbuild.2" }
    kube-proxy              = { version = "v1.33.0-eksbuild.2" }
    aws-ebs-csi-driver      = { version = "v1.37.0-eksbuild.1" }
    eks-pod-identity-agent  = { version = "v1.3.4-eksbuild.1" }
  }
}

variable "access_entries" {
  description = "SSO permission sets mapped to cluster access. No aws-auth editing by hand."
  type        = map(any)
  default     = {}
}

variable "tags" {
  type    = map(string)
  default = {}
}
