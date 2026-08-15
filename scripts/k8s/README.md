# scripts/k8s

Local cluster lifecycle.

`kind-up.sh` is the full sequence and the one CI runs: create the cluster, install ingress, install dependencies at **pinned chart versions**, **create the secret**, build and load the image, deploy the portable profile, apply the ingress, verify.

Two steps here are easy to forget and both produce a confusing failure:

- Without the secret, every pod CrashLoopBackOffs on a missing environment variable and it looks like the developer's mistake.
- Without the app Ingress, `curl` against the cluster returns a 404 from ingress-nginx rather than anything from the gateway.

Chart versions are pinned deliberately. The Bitnami public catalogue changed distribution terms during 2025, so unpinned installs break without warning. **This file is the single place to update them.**
