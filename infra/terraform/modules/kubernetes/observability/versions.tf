terraform {
  required_version = ">= 1.9"
  required_providers {
    helm       = { source = "hashicorp/helm", version = "~> 3.0" }
    kubernetes = { source = "hashicorp/kubernetes", version = "~> 2.35" }
    kubectl    = { source = "alekc/kubectl", version = "~> 2.1" }
    random     = { source = "hashicorp/random", version = "~> 3.6" }
  }
}
