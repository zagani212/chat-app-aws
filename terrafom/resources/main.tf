terraform {
  backend "s3" {
    bucket = "my-terraform-state-bucket-775698064297-eu-west-2"
    key = "chat-app/terraform.tfstate"
    region = "eu-west-2"
    dynamodb_table = "terraform-state-lock"
    encrypt = true
  }
}

module "lambda_layer" {
  source = "./lambdaLayer"

  source_file = "../../backend/layer/nodejs/PostToConnection.mjs"
  layer_name = "postToConnection"
  runtimes = ["nodejs20.x"]
}

module "lambda_function" {
  source = "./lambda"

  source_file = "../../backend/GetRooms.mjs"
  function_name = "GetRooms"
  layer_arn = module.lambda_layer.layer_arn
  handler = "GetRooms.handler"
}