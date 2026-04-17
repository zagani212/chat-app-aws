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
  
  chat_room_table = module.dynamodb.chat_room_table
  connection_table = module.dynamodb.connection_table
  message_table = module.dynamodb.message_table
  user_table = module.dynamodb.user_table
  user_room_table = module.dynamodb.user_room_table

  apigw_execution_arn = module.api_gateway.execution_arn
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

  env_variables = {
    CLIENT_ID = module.cognito.client_id
    USER_POOL_ID   = module.cognito.user_pool_id
  }
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
  iam_role = module.iam_role.send_message_role
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

module "dynamodb" {
  source = "./dynamodb"
}

module "api_gateway" {
  source = "./apiGateway"

  connect = module.ConnectionHandler.arn
  disconnect = module.DisconnectHandler.arn
  create_room = module.CreateRoom.arn
  get_messages = module.GetMessages.arn
  get_rooms = module.GetRooms.arn
  is_typing = module.isTyping.arn
  leave_room = module.LeaveRoom.arn
  list_users = module.GetAllUsers.arn
  send_messages = module.SendMessage.arn
}

module "cognito" {
  source = "./cognito"

  client_id = var.client_id
  client_secret = var.client_secret
}

module "ecr" {
  source = "./ecr"
}

module "ecs" {
  source = "./ecs"
  image = var.image
}