resource "aws_apigatewayv2_api" "chat_api" {
  name                       = "chat-api"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"
}

resource "aws_apigatewayv2_stage" "dev" {
  api_id = aws_apigatewayv2_api.chat_api.id
  name   = "dev"
  auto_deploy = true
}