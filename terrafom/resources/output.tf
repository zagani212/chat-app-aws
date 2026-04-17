output "cognito_domain" {
  value = module.cognito.cognito_domain
}

output "cognito_client_id" {
  value = module.cognito.client_id
}

output "repository_url" {
  value = module.ecr.repository_url
}

output "apigw_invoke_url" {
  value = module.api_gateway.invoke_url
}