# infra/kubernetes/ingress

Ingress resources, one per environment.

**Routes to `gateway` and nothing else.** Every other service is `ClusterIP` and unreachable from outside the cluster. That single fact removes an entire class of exposure, and it is verified as a negative test: a request to a non-gateway service from outside the cluster must fail to connect.

ingress-nginx on every profile, **including AWS**. No ALB controller, so there is one ingress path to test rather than two.
