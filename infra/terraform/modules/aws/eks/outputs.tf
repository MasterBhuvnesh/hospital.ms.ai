output "cluster_name" {
  value = aws_eks_cluster.this.name
}

output "cluster_endpoint" {
  value = aws_eks_cluster.this.endpoint
}

output "cluster_ca_certificate" {
  value = aws_eks_cluster.this.certificate_authority[0].data
}

output "cluster_version" {
  value = aws_eks_cluster.this.version
}

output "cluster_security_group_id" {
  description = "Source for the RDS and ElastiCache ingress rules."
  value       = aws_eks_cluster.this.vpc_config[0].cluster_security_group_id
}

output "node_security_group_id" {
  value = aws_security_group.cluster.id
}

output "node_role_arn" {
  description = "Carries no application permissions. Those are IRSA roles, bound per service account."
  value       = aws_iam_role.node.arn
}

output "oidc_provider_arn" {
  description = "What makes IRSA possible. Consumed by modules/aws/iam-irsa."
  value       = aws_iam_openid_connect_provider.this.arn
}

output "oidc_provider_url" {
  value = replace(aws_eks_cluster.this.identity[0].oidc[0].issuer, "https://", "")
}

output "kubeconfig_command" {
  value = "aws eks update-kubeconfig --region ${var.tags["Region"] != null ? var.tags["Region"] : "ap-south-1"} --name ${aws_eks_cluster.this.name}"
}
