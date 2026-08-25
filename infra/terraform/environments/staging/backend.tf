terraform {
  backend "s3" {
    bucket = "atelier-tfstate-ap-south-1"
    key    = "env/staging/terraform.tfstate"
    region = "ap-south-1"

    dynamodb_table = "atelier-tfstate-lock"
    encrypt        = true
    kms_key_id     = "alias/atelier-tfstate"
  }
}
