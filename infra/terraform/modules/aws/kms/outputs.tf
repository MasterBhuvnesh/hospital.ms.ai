output "key_arns" {
  description = "Data class to key ARN. Consumed by rds, elasticache, s3, secrets-manager and eks."
  value       = { for k, v in aws_kms_key.this : k => v.arn }
}

output "key_ids" {
  value = { for k, v in aws_kms_key.this : k => v.key_id }
}

output "aliases" {
  value = { for k, v in aws_kms_alias.this : k => v.name }
}
