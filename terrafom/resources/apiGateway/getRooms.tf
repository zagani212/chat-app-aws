resource "aws_apigatewayv2_integration" "get_rooms_integration" {
  api_id           = aws_apigatewayv2_api.chat_api.id
  integration_type = "AWS_PROXY"

  integration_method        = "POST"
  integration_uri           = var.get_rooms
}

resource "aws_apigatewayv2_route" "get_rooms" {
  api_id    = aws_apigatewayv2_api.chat_api.id
  route_key = "getRooms"
  target = "integrations/${aws_apigatewayv2_integration.get_rooms_integration.id}"
}