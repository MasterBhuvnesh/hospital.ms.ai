# =============================================================================
#  Route 53. The public zone and the records that point at the NLB.
#
#  The NLB itself is created by the ingress-nginx Service, not by Terraform, so
#  this module takes its hostname as an input. Terraform provisioning a load
#  balancer that Kubernetes also manages is how you get two controllers fighting
#  over one resource.
#
#  Health checks probe /health/ready, the same endpoint the readiness probe and
#  the blackbox exporter use. Three views of one signal, and none of them can
#  pass while the others fail.
# =============================================================================

resource "aws_route53_zone" "this" {
  count = var.create_zone ? 1 : 0

  name    = var.domain
  comment = "Atelier Health ${var.environment}"

  tags = merge(var.tags, { Name = var.domain })
}

locals {
  zone_id = var.create_zone ? aws_route53_zone.this[0].zone_id : var.zone_id
}

resource "aws_route53_record" "api" {
  count = var.load_balancer_hostname == "" ? 0 : 1

  zone_id = local.zone_id
  name    = var.api_hostname
  type    = "A"

  alias {
    name                   = var.load_balancer_hostname
    zone_id                = var.load_balancer_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "app" {
  count = var.app_target == "" ? 0 : 1

  zone_id = local.zone_id
  name    = var.app_hostname
  type    = "CNAME"
  ttl     = 300
  records = [var.app_target]
}

resource "aws_route53_record" "updates" {
  count = var.cloudfront_domain == "" ? 0 : 1

  zone_id = local.zone_id
  name    = var.updates_hostname
  type    = "A"

  alias {
    name    = var.cloudfront_domain
    zone_id = "Z2FDTNDATAQYW2" # the fixed CloudFront hosted zone id
    evaluate_target_health = false
  }
}

resource "aws_route53_health_check" "api" {
  count = var.health_check_enabled && var.api_hostname != "" ? 1 : 0

  fqdn              = var.api_hostname
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health/ready"
  failure_threshold = 3
  request_interval  = 30
  measure_latency   = true

  # Probe from three regions. A single probe region turns that region's
  # network weather into a page.
  regions = ["ap-southeast-1", "eu-west-1", "us-east-1"]

  tags = merge(var.tags, { Name = "${var.environment}-api" })
}

# SPF and DMARC for the SES SMTP sender. Without them a hospital's own mail
# gateway silently drops the prescription email and nothing reports a failure.
resource "aws_route53_record" "spf" {
  count = var.mail_records_enabled ? 1 : 0

  zone_id = local.zone_id
  name    = var.domain
  type    = "TXT"
  ttl     = 3600
  records = ["v=spf1 include:amazonses.com ~all"]
}

resource "aws_route53_record" "dmarc" {
  count = var.mail_records_enabled ? 1 : 0

  zone_id = local.zone_id
  name    = "_dmarc.${var.domain}"
  type    = "TXT"
  ttl     = 3600
  records = ["v=DMARC1; p=quarantine; rua=mailto:dmarc@${var.domain}; fo=1"]
}
