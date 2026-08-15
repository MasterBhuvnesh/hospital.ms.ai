# infra/terraform

Split into two layers, and the second one is optional.

```
modules/
  kubernetes/     PROVIDER-AGNOSTIC. kubernetes and helm providers only
    namespaces/  ingress-nginx/  cert-manager/  sealed-secrets/
    postgres-cnpg/  redis/  rabbitmq/  minio/
    observability/  keda/
  aws/            AWS ONLY
    vpc/  eks/  rds/  elasticache/  s3/  ecr/  iam-irsa/  secrets-manager/
environments/
  local-kind/  portable-example/     kubernetes only
  dev/  staging/  production/        aws + kubernetes
```

## The point of the split

A customer running the `portable` profile needs **only** `modules/kubernetes` and a kubeconfig. They never read an AWS module, never need an AWS account, and never hit a provider block they cannot satisfy.

An AWS environment composes both: `modules/aws` provisions the substrate, `modules/kubernetes` installs what runs inside it, minus what AWS supplies. RabbitMQ and observability come from `modules/kubernetes` on **every** profile.

## Rules

- **Nothing is created by hand.** A console-created resource is invisible to the next engineer.
- Always review the plan: `terraform plan -out=tfplan`, then apply that file.
- `production` requires a reviewed pull request. No local applies.
- State lives in S3 with DynamoDB locking for AWS environments, and in any supported backend for portable ones.
