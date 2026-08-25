# =============================================================================
#  ECR. Nine repositories, one per image.
#
#  Eight per-service images plus the all-in-one. All nine are built from the
#  same commit and tagged with the same git SHA, which is what makes the
#  all-in-one a genuine recovery path rather than a stale artifact: switching a
#  cluster from per-service to all-in-one is a one-line values change with no
#  rebuild.
#
#  The image reference is a string. That is the whole interface, which is why
#  Docker Hub, Harbor, GHCR or a registry in a hospital's own rack all work
#  without a code change.
# =============================================================================

locals {
  repositories = concat(
    [for s in var.services : "hms-${s}"],
    ["hms-platform"],
  )
}

resource "aws_ecr_repository" "this" {
  for_each = toset(local.repositories)

  name                 = each.value
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    # A second net. Trivy already fails the build on HIGH and CRITICAL, but a
    # CVE published after the build lands here rather than nowhere.
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = var.kms_key_arn
  }

  force_delete = false

  tags = merge(var.tags, { Name = each.value })
}

# IMMUTABLE tags are the point. A mutable :latest that changes under a running
# cluster means the digest you tested is not the digest you are running, and
# the promotion rule (release never rebuilds) depends on that not happening.
resource "aws_ecr_lifecycle_policy" "this" {
  for_each = aws_ecr_repository.this

  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep the last ${var.keep_tagged} SHA-tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["sha-", "v"]
          countType     = "imageCountMoreThan"
          countNumber   = var.keep_tagged
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Expire untagged images after ${var.untagged_days} days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = var.untagged_days
        }
        action = { type = "expire" }
      },
    ]
  })
}

# Pull is granted to the node role. Push is granted to the GitHub OIDC deploy
# role only, so no human and no running pod can overwrite an image.
resource "aws_ecr_repository_policy" "this" {
  for_each = aws_ecr_repository.this

  repository = each.value.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(
      var.pull_principal_arns == [] ? [] : [{
        Sid       = "AllowPull"
        Effect    = "Allow"
        Principal = { AWS = var.pull_principal_arns }
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability",
        ]
      }],
      var.push_principal_arns == [] ? [] : [{
        Sid       = "AllowPush"
        Effect    = "Allow"
        Principal = { AWS = var.push_principal_arns }
        Action = [
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:BatchCheckLayerAvailability",
        ]
      }],
    )
  })
}
