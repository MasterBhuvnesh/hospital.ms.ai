# =============================================================================
#  Customer-managed keys, ONE PER DATA CLASS.
#
#  Not one key for the account. Separate keys mean a key policy can be narrowed
#  to the role that needs it, a key can be rotated or disabled without touching
#  every other store, and CloudTrail shows which data class an unusual decrypt
#  belonged to.
#
#  Deletion window is 30 days everywhere. A key scheduled for deletion with a
#  7-day window during a quiet week is an unrecoverable database.
# =============================================================================

data "aws_caller_identity" "current" {}

locals {
  key_classes = {
    database = "RDS, and its automated backups and snapshots"
    cache    = "ElastiCache at rest"
    storage  = "S3 buckets: clinical documents, invoices, lab reports, voice recordings"
    secrets  = "Secrets Manager, and EKS secret envelope encryption"
    logs     = "CloudTrail and VPC flow logs"
  }
}

resource "aws_kms_key" "this" {
  for_each = local.key_classes

  description             = "${var.name} ${each.key}: ${each.value}"
  deletion_window_in_days = var.deletion_window_in_days
  enable_key_rotation     = true
  multi_region            = false

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      [
        {
          Sid    = "EnableRootPermissions"
          Effect = "Allow"
          Principal = {
            AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
          }
          Action   = "kms:*"
          Resource = "*"
        },
        {
          # Service-linked use, scoped by the calling service and this account.
          Sid    = "AllowServiceUse"
          Effect = "Allow"
          Principal = { AWS = "*" }
          Action = [
            "kms:Encrypt",
            "kms:Decrypt",
            "kms:ReEncrypt*",
            "kms:GenerateDataKey*",
            "kms:DescribeKey",
            "kms:CreateGrant",
          ]
          Resource = "*"
          Condition = {
            StringEquals = {
              "kms:CallerAccount" = data.aws_caller_identity.current.account_id
            }
          }
        },
      ],
      var.additional_key_policy_statements
    )
  })

  tags = merge(var.tags, {
    Name      = "${var.name}-${each.key}"
    DataClass = each.key
  })
}

resource "aws_kms_alias" "this" {
  for_each = local.key_classes

  name          = "alias/${var.name}-${each.key}"
  target_key_id = aws_kms_key.this[each.key].key_id
}
