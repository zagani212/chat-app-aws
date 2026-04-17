resource "aws_apigatewayv2_integration" "is_typing_integration" {
  api_id           = aws_apigatewayv2_api.chat_api.id
  integration_type = "AWS_PROXY"

  integration_method        = "POST"
  integration_uri           = var.is_typing
}

resource "aws_apigatewayv2_route" "is_typing" {
  api_id    = aws_apigatewayv2_api.chat_api.id
  route_key = "isTyping"
  target = "integrations/${aws_apigatewayv2_integration.is_typing_integration.id}"
}