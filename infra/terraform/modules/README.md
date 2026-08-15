# infra/terraform/modules

Two layers, and the second one is optional.

| Folder | Providers | Needed by |
|---|---|---|
| `kubernetes/` | `kubernetes`, `helm` only | **Every profile** |
| `aws/` | `aws` | The `aws` profile only |

The split is the whole point: a customer running `portable` composes `kubernetes/` against their own kubeconfig and never opens an AWS module.
