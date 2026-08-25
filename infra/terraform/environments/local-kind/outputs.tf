output "namespace" {
  value = "hms-dev"
}

# These four feed the Helm values. On the aws environment the same four names
# carry RDS, ElastiCache and S3 endpoints instead, and the chart does not
# change.
output "database_host" {
  value = module.postgres.host
}

output "redis_host" {
  value = module.redis.host
}

output "rabbitmq_host" {
  value = module.rabbitmq.host
}

output "storage_endpoint" {
  value = module.minio.endpoint
}

output "helm_command" {
  description = "What CI runs after this applies."
  value       = <<-EOT
    helm upgrade --install hms ../../../helm/hms -n hms-dev \
      -f ../../../helm/hms/values.yaml \
      -f ../../../helm/hms/values-portable.yaml \
      --set image.tag=$(git rev-parse --short HEAD) \
      --set image.pullPolicy=Never \
      --wait --timeout 10m
  EOT
}
