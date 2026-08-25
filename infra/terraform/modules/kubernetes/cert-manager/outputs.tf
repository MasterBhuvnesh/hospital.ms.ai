output "namespace" {
  value = helm_release.cert_manager.namespace
}

output "cluster_issuer_prod" {
  description = "Referenced by cert-manager.io/cluster-issuer on the production Ingress."
  value       = var.acme_enabled ? "letsencrypt-prod" : ""
}

output "cluster_issuer_staging" {
  value = var.acme_enabled ? "letsencrypt-staging" : ""
}
