output "zone_id" {
  description = "Passed to iam-irsa so the cert-manager and external-dns roles are scoped to this zone alone."
  value       = local.zone_id
}

output "name_servers" {
  value = var.create_zone ? aws_route53_zone.this[0].name_servers : []
}

output "api_fqdn" {
  value = var.api_hostname
}

output "health_check_id" {
  value = var.health_check_enabled && var.api_hostname != "" ? aws_route53_health_check.api[0].id : ""
}
