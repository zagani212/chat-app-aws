# Create & Assume Role
resource "aws_iam_role" "disconnect_handler_role" {
  name = "disconnect_handler_role"
  assume_role_policy = data.aws_iam_policy_document.disconnect_handler_trust.json
}
data "aws_iam_policy_document" "disconnect_handler_trust" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}
# Add Permissions
data "aws_iam_policy_document" "disconnect_handler_permissions" {
  statement {
    sid = "1"
    actions = ["dynamodb:DeleteItem", "dynamodb:Scan"]
    resources = ["arn:aws:dynamodb:eu-west-3:775698064297:table/Connection"]
  }
  statement {
    sid = "2"
    actions = ["dynamodb:Query"]
    resources = ["arn:aws:dynamodb:eu-west-3:775698064297:table/Connection/index/GSI1"]
  }
  statement {
    sid = "3"
    actions = ["execute-api:ManageConnections"]
    resources = ["arn:aws:execute-api:eu-west-3:775698064297:xizfuecqnl/*"]
  }
}

resource "aws_iam_role_policy_attachment" "disconnect_handler_policy_attachement" {
  role       = aws_iam_role.disconnect_handler_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Attach the policy to the role
resource "aws_iam_role_policy" "disconnect_handler_policy" {
  name   = "disconnect_handler_policy"
  role   = aws_iam_role.disconnect_handler_role.id
  policy = data.aws_iam_policy_document.disconnect_handler_permissions.json
}