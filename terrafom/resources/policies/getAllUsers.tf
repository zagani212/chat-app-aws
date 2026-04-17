# Create & Assume Role
resource "aws_iam_role" "get_all_users_role" {
  name = "get_all_users_role"
  assume_role_policy = data.aws_iam_policy_document.get_all_users_trust.json
}
data "aws_iam_policy_document" "get_all_users_trust" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}
# Add Permissions
data "aws_iam_policy_document" "get_all_users_permissions" {
  statement {
    sid = "1"
    actions = ["dynamodb:Scan"]
    resources = [var.user_table]
  }
  statement {
    sid = "3"
    actions = ["execute-api:ManageConnections"]
    resources = ["${var.apigw_execution_arn}/*/*/@connections/*"]
  }
}

resource "aws_lambda_permission" "get_all_users_allow_apigw" {
  action        = "lambda:InvokeFunction"
  function_name = "GetAllUsers"
  principal     = "apigateway.amazonaws.com"

  source_arn = "${var.apigw_execution_arn}/*/*"
}

resource "aws_iam_role_policy_attachment" "get_all_users_policy_attachement" {
  role       = aws_iam_role.get_all_users_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Attach the policy to the role
resource "aws_iam_role_policy" "get_all_users_policy" {
  name   = "get_all_users_policy"
  role   = aws_iam_role.get_all_users_role.id
  policy = data.aws_iam_policy_document.get_all_users_permissions.json
}