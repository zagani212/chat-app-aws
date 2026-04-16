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

  source_dir = "../../backend/layer"
  layer_name = "postToConnection"
  runtimes = ["nodejs20.x"]
}

module "iam_role" {
  source = "./policies"
}

module "GetRooms" {
  source = "./lambda"

  source_file = "../../backend/GetRooms.mjs"
  function_name = "GetRooms"
  iam_role = module.iam_role.get_rooms_role
  layer_arn = module.lambda_layer.layer_arn
  handler = "GetRooms.handler"
}

module "DisconnectHandler" {
  source = "./lambda"

  source_file = "../../backend/DisconnectHandler.mjs"
  function_name = "DisconnectHandler"
  iam_role = module.iam_role.disconnect_handler_role
  layer_arn = module.lambda_layer.layer_arn
  handler = "DisconnectHandler.handler"
}

module "ConnectionHandler" {
  source = "./lambda"

  source_dir = "../../auth-lambda"
  function_name = "ConnectionHandler"
  iam_role = module.iam_role.connection_handler_role
  layer_arn = module.lambda_layer.layer_arn
  handler = "index.handler"
}

module "isTyping" {
  source = "./lambda"

  source_file = "../../backend/Typing.mjs"
  function_name = "isTyping"
  iam_role = module.iam_role.is_typing_role
  layer_arn = module.lambda_layer.layer_arn
  handler = "Typing.handler"
}

module "CreateRoom" {
  source = "./lambda"

  source_file = "../../backend/CreateRoom.mjs"
  function_name = "CreateRoom"
  iam_role = module.iam_role.create_room_role
  layer_arn = module.lambda_layer.layer_arn
  handler = "CreateRoom.handler"
}

module "RegisterNewUser" {
  source = "./lambda"

  source_file = "../../backend/RegisterNewUser.mjs"
  function_name = "RegisterNewUser"
  iam_role = module.iam_role.register_new_user_role
  handler = "RegisterNewUser.handler"
}

module "GetMessages" {
  source = "./lambda"

  source_file = "../../backend/GetMessages.mjs"
  function_name = "GetMessages"
  iam_role = module.iam_role.get_message_role
  layer_arn = module.lambda_layer.layer_arn
  handler = "GetMessages.handler"
}

module "LeaveRoom" {
  source = "./lambda"

  source_file = "../../backend/LeaveRoom.mjs"
  function_name = "LeaveRoom"
  iam_role = module.iam_role.leave_room_role
  layer_arn = module.lambda_layer.layer_arn
  handler = "LeaveRoom.handler"
}

module "SendMessage" {
  source = "./lambda"

  source_file = "../../backend/SendMessage.mjs"
  function_name = "SendMessage"
  iam_role = module.iam_role.leave_room_role
  layer_arn = module.lambda_layer.layer_arn
  handler = "SendMessage.handler"
}

module "GetAllUsers" {
  source = "./lambda"

  source_file = "../../backend/GetAllUsers.mjs"
  function_name = "GetAllUsers"
  iam_role = module.iam_role.get_all_users_role
  layer_arn = module.lambda_layer.layer_arn
  handler = "GetAllUsers.handler"
}