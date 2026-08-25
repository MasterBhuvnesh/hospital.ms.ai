output "namespace" {
  value = helm_release.keda.namespace
}

output "ready" {
  description = "Gate the hms release on this, or the ScaledObject applies before the CRD exists."
  value       = helm_release.keda.status
}
