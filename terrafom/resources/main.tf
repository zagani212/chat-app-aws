terraform {
  backend "s3" {
    bucket = "my-terraform-state-bucket-775698064297-eu-west-2"
    key = "chat-app/terraform.tfstate"
    region = "eu-west-2"
    dynamodb_table = "terraform-state-lock"
    encrypt = true
  }
}