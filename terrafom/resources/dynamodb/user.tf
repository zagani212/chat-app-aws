resource "aws_dynamodb_table" "user_table" {
  name           = "User"
  billing_mode   = "PROVISIONED"
  read_capacity  = 2
  write_capacity = 2
  hash_key  = "userId"
  
  attribute {
    name = "userId"
    type = "S"
  }  

  tags = {
    Name        = "user"
  }
}