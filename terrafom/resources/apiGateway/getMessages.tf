resource "aws_apigatewayv2_integration" "get_messages_integration" {
  api_id           = aws_apigatewayv2_api.chat_api.id
  integration_type = "AWS_PROXY"

  integration_method        = "POST"
  integration_uri           = var.get_messages
}

resource "aws_apigatewayv2_route" "get_messages" {
  api_id    = aws_apigatewayv2_api.chat_api.id
  route_key = "getMessages"
  target = "integrations/${aws_apigatewayv2_integration.get_messages_integration.id}"
}