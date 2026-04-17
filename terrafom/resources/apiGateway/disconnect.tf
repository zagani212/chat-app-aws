resource "aws_apigatewayv2_integration" "disconnect_integration" {
  api_id           = aws_apigatewayv2_api.chat_api.id
  integration_type = "AWS_PROXY"

  integration_method        = "POST"
  integration_uri           = var.disconnect
}

resource "aws_apigatewayv2_route" "disconnect" {
  api_id    = aws_apigatewayv2_api.chat_api.id
  route_key = "$disconnect"
  target = "integrations/${aws_apigatewayv2_integration.disconnect_integration.id}"
}