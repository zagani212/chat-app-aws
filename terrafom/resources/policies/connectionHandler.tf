# Create & Assume Role
resource "aws_iam_role" "connection_handler_role" {
  name = "connection_handler_role"
  assume_role_policy = data.aws_iam_policy_document.connection_handler_trust.json
}
data "aws_iam_policy_document" "connection_handler_trust" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}
# Add Permissions
data "aws_iam_policy_document" "connection_handler_permissions" {
  statement {
    sid = "1"
    actions = ["dynamodb:PutItem", "dynamodb:Scan"]
    resources = [var.connection_table]
  }
  statement {
    sid = "2"
    actions = ["dynamodb:UpdateItem"]
    resources = [var.user_table]
  }
  statement {
    sid = "3"
    actions = ["execute-api:ManageConnections"]
    resources = ["${var.apigw_execution_arn}/*/*/@connections/*"]
  }
}

resource "aws_lambda_permission" "connection_handler_allow_apigw" {
  action        = "lambda:InvokeFunction"
  function_name = "ConnectionHandler"
  principal     = "apigateway.amazonaws.com"

  source_arn = "${var.apigw_execution_arn}/*/*"
}

resource "aws_iam_role_policy_attachment" "connection_handler_policy_attachement" {
  role       = aws_iam_role.connection_handler_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Attach the policy to the role
resource "aws_iam_role_policy" "connection_handler_policy" {
  name   = "connection_handler_policy"
  role   = aws_iam_role.connection_handler_role.id
  policy = data.aws_iam_policy_document.connection_handler_permissions.json
}