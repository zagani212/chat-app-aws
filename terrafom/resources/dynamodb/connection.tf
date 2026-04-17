resource "aws_dynamodb_table" "connection_table" {
  name           = "Connection"
  billing_mode   = "PROVISIONED"
  read_capacity  = 2
  write_capacity = 2
  hash_key  = "connectionId"
  attribute {
    name = "connectionId"
    type = "S"
  }  
  attribute {
    name = "userId"
    type = "S"
  }

  global_secondary_index {
    name               = "GSI1"
    hash_key  = "userId"
    write_capacity     = 2
    read_capacity      = 2
    projection_type    = "ALL"
  }

  tags = {
    Name        = "connection"
  }
}