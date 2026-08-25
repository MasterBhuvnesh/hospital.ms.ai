output "secret_arns" {
  value = { for k, v in aws_secretsmanager_secret.this : k => v.arn }
}

output "secret_names" {
  description = "Referenced by remoteRef.key in the ExternalSecret."
  value       = { for k, v in aws_secretsmanager_secret.this : k => v.name }
}

output "prefix" {
  description = "Passed to the Helm chart as externalSecret.remoteKeyPrefix."
  value       = var.prefix
}

output "populate_command" {
  description = "How an operator fills the out-of-band secret. Values never pass through Terraform."
  value       = "aws secretsmanager put-secret-value --secret-id ${var.prefix}/env --secret-string file://env.json"
}
