terraform {
  required_version = ">= 1.9"
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.35"
    }
  }
}

# No aws provider. Not here, not in any module under modules/kubernetes.
# CI greps for one and fails the build if it appears.
