terraform {
  required_version = ">= 1.9"

  required_providers {
    kubernetes = { source = "hashicorp/kubernetes", version = "~> 2.35" }
    helm       = { source = "hashicorp/helm", version = "~> 3.0" }
    kubectl    = { source = "alekc/kubectl", version = "~> 2.1" }
  }

  # Deliberately not configured. A customer picks their own: a local file,
  # their own S3-compatible object store, Postgres, Consul, or Terraform Cloud.
  # Hardcoding an S3 backend here would be the one AWS dependency in an
  # environment whose entire purpose is not having one.
  #
  # backend "local" {}
}

provider "kubernetes" {
  config_path    = var.kubeconfig_path
  config_context = var.kube_context
}

provider "helm" {
  kubernetes = {
    config_path    = var.kubeconfig_path
    config_context = var.kube_context
  }
}

provider "kubectl" {
  config_path      = var.kubeconfig_path
  config_context   = var.kube_context
  load_config_file = true
}

# NO AWS PROVIDER. A customer running this needs a kubeconfig and nothing else.
