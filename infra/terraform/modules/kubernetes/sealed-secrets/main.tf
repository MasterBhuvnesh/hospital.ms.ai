# =============================================================================
#  Sealed Secrets. Secret delivery where External Secrets has no backing store.
#
#  This is the floor of the secrets story: a hospital with one cluster, no
#  Vault, and no cloud account still needs a way to put a database password
#  into a pod without committing it. A SealedSecret is encrypted to this
#  controller's public key, so the ciphertext is safe in git and useless in any
#  other cluster.
#
#  BACKUP THE CONTROLLER KEY. Losing it means every sealed secret in git is
#  unrecoverable and each one has to be resealed by hand. The output below
#  names the secret to back up; the backup itself is an operator task, on
#  purpose, because writing a private key to Terraform state would put it in
#  the state file in plaintext.
# =============================================================================

resource "helm_release" "sealed_secrets" {
  name       = "sealed-secrets"
  repository = "https://bitnami-labs.github.io/sealed-secrets"
  chart      = "sealed-secrets"
  version    = var.chart_version
  namespace  = var.namespace

  create_namespace = var.create_namespace
  atomic           = true
  wait             = true
  timeout          = 300

  values = [yamlencode({
    fullnameOverride = "sealed-secrets-controller"
    resources = {
      requests = { cpu = "50m", memory = "64Mi" }
      limits   = { memory = "128Mi" }
    }
    metrics = {
      serviceMonitor = {
        enabled = var.service_monitor_enabled
      }
    }
    # Rotate the sealing key on a schedule. Existing sealed secrets keep
    # working: the controller retains old keys for decryption.
    keyrenewperiod = var.key_renew_period
    securityContext = {
      runAsNonRoot = true
      runAsUser    = 1001
      readOnlyRootFilesystem = true
    }
  })]
}
