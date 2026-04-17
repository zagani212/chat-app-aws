resource "aws_apigatewayv2_integration" "leave_room_integration" {
  api_id           = aws_apigatewayv2_api.chat_api.id
  integration_type = "AWS_PROXY"

  integration_method        = "POST"
  integration_uri           = var.leave_room
}

resource "aws_apigatewayv2_route" "leave_room" {
  api_id    = aws_apigatewayv2_api.chat_api.id
  route_key = "leaveRoom"
  target = "integrations/${aws_apigatewayv2_integration.leave_room_integration.id}"
}