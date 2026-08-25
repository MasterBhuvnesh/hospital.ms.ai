output "bucket_names" {
  description = "Logical name to real bucket name. Passed into the Helm values as storage.buckets."
  value       = { for k, v in aws_s3_bucket.this : k => v.id }
}

output "bucket_arns" {
  description = "Consumed by iam-irsa to scope the storage role to these buckets and no others."
  value       = { for k, v in aws_s3_bucket.this : k => v.arn }
}

output "endpoint" {
  description = "The S3 API. The same s3-compatible client that addresses MinIO uses this unchanged."
  value       = "https://s3.${var.tags["Region"] != null ? var.tags["Region"] : "ap-south-1"}.amazonaws.com"
}
