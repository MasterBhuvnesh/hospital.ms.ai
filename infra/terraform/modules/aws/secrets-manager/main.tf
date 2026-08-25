# =============================================================================
#  Secrets Manager. The store behind External Secrets on the aws profile.
#
#  Terraform creates the CONTAINERS and, where it generated the credential
#  itself, writes the value once. Provider tokens, the JWT signing key and
#  anything else issued outside Terraform are created empty here and populated
#  out of band. A token pasted into a tfvars file ends up in the state file in
#  plaintext, and the state file outlives the token.
#
#  Rotation is a schedule plus the reloader annotation on the deployment, so a
#  rotated database credential restarts the pods holding it rather than
#  applying to new pods only.
# =============================================================================

resource "aws_secretsmanager_secret" "this" {
  for_each = merge(local.managed, local.external)

  name                    = "${var.prefix}/${each.key}"
  description             = each.value.description
  kms_key_id              = var.kms_key_arn
  recovery_window_in_days = var.recovery_window_in_days

  tags = merge(var.tags, {
    Name   = "${var.prefix}/${each.key}"
    Source = contains(keys(local.managed), each.key) ? "terraform" : "out-of-band"
  })
}

locals {
  # Values Terraform generated and therefore already knows.
  managed = {
    database = {
      description = "RDS master credential and host"
      value = var.database_secret == null ? null : jsonencode(var.database_secret)
    }
    redis = {
      description = "ElastiCache auth token and endpoint"
      value = var.redis_secret == null ? null : jsonencode(var.redis_secret)
    }
    rabbitmq = {
      description = "In-cluster broker credential"
      value = var.rabbitmq_secret == null ? null : jsonencode(var.rabbitmq_secret)
    }
  }

  # Containers only. Populated out of band, never through Terraform.
  external = {
    env = {
      description = "Provider tokens, JWT keys, and everything issued outside Terraform. See envs/CATALOGUE.md"
      value       = null
    }
  }
}

resource "aws_secretsmanager_secret_version" "managed" {
  for_each = { for k, v in local.managed : k => v if v.value != null }

  secret_id     = aws_secretsmanager_secret.this[each.key].id
  secret_string = each.value.value
}

# The env secret is created empty and never written by Terraform. If it is
# populated, leave it alone: an apply must not blank a secret that an operator
# filled in.
resource "aws_secretsmanager_secret_version" "placeholder" {
  for_each = local.external

  secret_id     = aws_secretsmanager_secret.this[each.key].id
  secret_string = jsonencode({ POPULATED = "false" })

  lifecycle {
    ignore_changes = [secret_string, version_stages]
  }
}

resource "aws_secretsmanager_secret_rotation" "database" {
  count = var.database_rotation_lambda_arn == "" ? 0 : 1

  secret_id           = aws_secretsmanager_secret.this["database"].id
  rotation_lambda_arn = var.database_rotation_lambda_arn

  rotation_rules {
    automatically_after_days = var.rotation_days
  }
}

# Read is granted by the External Secrets IRSA role in modules/aws/iam-irsa,
# scoped to this prefix. Nothing else in the account can read these, including
# the node role.
resource "aws_secretsmanager_secret_policy" "deny_insecure" {
  for_each = aws_secretsmanager_secret.this

  secret_arn = each.value.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyInsecureTransport"
      Effect    = "Deny"
      Principal = "*"
      Action    = "secretsmanager:*"
      Resource  = "*"
      Condition = {
        Bool = { "aws:SecureTransport" = "false" }
      }
    }]
  })
}
