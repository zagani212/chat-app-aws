# Create & Assume Role
resource "aws_iam_role" "send_message_role" {
  name = "send_message_role"
  assume_role_policy = data.aws_iam_policy_document.send_message_trust.json
}
data "aws_iam_policy_document" "send_message_trust" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}
# Add Permissions
data "aws_iam_policy_document" "send_message_permissions" {
  statement {
    sid = "1"
    actions = ["dynamodb:GetItem"]
    resources = [var.user_table, var.chat_room_table, var.connection_table]
  }
  statement {
    sid = "2"
    actions = ["dynamodb:PutItem"]
    resources = [var.message_table]
  }
  statement {
    sid = "3"
    actions = ["dynamodb:Query"]
    resources = ["${var.chat_room_table}/index/*", "${var.connection_table}/index/*"]
  }
  statement {
    sid = "5"
    actions = ["execute-api:ManageConnections"]
    resources = ["${var.apigw_execution_arn}/*/*/@connections/*"]
  }
}

resource "aws_lambda_permission" "send_message_allow_apigw" {
  action        = "lambda:InvokeFunction"
  function_name = "SendMessage"
  principal     = "apigateway.amazonaws.com"

  source_arn = "${var.apigw_execution_arn}/*/*"
}

resource "aws_iam_role_policy_attachment" "send_message_policy_attachement" {
  role       = aws_iam_role.send_message_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Attach the policy to the role
resource "aws_iam_role_policy" "send_message_policy" {
  name   = "send_message_policy"
  role   = aws_iam_role.send_message_role.id
  policy = data.aws_iam_policy_document.send_message_permissions.json
}