data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = var.source_file
  output_path = "./zip/layer.zip"
}

resource "aws_lambda_layer_version" "post_to_connection" {
  filename   = data.archive_file.lambda_zip.output_path
  layer_name = var.layer_name

  compatible_runtimes = var.runtimes
}