output "role_arns" {
  description = "Logical name to role ARN. Passed into the Helm values and the module service accounts as annotations."
  value       = { for k, v in aws_iam_role.this : k => v.arn }
}

output "storage_role_arn" {
  description = "serviceAccount.annotations in values-aws.yaml."
  value       = aws_iam_role.this["storage"].arn
}

output "external_secrets_role_arn" {
  value = aws_iam_role.this["external_secrets"].arn
}

output "service_account_annotations" {
  description = "Ready-made eks.amazonaws.com/role-arn maps, one per component."
  value = {
    for k, v in aws_iam_role.this : k => {
      "eks.amazonaws.com/role-arn" = v.arn
    }
  }
}
