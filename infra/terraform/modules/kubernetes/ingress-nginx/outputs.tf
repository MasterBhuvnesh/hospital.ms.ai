output "namespace" {
  value = helm_release.ingress_nginx.namespace
}

output "ingress_class_name" {
  description = "The class every Ingress in the platform references."
  value       = "nginx"
}

output "release_version" {
  value = helm_release.ingress_nginx.version
}
