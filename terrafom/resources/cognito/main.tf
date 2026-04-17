resource "aws_cognito_user_pool" "pool" {
  name = "mypool"
  auto_verified_attributes = ["email"]
  username_attributes      = ["email"]
}

resource "aws_cognito_user_pool_client" "client" {
  name = "client"

  depends_on = [
    aws_cognito_identity_provider.google
  ]

  user_pool_id = aws_cognito_user_pool.pool.id
  callback_urls                        = ["http://localhost:3000/callback"]
  logout_urls                        = ["http://localhost:3000/"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  supported_identity_providers         = ["COGNITO", "Google"]
}
resource "random_id" "suffix" {
  byte_length = 4
}

locals {
  domain = "myapp-auth-${random_id.suffix.hex}"
}

resource "aws_cognito_user_pool_domain" "domain" {
  domain       = local.domain
  # managed_login_version = 2
  user_pool_id = aws_cognito_user_pool.pool.id
}

resource "aws_cognito_identity_provider" "google" {
  user_pool_id  = aws_cognito_user_pool.pool.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    authorize_scopes = "openid email profile"
    client_id        = var.client_id
    client_secret    = var.client_secret
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
    name = "name"
  }
}