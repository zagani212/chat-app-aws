# Create & Assume Role
resource "aws_iam_role" "get_message_role" {
  name = "get_message_role"
  assume_role_policy = data.aws_iam_policy_document.get_message_trust.json
}
data "aws_iam_policy_document" "get_message_trust" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}
# Add Permissions
data "aws_iam_policy_document" "get_message_permissions" {
  statement {
    sid = "1"
    actions = ["dynamodb:Query"]
    resources = [var.user_room_table, var.message_table]
  }
  statement {
    sid = "2"
    actions = ["dynamodb:GetItem"]
    resources = [var.connection_table]
  }
  statement {
    sid = "3"
    actions = ["execute-api:ManageConnections"]
    resources = ["arn:aws:execute-api:eu-west-3:775698064297:xizfuecqnl/*"]
  }
}

resource "aws_iam_role_policy_attachment" "get_message_policy_attachement" {
  role       = aws_iam_role.get_message_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Attach the policy to the role
resource "aws_iam_role_policy" "get_message_policy" {
  name   = "get_message_policy"
  role   = aws_iam_role.get_message_role.id
  policy = data.aws_iam_policy_document.get_message_permissions.json
}