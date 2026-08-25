output "host" {
  value = "${var.release_name}-master"
}

output "read_host" {
  value = var.architecture == "replication" ? "${var.release_name}-replicas" : "${var.release_name}-master"
}

output "port" {
  value = 6379
}

output "auth_secret" {
  description = "Secret holding redis-password. The value never becomes an output."
  value       = var.auth_enabled ? var.release_name : ""
}
