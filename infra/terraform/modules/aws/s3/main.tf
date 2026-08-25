# =============================================================================
#  S3 buckets.
#
#  The application reaches these through StorageProvider over the plain S3 HTTP
#  API, using the SAME s3-compatible client that addresses MinIO. No AWS SDK is
#  loaded on this path, no S3 Select, no Object Lambda, no feature that a
#  hospital running Ceph or R2 could not also provide.
#
#  Private, versioned, encrypted with a customer-managed key, public access
#  blocked at the bucket level. Every one of them holds either clinical
#  documents or a backup of them.
# =============================================================================

locals {
  buckets = {
    documents = {
      purpose             = "Clinical documents and patient summaries"
      noncurrent_days     = 90
      expiration_days     = 0 # never. Retention is a statutory obligation
      object_lock         = var.object_lock_enabled
      replicate           = true
    }
    prescriptions = {
      purpose             = "Signed prescription PDFs. Immutable after signing"
      noncurrent_days     = 365
      expiration_days     = 0
      object_lock         = var.object_lock_enabled
      replicate           = true
    }
    invoices = {
      purpose             = "Invoice PDFs"
      noncurrent_days     = 365
      expiration_days     = 0
      object_lock         = false
      replicate           = true
    }
    lab = {
      purpose             = "Lab report PDFs and attachments"
      noncurrent_days     = 365
      expiration_days     = 0
      object_lock         = var.object_lock_enabled
      replicate           = true
    }
    voice = {
      purpose             = "Reception call recordings, where a hospital enables them"
      noncurrent_days     = 30
      expiration_days     = 90 # recordings are not a clinical record
      object_lock         = false
      replicate           = false
    }
    backups = {
      purpose             = "pgBackRest WAL archive and base backups"
      noncurrent_days     = 30
      expiration_days     = 400
      object_lock         = false
      replicate           = true
    }
    loki = {
      purpose             = "Log chunks. 90 day operational retention"
      noncurrent_days     = 7
      expiration_days     = 120
      object_lock         = false
      replicate           = false
    }
    tempo = {
      purpose             = "Trace blocks"
      noncurrent_days     = 7
      expiration_days     = 30
      object_lock         = false
      replicate           = false
    }
  }
}

resource "aws_s3_bucket" "this" {
  for_each = local.buckets

  bucket              = "${var.prefix}-${each.key}-${var.environment}"
  force_destroy       = false
  object_lock_enabled = each.value.object_lock

  tags = merge(var.tags, {
    Name    = "${var.prefix}-${each.key}-${var.environment}"
    Purpose = each.value.purpose
  })
}

resource "aws_s3_bucket_public_access_block" "this" {
  for_each = aws_s3_bucket.this

  bucket                  = each.value.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "this" {
  for_each = aws_s3_bucket.this

  bucket = each.value.id
  versioning_configuration {
    # Half of the object-storage recovery story. Cross-bucket replication is
    # the other half, and an accidental delete is recoverable from either.
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  for_each = aws_s3_bucket.this

  bucket = each.value.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = var.kms_key_arn
    }
    # One data key per bucket rather than one per object. Same protection,
    # materially fewer KMS calls, which matters when a clinic day writes
    # thousands of PDFs.
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "this" {
  for_each = local.buckets

  bucket = aws_s3_bucket.this[each.key].id

  rule {
    id     = "noncurrent-versions"
    status = "Enabled"
    filter {}

    noncurrent_version_expiration {
      noncurrent_days = each.value.noncurrent_days
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  dynamic "rule" {
    for_each = each.value.expiration_days > 0 ? [1] : []
    content {
      id     = "expire"
      status = "Enabled"
      filter {}
      expiration {
        days = each.value.expiration_days
      }
    }
  }

  # Clinical documents are read constantly for a few weeks and almost never
  # after. Intelligent-Tiering rather than a hand-tuned transition ladder,
  # because nobody will revisit the ladder.
  dynamic "rule" {
    for_each = each.value.expiration_days == 0 ? [1] : []
    content {
      id     = "intelligent-tiering"
      status = "Enabled"
      filter {}
      transition {
        days          = 30
        storage_class = "INTELLIGENT_TIERING"
      }
    }
  }
}

# TLS is not optional. A presigned URL fetched over plain HTTP would put a
# prescription on the wire in the clear.
resource "aws_s3_bucket_policy" "deny_insecure" {
  for_each = aws_s3_bucket.this

  bucket = each.value.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyInsecureTransport"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource = [
        each.value.arn,
        "${each.value.arn}/*",
      ]
      Condition = {
        Bool = { "aws:SecureTransport" = "false" }
      }
    }]
  })
}

# CORS on the document buckets only, so the web and desktop clients can PUT a
# scan directly against a presigned URL without proxying it through gateway.
resource "aws_s3_bucket_cors_configuration" "documents" {
  for_each = toset(var.cors_buckets)

  bucket = aws_s3_bucket.this[each.value].id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "HEAD"]
    allowed_origins = var.cors_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}
