# Create & Assume Role
resource "aws_iam_role" "is_typing_role" {
  name = "is_typing_role"
  assume_role_policy = data.aws_iam_policy_document.is_typing_trust.json
}
data "aws_iam_policy_document" "is_typing_trust" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}
# Add Permissions
data "aws_iam_policy_document" "is_typing_permissions" {
  statement {
    sid = "1"
    actions = ["dynamodb:GetItem"]
    resources = [var.connection_table]
  }
  statement {
    sid = "2"
    actions = ["dynamodb:Query"]
    resources = ["${var.chat_room_table}/index/GSI1","${var.connection_table}/index/GSI1"]
  }
  statement {
    sid = "3"
    actions = ["execute-api:ManageConnections"]
    resources = ["${var.apigw_execution_arn}/*/*/@connections/*"]
  }
}

resource "aws_lambda_permission" "is_typing_allow_apigw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = "isTyping"
  principal     = "apigateway.amazonaws.com"

  source_arn = "${var.apigw_execution_arn}/*"
}

resource "aws_iam_role_policy_attachment" "is_typing_policy_attachement" {
  role       = aws_iam_role.is_typing_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Attach the policy to the role
resource "aws_iam_role_policy" "is_typing_policy" {
  name   = "is_typing_policy"
  role   = aws_iam_role.is_typing_role.id
  policy = data.aws_iam_policy_document.is_typing_permissions.json
}