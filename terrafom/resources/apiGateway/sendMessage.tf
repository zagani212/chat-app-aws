resource "aws_apigatewayv2_integration" "send_messages_integration" {
  api_id           = aws_apigatewayv2_api.chat_api.id
  integration_type = "AWS_PROXY"

  integration_method        = "POST"
  integration_uri           = var.send_messages
}

resource "aws_apigatewayv2_route" "send_messages" {
  api_id    = aws_apigatewayv2_api.chat_api.id
  route_key = "sendMessage"
  target = "integrations/${aws_apigatewayv2_integration.send_messages_integration.id}"
}