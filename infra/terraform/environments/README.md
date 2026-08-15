# infra/terraform/environments

One directory per environment, each with its own state.

| Environment | Composes | For |
|---|---|---|
| `local-kind/` | `modules/kubernetes` | A laptop cluster |
| `portable-example/` | `modules/kubernetes` | **The reference for customer-hosted deployments** |
| `dev/` | `modules/aws` + `modules/kubernetes` | Our development cluster |
| `staging/` | `modules/aws` + `modules/kubernetes` | Pre-production |
| `production/` | `modules/aws` + `modules/kubernetes` | Live |

## Rules

- **Always review the plan:** `terraform plan -out=tfplan`, then apply that exact file.
- `production` requires a reviewed pull request. No local applies.
- Nothing is created by hand. A console-created resource is invisible to the next engineer.
- `portable-example/` is a real, working configuration, not a sample. It is what a customer copies.
