variable "region" {
  type = string
  description = "The region where you want to deploy your resources"
}

variable "client_id" {
  type = string
  description = "Cognito client id"
}
variable "client_secret" {
  type = string
  description = "Cognito client secret"
}

variable "image" {
  type = string
  description = "the image used"
  default = "nginx:latest"
}