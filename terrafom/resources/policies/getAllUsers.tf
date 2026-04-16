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
    resources = ["arn:aws:dynamodb:eu-west-3:775698064297:table/User"]
  }
  statement {
    sid = "3"
    actions = ["execute-api:ManageConnections"]
    resources = ["arn:aws:execute-api:eu-west-3:775698064297:xizfuecqnl/*"]
  }
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