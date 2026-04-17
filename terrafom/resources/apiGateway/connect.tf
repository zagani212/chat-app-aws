resource "aws_apigatewayv2_integration" "connect_integration" {
  api_id           = aws_apigatewayv2_api.chat_api.id
  integration_type = "AWS_PROXY"

  integration_method        = "POST"
  integration_uri           = var.connect
}

resource "aws_apigatewayv2_route" "connect" {
  api_id    = aws_apigatewayv2_api.chat_api.id
  route_key = "$connect"
  target = "integrations/${aws_apigatewayv2_integration.connect_integration.id}"
}