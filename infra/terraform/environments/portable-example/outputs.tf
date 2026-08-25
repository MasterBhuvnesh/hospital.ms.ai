output "namespace" {
  value = local.namespace
}

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

output "otlp_endpoint" {
  value = module.observability.otlp_endpoint
}

output "secret_store_name" {
  value = module.external_secrets.store_name
}

output "next_steps" {
  description = "What a customer runs after this applies."
  value       = <<-EOT
    1. Put the environment secret in place. With the kubernetes backend:

         kubectl create secret generic hms-env -n ${local.namespace} \
           --from-env-file=envs/.env.production

       With Sealed Secrets, seal it first and commit the ciphertext:

         kubeseal --format yaml < secret.yaml > sealed-hms-env.yaml

    2. Deploy the platform. The PORTABLE values file, which is the default:

         helm upgrade --install hms infra/helm/hms -n ${local.namespace} \
           -f infra/helm/hms/values.yaml \
           -f infra/helm/hms/values-portable.yaml \
           --set image.tag=<release> \
           --wait --timeout 10m

    3. Verify:

         kubectl get deploy -n ${local.namespace} -o wide
         curl -H 'Host: <your-host>' https://<your-host>/health/ready

       All eight deployments must report the same image tag.
  EOT
}
