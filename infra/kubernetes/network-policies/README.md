# infra/kubernetes/network-policies

Default-deny, then explicit allows.

Only `gateway` accepts traffic from the ingress controller. Service-to-service calls are allowed only where a real dependency exists, so a compromised service cannot reach the whole cluster.

This plus gateway authentication is what covers the threat model at eight services, which is why there is no service mesh.
