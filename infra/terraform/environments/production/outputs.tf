output "cluster_name" {
  value = module.eks.cluster_name
}

output "kubeconfig_command" {
  value = "aws eks update-kubeconfig --region ${var.region} --name ${module.eks.cluster_name}"
}

output "ecr_registry" {
  description = "Set as image.registry in values-aws.yaml."
  value       = module.ecr.registry
}

output "database_endpoint" {
  value = module.rds.endpoint
}

output "cache_endpoint" {
  value = module.elasticache.primary_endpoint
}

output "rabbitmq_host" {
  description = "In-cluster on AWS too. Amazon MQ cannot run the delayed-message plugin."
  value       = module.rabbitmq.host
}

output "bucket_names" {
  value = module.s3.bucket_names
}

output "storage_role_arn" {
  description = "serviceAccount.annotations in values-aws.yaml."
  value       = module.iam_irsa.storage_role_arn
}

output "secret_store_name" {
  value = module.external_secrets.store_name
}

output "update_feed_url" {
  value = module.cloudfront.feed_url
}

output "nat_public_ips" {
  description = "Give these to any provider that allowlists by source IP: the SMS gateway, the voice provider, Razorpay."
  value       = module.vpc.nat_public_ips
}

# Connection strings are never outputs, not even sensitive ones. They are
# written to Secrets Manager and read by External Secrets. A sensitive output
# still sits in the state file and still prints with `terraform output -json`.

output "helm_command" {
  value = <<-EOT
    helm upgrade --install hms infra/helm/hms -n hms-production \
      -f infra/helm/hms/values.yaml \
      -f infra/helm/hms/values-portable.yaml \
      -f infra/helm/hms/values-aws.yaml \
      --set image.registry=${module.ecr.registry} \
      --set image.tag=$GIT_SHA \
      --atomic --wait --timeout 10m

    Note the ordering: portable first, aws layered on top. aws is a set of
    overrides, never a replacement.
  EOT
}
