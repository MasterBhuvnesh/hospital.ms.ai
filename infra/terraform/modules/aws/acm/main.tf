# =============================================================================
#  ACM. Certificates for CloudFront and for anything terminating TLS at an AWS
#  load balancer.
#
#  NOT for the API. TLS terminates at ingress-nginx with a cert-manager
#  certificate, exactly as it does on a hospital's own cluster, so the TLS path
#  is one path rather than two. This module exists for the CloudFront
#  distribution serving the desktop update feed, which cannot use a Kubernetes
#  secret.
#
#  DNS validation, never email. Email validation needs a human to click a link
#  every renewal, which is a renewal that eventually does not happen.
# =============================================================================

resource "aws_acm_certificate" "this" {
  domain_name               = var.domain_name
  subject_alternative_names = var.subject_alternative_names
  validation_method         = "DNS"

  tags = merge(var.tags, { Name = var.domain_name })

  lifecycle {
    # Replace before destroying. Destroying first means a window with no
    # certificate at all on whatever is using it.
    create_before_destroy = true
  }
}

resource "aws_route53_record" "validation" {
  for_each = {
    for dvo in aws_acm_certificate.this.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id         = var.zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "this" {
  certificate_arn         = aws_acm_certificate.this.arn
  validation_record_fqdns = [for r in aws_route53_record.validation : r.fqdn]

  timeouts {
    create = "10m"
  }
}
