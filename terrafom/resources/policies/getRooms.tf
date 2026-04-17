# Create & Assume Role
resource "aws_iam_role" "get_rooms_role" {
  name = "get_rooms_role"
  assume_role_policy = data.aws_iam_policy_document.get_rooms_trust.json
}
data "aws_iam_policy_document" "get_rooms_trust" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}
# Add Permissions
data "aws_iam_policy_document" "get_rooms_permissions" {
  statement {
    sid = "1"
    actions = ["dynamodb:GetItem"]
    resources = [var.connection_table,var.chat_room_table]
  }
  statement {
    sid = "2"
    actions = ["dynamodb:Query"]
    resources = [var.user_room_table]
  }
  statement {
    sid = "3"
    actions = ["execute-api:ManageConnections"]
    resources = ["${var.apigw_execution_arn}/*/*/@connections/*"]
  }
}

resource "aws_lambda_permission" "get_rooms_allow_apigw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = "GetRooms"
  principal     = "apigateway.amazonaws.com"

  source_arn = "${var.apigw_execution_arn}/*"
}

resource "aws_iam_role_policy_attachment" "get_rooms_policy_attachement" {
  role       = aws_iam_role.get_rooms_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Attach the policy to the role
resource "aws_iam_role_policy" "get_rooms_policy" {
  name   = "get_rooms_policy"
  role   = aws_iam_role.get_rooms_role.id
  policy = data.aws_iam_policy_document.get_rooms_permissions.json
}