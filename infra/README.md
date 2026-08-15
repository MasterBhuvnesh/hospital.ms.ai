# infra

Everything needed to run the platform, on any Kubernetes cluster or on AWS.

| Folder | Contents |
|---|---|
| `terraform` | Provisioning, split into a provider-agnostic layer and an AWS layer |
| `kubernetes` | Raw manifests: namespaces, ingress, network policies, ExternalSecret definitions |
| `helm` | One chart rendering all eight services from a values list |

## The profile split

The base Helm chart contains **no cloud-specific annotation, storage class, or ARN**. Profiles are values files layered on top:

```bash
helm upgrade --install hms infra/helm/hms -n hms-production \
  -f infra/helm/hms/values.yaml \
  -f infra/helm/hms/values-portable.yaml     # or values-aws.yaml
```

`portable` is the default and `aws` is an override on top of it. That ordering is deliberate: if AWS were the default, the portable path would rot because nobody would run it.

A customer running `portable` needs only `terraform/modules/kubernetes` and a kubeconfig. They never open an AWS module.

See [`docs/portability.md`](../docs/portability.md) and [`docs/developer.md`](../docs/developer.md).
