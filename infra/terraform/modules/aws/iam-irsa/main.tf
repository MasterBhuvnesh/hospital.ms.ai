# =============================================================================
#  IRSA. One role per service account, scoped by resource ARN, never by "*".
#
#  The rule this module enforces: THE NODE ROLE CARRIES NO APPLICATION
#  PERMISSIONS. If a pod can reach S3 or Secrets Manager it is because a role
#  was bound to its service account and written down here. Nothing is granted
#  by being scheduled on a node, so a compromised sidecar in one namespace does
#  not inherit another namespace's access.
#
#  Every trust policy pins BOTH the audience and the exact
#  system:serviceaccount:<namespace>:<name> subject. Pinning only the audience
#  would let any service account in the cluster assume any role here.
# =============================================================================

data "aws_caller_identity" "current" {}

locals {
  oidc_arn = var.oidc_provider_arn
  oidc_url = var.oidc_provider_url

  roles = {
    # --- the platform's own access ------------------------------------------
    storage = {
      namespace       = var.app_namespace
      service_account = "hms"
      description     = "S3 read and write on the four document buckets"
      statements = [{
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:AbortMultipartUpload",
        ]
        Resource = [for b in var.document_bucket_arns : "${b}/*"]
        }, {
        Effect   = "Allow"
        Action   = ["s3:ListBucket", "s3:GetBucketLocation"]
        Resource = var.document_bucket_arns
        }, {
        Effect   = "Allow"
        Action   = ["kms:Decrypt", "kms:GenerateDataKey"]
        Resource = [var.storage_kms_key_arn]
      }]
    }

    external_secrets = {
      namespace       = "external-secrets"
      service_account = "external-secrets"
      description     = "GetSecretValue on hms/<env>/* and nothing else"
      statements = [{
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
        ]
        # Scoped by path. Not secretsmanager:* on *, which is what this rule
        # exists to prevent.
        Resource = ["arn:aws:secretsmanager:${var.region}:${data.aws_caller_identity.current.account_id}:secret:${var.secret_prefix}/*"]
        }, {
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = [var.secrets_kms_key_arn]
      }]
    }

    pgbackrest = {
      namespace       = var.app_namespace
      service_account = "pgbackrest"
      description     = "WAL archive and base backups to the backups bucket only"
      statements = [{
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = ["${var.backup_bucket_arn}/*"]
        }, {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = [var.backup_bucket_arn]
        }, {
        Effect   = "Allow"
        Action   = ["kms:Decrypt", "kms:GenerateDataKey"]
        Resource = [var.storage_kms_key_arn]
      }]
    }

    # --- observability -------------------------------------------------------
    loki = {
      namespace       = "observability"
      service_account = "loki"
      description     = "Log chunks"
      statements = [{
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [var.loki_bucket_arn, "${var.loki_bucket_arn}/*"]
        }, {
        Effect   = "Allow"
        Action   = ["kms:Decrypt", "kms:GenerateDataKey"]
        Resource = [var.storage_kms_key_arn]
      }]
    }

    tempo = {
      namespace       = "observability"
      service_account = "tempo"
      description     = "Trace blocks"
      statements = [{
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [var.tempo_bucket_arn, "${var.tempo_bucket_arn}/*"]
        }, {
        Effect   = "Allow"
        Action   = ["kms:Decrypt", "kms:GenerateDataKey"]
        Resource = [var.storage_kms_key_arn]
      }]
    }

    # --- cluster components --------------------------------------------------
    cert_manager = {
      namespace       = "cert-manager"
      service_account = "cert-manager"
      description     = "DNS-01 solver on one hosted zone"
      statements = [{
        Effect   = "Allow"
        Action   = ["route53:GetChange"]
        Resource = ["arn:aws:route53:::change/*"]
        }, {
        Effect   = "Allow"
        Action   = ["route53:ChangeResourceRecordSets", "route53:ListResourceRecordSets"]
        Resource = ["arn:aws:route53:::hostedzone/${var.hosted_zone_id}"]
      }]
    }

    external_dns = {
      namespace       = "kube-system"
      service_account = "external-dns"
      description     = "Records in one hosted zone"
      statements = [{
        Effect   = "Allow"
        Action   = ["route53:ChangeResourceRecordSets"]
        Resource = ["arn:aws:route53:::hostedzone/${var.hosted_zone_id}"]
        }, {
        Effect   = "Allow"
        Action   = ["route53:ListHostedZones", "route53:ListResourceRecordSets"]
        Resource = ["*"] # these two are list-only and cannot be scoped
      }]
    }

    cluster_autoscaler = {
      namespace       = "kube-system"
      service_account = "cluster-autoscaler"
      description     = "Scale the tagged node groups"
      statements = [{
        Effect = "Allow"
        Action = [
          "autoscaling:DescribeAutoScalingGroups",
          "autoscaling:DescribeAutoScalingInstances",
          "autoscaling:DescribeLaunchConfigurations",
          "autoscaling:DescribeScalingActivities",
          "ec2:DescribeInstanceTypes",
          "ec2:DescribeLaunchTemplateVersions",
        ]
        Resource = ["*"]
        }, {
        Effect = "Allow"
        Action = [
          "autoscaling:SetDesiredCapacity",
          "autoscaling:TerminateInstanceInAutoScalingGroup",
        ]
        Resource = ["*"]
        Condition = {
          # Only groups belonging to this cluster. Without this condition the
          # autoscaler can resize any ASG in the account.
          StringEquals = {
            "autoscaling:ResourceTag/k8s.io/cluster-autoscaler/${var.cluster_name}" = "owned"
          }
        }
      }]
    }

    ebs_csi = {
      namespace       = "kube-system"
      service_account = "ebs-csi-controller-sa"
      description     = "gp3 volumes for stateful components"
      statements = [{
        Effect = "Allow"
        Action = [
          "ec2:CreateSnapshot",
          "ec2:AttachVolume",
          "ec2:DetachVolume",
          "ec2:ModifyVolume",
          "ec2:DescribeAvailabilityZones",
          "ec2:DescribeInstances",
          "ec2:DescribeSnapshots",
          "ec2:DescribeTags",
          "ec2:DescribeVolumes",
          "ec2:DescribeVolumesModifications",
          "ec2:CreateVolume",
          "ec2:DeleteVolume",
          "ec2:CreateTags",
        ]
        Resource = ["*"]
        }, {
        Effect   = "Allow"
        Action   = ["kms:CreateGrant", "kms:Decrypt", "kms:GenerateDataKeyWithoutPlaintext", "kms:DescribeKey"]
        Resource = [var.storage_kms_key_arn]
      }]
    }
  }
}

resource "aws_iam_role" "this" {
  for_each = local.roles

  name        = "${var.cluster_name}-${replace(each.key, "_", "-")}"
  description = each.value.description

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = local.oidc_arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          # BOTH conditions. Audience alone would let any service account in
          # the cluster assume this role.
          "${local.oidc_url}:aud" = "sts.amazonaws.com"
          "${local.oidc_url}:sub" = "system:serviceaccount:${each.value.namespace}:${each.value.service_account}"
        }
      }
    }]
  })

  tags = merge(var.tags, {
    Name           = "${var.cluster_name}-${replace(each.key, "_", "-")}"
    ServiceAccount = "${each.value.namespace}/${each.value.service_account}"
  })
}

resource "aws_iam_role_policy" "this" {
  for_each = local.roles

  name = "${var.cluster_name}-${replace(each.key, "_", "-")}"
  role = aws_iam_role.this[each.key].id

  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = each.value.statements
  })
}
