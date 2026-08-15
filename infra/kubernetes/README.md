# infra/kubernetes

Raw manifests that sit outside the Helm chart, because they are cluster-scoped or environment-scoped rather than release-scoped.

| Folder | Contents |
|---|---|
| `namespaces/` | `hms-dev`, `hms-staging`, `hms-production` |
| `ingress/` | Ingress resources per environment. Routes to `gateway` only |
| `network-policies/` | Default-deny, then explicit allows |
| `secrets/` | ExternalSecret **definitions**. Never values |

## Rules

- Ingress reaches `gateway` and nothing else. Every other service is `ClusterIP` and unreachable from outside the cluster.
- `secrets/` contains references to a secret store, never a secret. Nothing in this folder should ever be sensitive if leaked.
- ingress-nginx on every profile, **including AWS**. No ALB controller, so there is one ingress path to test rather than two.
