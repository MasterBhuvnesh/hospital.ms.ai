terraform {
  required_version = ">= 1.9"

  required_providers {
    kubernetes = { source = "hashicorp/kubernetes", version = "~> 2.35" }
    helm       = { source = "hashicorp/helm", version = "~> 3.0" }
    kubectl    = { source = "alekc/kubectl", version = "~> 2.1" }
  }

  # Local state. This cluster is disposable by definition and there is nobody
  # to lock against.
  backend "local" {
    path = "terraform.tfstate"
  }
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

# No aws provider. That absence is the entire point of this environment.
