# =============================================================================
#  Remote state.
#
#  Versioned, encrypted with a dedicated CMK, public access blocked, and locked
#  through DynamoDB so two applies cannot interleave.
#
#  On DynamoDB: anti-lock-in rule 3 forbids DynamoDB anywhere in the product,
#  and the product does not touch it. State locking is tooling, not application
#  data, and a customer running the portable profile never reaches this file.
#  It is the one place the name appears in the repository, on purpose.
#
#  PRODUCTION IS APPLIED FROM CI ONLY, through a reviewed pull request. The
#  GitHub Actions OIDC role is the sole principal with write access to this
#  state. No local applies.
# =============================================================================

terraform {
  backend "s3" {
    bucket = "atelier-tfstate-ap-south-1"
    key    = "env/production/terraform.tfstate"
    region = "ap-south-1"

    dynamodb_table = "atelier-tfstate-lock"
    encrypt        = true
    kms_key_id     = "alias/atelier-tfstate"
  }
}
