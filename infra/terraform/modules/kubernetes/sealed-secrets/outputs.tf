output "namespace" {
  value = helm_release.sealed_secrets.namespace
}

output "controller_name" {
  description = "Pass to kubeseal as --controller-name."
  value       = "sealed-secrets-controller"
}

output "backup_command" {
  description = "The controller key. Back this up out of band, or every sealed secret in git becomes unrecoverable."
  value       = "kubectl get secret -n ${var.namespace} -l sealedsecrets.bitnami.com/sealed-secrets-key -o yaml > sealed-secrets-key.backup.yaml"
}
