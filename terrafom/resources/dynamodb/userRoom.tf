resource "aws_dynamodb_table" "user_room_table" {
  name           = "UserRoom"
  billing_mode   = "PROVISIONED"
  read_capacity  = 2
  write_capacity = 2
  hash_key  = "userId"
  range_key = "roomKey"

  tags = {
    Name        = "userRoom"
  }
}