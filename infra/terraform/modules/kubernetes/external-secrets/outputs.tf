output "namespace" {
  value = helm_release.external_secrets.namespace
}

output "store_name" {
  description = "Pass to the Helm chart as externalSecret.secretStoreName."
  value       = var.create_store ? var.store_name : ""
}

output "backend" {
  value = var.backend
}

output "service_account_name" {
  description = "The subject an IRSA trust policy binds to on AWS."
  value       = var.service_account_name
}
