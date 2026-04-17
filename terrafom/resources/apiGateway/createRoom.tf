resource "aws_apigatewayv2_integration" "create_room_integration" {
  api_id           = aws_apigatewayv2_api.chat_api.id
  integration_type = "AWS_PROXY"

  integration_method        = "POST"
  integration_uri           = var.create_room
}

resource "aws_apigatewayv2_route" "create_room" {
  api_id    = aws_apigatewayv2_api.chat_api.id
  route_key = "createRoom"
  target = "integrations/${aws_apigatewayv2_integration.create_room_integration.id}"
}