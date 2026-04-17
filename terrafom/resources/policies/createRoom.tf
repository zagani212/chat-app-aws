# Create & Assume Role
resource "aws_iam_role" "create_room_role" {
  name = "create_room_role"
  assume_role_policy = data.aws_iam_policy_document.create_room_trust.json
}
data "aws_iam_policy_document" "create_room_trust" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}
# Add Permissions
data "aws_iam_policy_document" "create_room_permissions" {
  statement {
    sid = "1"
    actions = ["dynamodb:PutItem"]
    resources = [var.chat_room_table, var.user_room_table]
  }
  statement {
    sid = "2"
    actions = ["dynamodb:BatchGetItem"]
    resources = [var.user_table]
  }
  statement {
    sid = "3"
    actions = ["dynamodb:Query", "dynamodb:GetItem"]
    resources = [var.connection_table]
  }
  statement {
    sid = "4"
    actions = ["dynamodb:Query"]
    resources = ["${var.connection_table}/index/*"]
  }
  statement {
    sid = "5"
    actions = ["execute-api:ManageConnections"]
    resources = ["${var.apigw_execution_arn}/*/*/@connections/*"]
  }
}

resource "aws_lambda_permission" "create_room_allow_apigw" {
  action        = "lambda:InvokeFunction"
  function_name = "CreateRoom"
  principal     = "apigateway.amazonaws.com"

  source_arn = "${var.apigw_execution_arn}/*/*"
}

resource "aws_iam_role_policy_attachment" "create_room_policy_attachement" {
  role       = aws_iam_role.create_room_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Attach the policy to the role
resource "aws_iam_role_policy" "create_room_policy" {
  name   = "create_room_policy"
  role   = aws_iam_role.create_room_role.id
  policy = data.aws_iam_policy_document.create_room_permissions.json
}