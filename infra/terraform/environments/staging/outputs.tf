output "cluster_name" {
  value = module.eks.cluster_name
}

output "kubeconfig_command" {
  value = "aws eks update-kubeconfig --region ${var.region} --name ${module.eks.cluster_name}"
}

output "database_endpoint" {
  value = module.rds.endpoint
}

output "cache_endpoint" {
  value = module.elasticache.primary_endpoint
}

output "bucket_names" {
  value = module.s3.bucket_names
}

output "storage_role_arn" {
  value = module.iam_irsa.storage_role_arn
}
