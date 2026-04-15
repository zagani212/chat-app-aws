resource "aws_s3_bucket" "tf_state" {
  bucket = format("my-terraform-state-bucket-%s-%s", var.account_id, var.region)
}