# Create & Assume Role
resource "aws_iam_role" "leave_room_role" {
  name = "leave_room_role"
  assume_role_policy = data.aws_iam_policy_document.leave_room_trust.json
}
data "aws_iam_policy_document" "leave_room_trust" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}
# Add Permissions
data "aws_iam_policy_document" "leave_room_permissions" {
  statement {
    sid = "1"
    actions = ["dynamodb:GetItem"]
    resources = [var.connection_table]
  }
  statement {
    sid = "2"
    actions = ["dynamodb:Query"]
    resources = [var.message_table, "${var.chat_room_table}/index/GSI1","${var.connection_table}/index/GSI1"]
  }
  statement {
    sid = "3"
    actions = ["dynamodb:BatchWriteItem"]
    resources = [var.message_table]
  }
  statement {
    sid = "4"
    actions = ["dynamodb:DeleteItem", "dynamodb:PutItem"]
    resources = [var.chat_room_table]
  }
  statement {
    sid = "5"
    actions = ["dynamodb:DeleteItem"]
    resources = [var.user_room_table]
  }
  statement {
    sid = "6"
    actions = ["execute-api:ManageConnections"]
    resources = ["${var.apigw_execution_arn}/*/*/@connections/*"]
  }
}

resource "aws_lambda_permission" "leave_room_allow_apigw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = "LeaveRoom"
  principal     = "apigateway.amazonaws.com"

  source_arn = "${var.apigw_execution_arn}/*"
}

resource "aws_iam_role_policy_attachment" "leave_room_policy_attachement" {
  role       = aws_iam_role.leave_room_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Attach the policy to the role
resource "aws_iam_role_policy" "leave_room_policy" {
  name   = "leave_room_policy"
  role   = aws_iam_role.leave_room_role.id
  policy = data.aws_iam_policy_document.leave_room_permissions.json
}