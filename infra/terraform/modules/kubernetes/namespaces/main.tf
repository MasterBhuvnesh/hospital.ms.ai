locals {
  namespaces = {
    for env in var.environments : "hms-${env}" => {
      environment = env
    }
  }
}

resource "kubernetes_namespace" "hms" {
  for_each = local.namespaces

  metadata {
    name = each.key
    labels = merge(
      {
        "kubernetes.io/metadata.name"  = each.key
        "app.kubernetes.io/part-of"    = "hms"
        "atelier.health/environment"   = each.value.environment
        "app.kubernetes.io/managed-by" = "terraform"
      },
      # Pod Security Admission. Every service already runs non-root with a
      # read-only root filesystem, so restricted costs nothing and catches the
      # one workload that forgets.
      var.pod_security_standard == "" ? {} : {
        "pod-security.kubernetes.io/enforce"         = var.pod_security_standard
        "pod-security.kubernetes.io/enforce-version" = "latest"
        "pod-security.kubernetes.io/audit"           = var.pod_security_standard
        "pod-security.kubernetes.io/warn"            = var.pod_security_standard
      }
    )
  }
}

# Supporting namespaces for the platform components. Separate from the app
# namespaces so that deleting an environment never touches the ingress
# controller or the secret store.
resource "kubernetes_namespace" "platform" {
  for_each = toset(var.platform_namespaces)

  metadata {
    name = each.value
    labels = {
      "kubernetes.io/metadata.name"  = each.value
      "app.kubernetes.io/part-of"    = "hms-platform"
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }
}

# A quota exists so a runaway autoscaler cannot starve the observability stack
# of schedulable capacity. These numbers are headroom, not a target.
resource "kubernetes_resource_quota" "hms" {
  for_each = var.resource_quotas

  metadata {
    name      = "${each.key}-quota"
    namespace = kubernetes_namespace.hms[each.key].metadata[0].name
  }

  spec {
    hard = each.value
  }
}

resource "kubernetes_limit_range" "hms" {
  for_each = local.namespaces

  metadata {
    name      = "${each.key}-limits"
    namespace = kubernetes_namespace.hms[each.key].metadata[0].name
  }

  spec {
    limit {
      type = "Container"
      default = {
        memory = "512Mi"
      }
      default_request = {
        cpu    = "100m"
        memory = "256Mi"
      }
      max = {
        memory = "2Gi"
      }
    }
  }
}
