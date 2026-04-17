resource "aws_dynamodb_table" "chat_room_table" {
  name           = "ChatRoom"
  billing_mode   = "PROVISIONED"
  read_capacity  = 2
  write_capacity = 2
  hash_key  = "roomKey"
  attribute {
    name = "roomKey"
    type = "S"
  }  
  attribute {
    name = "roomId"
    type = "S"
  }

  global_secondary_index {
    name               = "GSI1"
    hash_key  = "roomId"
    write_capacity     = 2
    read_capacity      = 2
    projection_type    = "ALL"
  }

  tags = {
    Name        = "chat-room"
  }
}