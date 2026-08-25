output "endpoint" {
  value = aws_db_instance.this.address
}

output "port" {
  value = aws_db_instance.this.port
}

output "database_name" {
  value = aws_db_instance.this.db_name
}

output "username" {
  value = aws_db_instance.this.username
}

output "password" {
  description = "Written to Secrets Manager by the environment, never printed or logged."
  value       = random_password.master.result
  sensitive   = true
}

output "security_group_id" {
  value = aws_security_group.this.id
}

output "instance_arn" {
  value = aws_db_instance.this.arn
}

output "database_url" {
  description = "Assembled here so exactly one place knows the shape. Sensitive, so it never reaches a plan output."
  value       = "postgresql://${aws_db_instance.this.username}:${random_password.master.result}@${aws_db_instance.this.address}:${aws_db_instance.this.port}/${aws_db_instance.this.db_name}?sslmode=verify-full"
  sensitive   = true
}
