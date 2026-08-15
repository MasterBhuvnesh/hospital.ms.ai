# infra/kubernetes/secrets

**ExternalSecret definitions. Never values.**

Nothing in this folder should be sensitive if it leaked. These manifests say *which* secret to fetch and *where to put it*, not what it contains.

The backend is configurable per profile: Sealed Secrets or Vault on `portable`, AWS Secrets Manager on `aws`, and any of GCP or Azure elsewhere. The application only ever sees process environment variables, so it does not know or care which backend is in use.

**Never in an image, never in a values file, never in git.**
