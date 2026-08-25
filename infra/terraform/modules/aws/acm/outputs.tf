output "certificate_arn" {
  description = "Validated. Depending on this output rather than on the certificate resource avoids using it before it is issued."
  value       = aws_acm_certificate_validation.this.certificate_arn
}

output "domain_name" {
  value = aws_acm_certificate.this.domain_name
}
