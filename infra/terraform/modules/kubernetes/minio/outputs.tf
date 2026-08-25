output "endpoint" {
  description = "Set as storage.endpoint in the Helm values. Path style, because MinIO does not do virtual-host buckets by default."
  value       = "http://${var.release_name}:9000"
}

output "console_endpoint" {
  value = "http://${var.release_name}-console:9001"
}

output "buckets" {
  value = var.buckets
}

output "credentials_secret" {
  description = "Secret holding root-user and root-password."
  value       = var.release_name
}

output "backup_secret_name" {
  value = var.create_backup_credentials ? var.backup_secret_name : ""
}
