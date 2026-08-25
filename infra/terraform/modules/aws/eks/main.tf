# =============================================================================
#  EKS. The substrate only.
#
#  What runs INSIDE this cluster comes from modules/kubernetes and is identical
#  on k3s, GKE or a hospital's own cluster. This module provisions the control
#  plane, the node groups and the IAM that binds them, and stops there.
#
#  Deliberately absent: the AWS Load Balancer Controller. ingress-nginx runs
#  here exactly as it does everywhere else, behind a plain NLB, so there is one
#  ingress path to test rather than two.
# =============================================================================

data "aws_partition" "current" {}

# --- control plane role ----------------------------------------------------
resource "aws_iam_role" "cluster" {
  name = "${var.name}-eks-cluster"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "cluster" {
  for_each = toset([
    "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonEKSClusterPolicy",
    "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonEKSVPCResourceController",
  ])

  role       = aws_iam_role.cluster.name
  policy_arn = each.value
}

resource "aws_security_group" "cluster" {
  name        = "${var.name}-eks-cluster"
  description = "EKS control plane"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.name}-eks-cluster" })
}

resource "aws_cloudwatch_log_group" "cluster" {
  # The ONE CloudWatch resource in this system, and only because EKS control
  # plane logs have no other destination. Alloy forwards them into Loki, where
  # the rest of the platform's logs already live.
  name              = "/aws/eks/${var.name}/cluster"
  retention_in_days = var.control_plane_log_retention
  kms_key_id        = var.logs_kms_key_arn

  tags = var.tags
}

resource "aws_eks_cluster" "this" {
  name     = var.name
  role_arn = aws_iam_role.cluster.arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids              = var.private_subnet_ids
    security_group_ids      = [aws_security_group.cluster.id]
    endpoint_private_access = true
    # Public with an allowlist: the operator bastion and the CI runner range.
    # Fully private would need a bastion in-path for every kubectl, and a
    # bastion nobody can reach during an incident is not a security control.
    endpoint_public_access  = var.endpoint_public_access
    public_access_cidrs     = var.public_access_cidrs
  }

  # All five log types. The audit log is how a break-glass access gets
  # corroborated against the application's own audit record.
  enabled_cluster_log_types = [
    "api", "audit", "authenticator", "controllerManager", "scheduler"
  ]

  encryption_config {
    provider {
      key_arn = var.secrets_kms_key_arn
    }
    resources = ["secrets"]
  }

  access_config {
    # Access entries, not the aws-auth ConfigMap. Editing aws-auth by hand is
    # the classic way to lock an entire team out of a cluster.
    authentication_mode                         = "API"
    bootstrap_cluster_creator_admin_permissions = false
  }

  depends_on = [
    aws_iam_role_policy_attachment.cluster,
    aws_cloudwatch_log_group.cluster,
  ]

  tags = merge(var.tags, { Name = var.name })
}

# --- OIDC provider, which is what makes IRSA possible ----------------------
data "tls_certificate" "oidc" {
  url = aws_eks_cluster.this.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "this" {
  url             = aws_eks_cluster.this.identity[0].oidc[0].issuer
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.oidc.certificates[0].sha1_fingerprint]

  tags = var.tags
}

# --- node role -------------------------------------------------------------
resource "aws_iam_role" "node" {
  name = "${var.name}-eks-node"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = var.tags
}

# The node role carries NO application permissions. If a pod can reach S3 or
# Secrets Manager it is because an IRSA role was bound to its service account
# and written down in modules/aws/iam-irsa. Nothing is granted by being
# scheduled on a node.
resource "aws_iam_role_policy_attachment" "node" {
  for_each = toset([
    "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
    "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonSSMManagedInstanceCore",
  ])

  role       = aws_iam_role.node.name
  policy_arn = each.value
}

# --- node groups -----------------------------------------------------------
resource "aws_eks_node_group" "this" {
  for_each = var.node_groups

  cluster_name    = aws_eks_cluster.this.name
  node_group_name = "${var.name}-${each.key}"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.private_subnet_ids

  instance_types = each.value.instance_types
  capacity_type  = each.value.capacity_type
  disk_size      = each.value.disk_size

  scaling_config {
    desired_size = each.value.desired_size
    min_size     = each.value.min_size
    max_size     = each.value.max_size
  }

  update_config {
    max_unavailable_percentage = 25
  }

  dynamic "taint" {
    for_each = each.value.taints
    content {
      key    = taint.value.key
      value  = lookup(taint.value, "value", null)
      effect = taint.value.effect
    }
  }

  labels = each.value.labels

  tags = merge(var.tags, {
    Name = "${var.name}-${each.key}"
    # Cluster Autoscaler discovers groups by these two tags.
    "k8s.io/cluster-autoscaler/enabled"       = "true"
    "k8s.io/cluster-autoscaler/${var.name}"   = "owned"
  })

  lifecycle {
    # The autoscaler owns desired_size after the first apply. Without this,
    # every terraform apply drags the cluster back to the initial count.
    ignore_changes = [scaling_config[0].desired_size]
  }

  depends_on = [aws_iam_role_policy_attachment.node]
}

# --- managed addons --------------------------------------------------------
resource "aws_eks_addon" "this" {
  for_each = var.addons

  cluster_name  = aws_eks_cluster.this.name
  addon_name    = each.key
  addon_version = each.value.version

  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "PRESERVE"

  service_account_role_arn = try(each.value.service_account_role_arn, null)
  configuration_values     = try(each.value.configuration_values, null)

  depends_on = [aws_eks_node_group.this]

  tags = var.tags
}

# --- access entries --------------------------------------------------------
resource "aws_eks_access_entry" "this" {
  for_each = var.access_entries

  cluster_name  = aws_eks_cluster.this.name
  principal_arn = each.value.principal_arn
  type          = "STANDARD"

  tags = var.tags
}

resource "aws_eks_access_policy_association" "this" {
  for_each = var.access_entries

  cluster_name  = aws_eks_cluster.this.name
  principal_arn = each.value.principal_arn
  policy_arn    = each.value.policy_arn

  access_scope {
    type       = each.value.scope_type
    namespaces = try(each.value.namespaces, null)
  }

  depends_on = [aws_eks_access_entry.this]
}

# gp3 as the default. gp2 is slower and costs more, and it is still the
# built-in default on a fresh cluster.
resource "aws_kms_grant" "ebs_csi" {
  count = var.storage_kms_key_arn == "" ? 0 : 1

  name              = "${var.name}-ebs-csi"
  key_id            = var.storage_kms_key_arn
  grantee_principal = aws_iam_role.node.arn
  operations        = ["Encrypt", "Decrypt", "GenerateDataKey", "DescribeKey", "CreateGrant"]
}
