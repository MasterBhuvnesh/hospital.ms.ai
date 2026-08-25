output "namespaces" {
  description = "Map of environment to created namespace name."
  value       = { for k, v in kubernetes_namespace.hms : v.metadata[0].labels["atelier.health/environment"] => k }
}

output "namespace_names" {
  description = "All hms application namespaces."
  value       = keys(kubernetes_namespace.hms)
}

output "platform_namespaces" {
  description = "All platform component namespaces."
  value       = [for ns in kubernetes_namespace.platform : ns.metadata[0].name]
}
