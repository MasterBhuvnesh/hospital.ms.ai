# CloudNativePG publishes -rw for the primary and -ro for replicas. Writes go
# to -rw; a read that lands on a replica during failover is a stale read, and
# the queue cannot tolerate one.
output "host" {
  description = "Read-write service. Set as database.host in the Helm values."
  value       = "${var.cluster_name}-rw"
}

output "read_host" {
  value = "${var.cluster_name}-ro"
}

output "port" {
  value = 5432
}

output "database" {
  value = var.database_name
}

output "user" {
  value = var.database_user
}

output "credentials_secret" {
  description = "Secret holding username and password. The value is never an output."
  value       = kubernetes_secret.app_credentials.metadata[0].name
}

output "cluster_name" {
  value = var.cluster_name
}
