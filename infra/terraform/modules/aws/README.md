# infra/terraform/modules/aws

**AWS only.** Consumed by the `aws` profile and by nothing else.

| Module | Provisions |
|---|---|
| `vpc/` | VPC, public and private subnets across three AZs, NAT, routes |
| `eks/` | Cluster, managed node groups, IRSA, addons |
| `rds/` | PostgreSQL 16 Multi-AZ, automated backups, PITR |
| `elasticache/` | Redis with encryption in transit |
| `s3/` | Private buckets, versioning, lifecycle, SSE-KMS |
| `ecr/` | Repositories, lifecycle policies, image scanning |
| `iam-irsa/` | Least-privilege roles bound to service accounts |
| `secrets-manager/` | Secret store behind External Secrets |

## What is deliberately absent

No Amazon MQ (cannot run the plugin), no CloudWatch (unavailable off AWS), no ALB controller (one ingress path is easier to test than two), no DynamoDB.

Using managed services here is fine. **Depending on them in application code is not.** Every one of these is reached through a URL or an interface, so the same image runs unchanged on the portable profile.
