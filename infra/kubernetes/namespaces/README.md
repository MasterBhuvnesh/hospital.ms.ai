# infra/kubernetes/namespaces

`hms-dev`, `hms-staging`, `hms-production`.

Namespaces carry the default-deny NetworkPolicy and the resource quotas, so a service deployed into one inherits the boundary rather than declaring it.
