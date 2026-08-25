variable "name" {
  type = string
}

variable "deletion_window_in_days" {
  description = "30. A short window plus a quiet week is an unrecoverable database."
  type        = number
  default     = 30

  validation {
    condition     = var.deletion_window_in_days >= 30
    error_message = "Use at least 30 days. These keys protect clinical records."
  }
}

variable "additional_key_policy_statements" {
  type    = list(any)
  default = []
}

variable "tags" {
  type    = map(string)
  default = {}
}
