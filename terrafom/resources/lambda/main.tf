data "archive_file" "from_file" {
  count = var.source_file != null ? 1 : 0
  type        = "zip"
  source_file = var.source_file
  output_path = format("./zip/%s.zip", var.function_name)
}
data "archive_file" "from_dir" {
  count = var.source_dir != null ? 1 : 0
  type        = "zip"
  source_dir = var.source_dir
  output_path = format("./zip/%s.zip", var.function_name)
}

locals {
  lambda_zip_path = coalesce(
    try(data.archive_file.from_file[0], null),
    try(data.archive_file.from_dir[0], null)
  )
}

resource "aws_lambda_function" "my_lambda" {
  function_name = var.function_name

  runtime = "nodejs24.x"
  handler = var.handler
  layers = var.layer_arn == null ? [] : [var.layer_arn]

  filename         = local.lambda_zip_path.output_path
  source_code_hash = local.lambda_zip_path.output_base64sha256

  role = var.iam_role
}