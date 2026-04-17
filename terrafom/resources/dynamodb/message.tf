resource "aws_dynamodb_table" "message_table" {
  name           = "Message"
  billing_mode   = "PROVISIONED"
  read_capacity  = 2
  write_capacity = 2
  hash_key  = "roomKey"
  range_key = "messageId"
  attribute {
    name = "roomKey"
    type = "S"
  }  
  attribute {
    name = "messageId"
    type = "S"
  }  

  tags = {
    Name        = "message"
  }
}