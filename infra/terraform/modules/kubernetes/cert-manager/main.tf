# =============================================================================
#  cert-manager. TLS on every profile.
#
#  Two solvers, chosen by variable rather than by profile:
#    HTTP-01  works anywhere with a public ingress. The portable default.
#    DNS-01   needed for wildcards and for a cluster that is not publicly
#             reachable. On AWS the credentials arrive by IRSA, which is why
#             solver_role_arn exists as a plain string here and nothing in this
#             module knows what an ARN is.
#
#  A hospital using their own certificate authority sets issuer_kind to
#  ClusterIssuer with a CA issuer and never touches Let's Encrypt.
# =============================================================================

resource "helm_release" "cert_manager" {
  name       = "cert-manager"
  repository = "https://charts.jetstack.io"
  chart      = "cert-manager"
  version    = var.chart_version
  namespace  = var.namespace

  create_namespace = var.create_namespace
  atomic           = true
  wait             = true
  timeout          = 600

  values = [yamlencode({
    crds = {
      enabled = true
      keep    = true # a CRD deletion takes every Certificate with it
    }
    replicaCount = var.replica_count
    resources = {
      requests = { cpu = "50m", memory = "128Mi" }
      limits   = { memory = "256Mi" }
    }
    prometheus = {
      enabled = var.metrics_enabled
      servicemonitor = {
        enabled = var.service_monitor_enabled
      }
    }
    # Empty on the portable profile. The aws environment passes the IRSA
    # annotation in, so this module stays provider-agnostic.
    serviceAccount = {
      annotations = var.service_account_annotations
    }
    webhook = {
      timeoutSeconds = 30
    }
    extraArgs = var.dns01_enabled ? [
      "--dns01-recursive-nameservers-only",
      "--dns01-recursive-nameservers=8.8.8.8:53,1.1.1.1:53",
    ] : []
  })]
}

# ClusterIssuers are applied as raw manifests because the CRDs do not exist
# until the release above has converged, and a typed resource would fail plan.
resource "kubectl_manifest" "issuer_staging" {
  count      = var.acme_enabled ? 1 : 0
  depends_on = [helm_release.cert_manager]

  yaml_body = yamlencode({
    apiVersion = "cert-manager.io/v1"
    kind       = "ClusterIssuer"
    metadata   = { name = "letsencrypt-staging" }
    spec = {
      acme = {
        server = "https://acme-staging-v02.api.letsencrypt.org/directory"
        email  = var.acme_email
        privateKeySecretRef = { name = "letsencrypt-staging-key" }
        solvers = local.solvers
      }
    }
  })
}

resource "kubectl_manifest" "issuer_prod" {
  count      = var.acme_enabled ? 1 : 0
  depends_on = [helm_release.cert_manager]

  yaml_body = yamlencode({
    apiVersion = "cert-manager.io/v1"
    kind       = "ClusterIssuer"
    metadata   = { name = "letsencrypt-prod" }
    spec = {
      acme = {
        server = "https://acme-v02.api.letsencrypt.org/directory"
        email  = var.acme_email
        privateKeySecretRef = { name = "letsencrypt-prod-key" }
        solvers = local.solvers
      }
    }
  })
}

locals {
  solvers = var.dns01_enabled ? [
    {
      dns01 = {
        route53 = {
          region       = var.dns01_region
          hostedZoneID = var.dns01_hosted_zone_id
          role         = var.solver_role_arn
        }
      }
    }
    ] : [
    {
      http01 = {
        ingress = {
          class = var.ingress_class
        }
      }
    }
  ]
}
