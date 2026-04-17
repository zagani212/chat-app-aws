resource "aws_apigatewayv2_integration" "list_users_integration" {
  api_id           = aws_apigatewayv2_api.chat_api.id
  integration_type = "AWS_PROXY"

  integration_method        = "POST"
  integration_uri           = var.list_users
}

resource "aws_apigatewayv2_route" "list_users" {
  api_id    = aws_apigatewayv2_api.chat_api.id
  route_key = "listUsers"
  target = "integrations/${aws_apigatewayv2_integration.list_users_integration.id}"
}