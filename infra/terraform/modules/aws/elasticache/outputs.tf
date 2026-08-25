output "primary_endpoint" {
  value = aws_elasticache_replication_group.this.primary_endpoint_address
}

output "reader_endpoint" {
  value = aws_elasticache_replication_group.this.reader_endpoint_address
}

output "port" {
  value = 6379
}

output "auth_token" {
  value     = random_password.auth_token.result
  sensitive = true
}

output "security_group_id" {
  value = aws_security_group.this.id
}

output "redis_url" {
  description = "rediss, not redis. Transit encryption is on and the client must use it."
  value       = "rediss://:${random_password.auth_token.result}@${aws_elasticache_replication_group.this.primary_endpoint_address}:6379"
  sensitive   = true
}
