# =============================================================================
#  External Secrets Operator, plus one ClusterSecretStore.
#
#  The backend is a variable: kubernetes, vault, aws, gcp or azure. The
#  application never learns which one it got. It reads process environment,
#  exactly as it does under Compose on a laptop.
#
#  That indirection is the entire reason a hospital can run this platform with
#  no cloud account: the secrets story changes backend, not shape.
# =============================================================================

resource "helm_release" "external_secrets" {
  name       = "external-secrets"
  repository = "https://charts.external-secrets.io"
  chart      = "external-secrets"
  version    = var.chart_version
  namespace  = var.namespace

  create_namespace = var.create_namespace
  atomic           = true
  wait             = true
  timeout          = 600

  values = [yamlencode({
    installCRDs  = true
    replicaCount = var.replica_count
    resources = {
      requests = { cpu = "50m", memory = "128Mi" }
      limits   = { memory = "256Mi" }
    }
    serviceMonitor = {
      enabled = var.service_monitor_enabled
    }
    serviceAccount = {
      name = var.service_account_name
      # On AWS this carries the IRSA role permitting
      # secretsmanager:GetSecretValue on hms/<env>/* and nothing else.
      # Empty everywhere else.
      annotations = var.service_account_annotations
    }
    webhook = {
      resources = {
        requests = { cpu = "20m", memory = "64Mi" }
        limits   = { memory = "128Mi" }
      }
    }
    certController = {
      resources = {
        requests = { cpu = "20m", memory = "64Mi" }
        limits   = { memory = "128Mi" }
      }
    }
  })]
}

locals {
  provider_block = {
    aws = {
      aws = {
        service = "SecretsManager"
        region  = var.aws_region
        auth = {
          jwt = {
            serviceAccountRef = {
              name      = var.service_account_name
              namespace = var.namespace
            }
          }
        }
      }
    }

    vault = {
      vault = {
        server  = var.vault_address
        path    = var.vault_mount
        version = "v2"
        auth = {
          kubernetes = {
            mountPath = "kubernetes"
            role      = var.vault_role
            serviceAccountRef = {
              name      = var.service_account_name
              namespace = var.namespace
            }
          }
        }
      }
    }

    kubernetes = {
      kubernetes = {
        remoteNamespace = var.kubernetes_remote_namespace
        auth = {
          serviceAccount = {
            name      = var.service_account_name
            namespace = var.namespace
          }
        }
        server = {
          caProvider = {
            type      = "ConfigMap"
            name      = "kube-root-ca.crt"
            namespace = var.namespace
            key       = "ca.crt"
          }
        }
      }
    }
  }
}

resource "kubectl_manifest" "cluster_secret_store" {
  count      = var.create_store ? 1 : 0
  depends_on = [helm_release.external_secrets]

  yaml_body = yamlencode({
    apiVersion = "external-secrets.io/v1beta1"
    kind       = "ClusterSecretStore"
    metadata = {
      name = var.store_name
    }
    spec = {
      provider = local.provider_block[var.backend]
    }
  })
}
