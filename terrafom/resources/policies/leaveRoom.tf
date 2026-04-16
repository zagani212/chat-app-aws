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
    resources = ["arn:aws:dynamodb:eu-west-3:775698064297:table/Connection"]
  }
  statement {
    sid = "2"
    actions = ["dynamodb:Query"]
    resources = ["arn:aws:dynamodb:eu-west-3:775698064297:table/Message", "arn:aws:dynamodb:eu-west-3:775698064297:table/ChatRoom/index/GSI1","arn:aws:dynamodb:eu-west-3:775698064297:table/Connection/index/GSI1"]
  }
  statement {
    sid = "3"
    actions = ["dynamodb:BatchWriteItem"]
    resources = ["arn:aws:dynamodb:eu-west-3:775698064297:table/Message"]
  }
  statement {
    sid = "4"
    actions = ["dynamodb:DeleteItem", "dynamodb:PutItem"]
    resources = ["arn:aws:dynamodb:eu-west-3:775698064297:table/ChatRoom"]
  }
  statement {
    sid = "5"
    actions = ["dynamodb:DeleteItem"]
    resources = ["arn:aws:dynamodb:eu-west-3:775698064297:table/UserRoom"]
  }
  statement {
    sid = "6"
    actions = ["execute-api:ManageConnections"]
    resources = ["arn:aws:execute-api:eu-west-3:775698064297:xizfuecqnl/*"]
  }
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