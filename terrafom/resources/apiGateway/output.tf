output "execution_arn" {
  value = aws_apigatewayv2_api.chat_api.execution_arn
}

output "invoke_url" {
  value = aws_apigatewayv2_stage.dev.invoke_url
}