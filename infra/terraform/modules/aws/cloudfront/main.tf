# =============================================================================
#  CloudFront. THE DESKTOP AUTO-UPDATE FEED, AND NOTHING ELSE.
#
#  The API is not behind a CDN. It is dynamic, authenticated, and per-patient:
#  there is nothing to cache and a cache in front of it is a way to serve one
#  patient's queue position to another.
#
#  The update feed is the opposite: static files, identical for every reader,
#  fetched by every desktop install on launch. It is also the one asset a
#  hospital on a slow link genuinely benefits from having close by.
#
#  A customer self-hosting uses GitHub Releases or any web server instead. The
#  electron-updater feed is an HTTPS URL and does not care what serves it.
# =============================================================================

resource "aws_cloudfront_origin_access_control" "this" {
  name                              = "${var.name}-updates"
  description                       = "OAC for the desktop update bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  comment             = "${var.name} desktop update feed"
  price_class         = var.price_class
  aliases             = var.aliases
  default_root_object = ""

  origin {
    domain_name              = var.bucket_regional_domain_name
    origin_id                = "updates"
    origin_access_control_id = aws_cloudfront_origin_access_control.this.id
  }

  default_cache_behavior {
    target_origin_id       = "updates"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    # CachingOptimized. The installers are content-addressed by version, so a
    # long TTL is safe; latest.yml is the one short-lived object and carries
    # its own cache-control from the upload.
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  ordered_cache_behavior {
    # The manifest electron-updater polls. Never cached at the edge for long,
    # or a released update is invisible for hours.
    path_pattern           = "*.yml"
    target_origin_id       = "updates"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    min_ttl                = 0
    default_ttl            = 60
    max_ttl                = 300

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  web_acl_id = var.web_acl_arn

  logging_config {
    bucket          = var.log_bucket_domain_name
    prefix          = "cloudfront/"
    include_cookies = false
  }

  tags = merge(var.tags, { Name = "${var.name}-updates" })
}

# The bucket is private. Only this distribution may read it, which is what the
# OAC condition below enforces.
data "aws_iam_policy_document" "bucket" {
  statement {
    sid     = "AllowCloudFrontRead"
    effect  = "Allow"
    actions = ["s3:GetObject"]
    resources = ["${var.bucket_arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.this.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "updates" {
  bucket = var.bucket_id
  policy = data.aws_iam_policy_document.bucket.json
}
