output "host" {
  value = var.release_name
}

output "port" {
  value = 5672
}

output "management_port" {
  value = 15672
}

output "username" {
  value = var.username
}

output "auth_secret" {
  description = "Secret holding rabbitmq-password. KEDA reads the broker URL from the hms env secret, not from here."
  value       = var.release_name
}

output "exchange" {
  value = "hms.events"
}

output "delayed_exchange" {
  description = "The reason this broker is self-hosted on every profile."
  value       = "hms.delayed"
}
