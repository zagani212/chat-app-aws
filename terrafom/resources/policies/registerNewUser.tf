# Create & Assume Role
resource "aws_iam_role" "register_new_user_role" {
  name = "register_new_user_role"
  assume_role_policy = data.aws_iam_policy_document.register_new_user_trust.json
}
data "aws_iam_policy_document" "register_new_user_trust" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}
# Add Permissions
data "aws_iam_policy_document" "register_new_user_permissions" {
  statement {
    sid = "1"
    actions = ["dynamodb:PutItem"]
    resources = [var.user_table]
  }
}

resource "aws_iam_role_policy_attachment" "register_new_user_policy_attachement" {
  role       = aws_iam_role.register_new_user_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Attach the policy to the role
resource "aws_iam_role_policy" "register_new_user_policy" {
  name   = "register_new_user_policy"
  role   = aws_iam_role.register_new_user_role.id
  policy = data.aws_iam_policy_document.register_new_user_permissions.json
}