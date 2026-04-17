output "chat_room_table" {
  value = aws_dynamodb_table.chat_room_table.arn
}
output "connection_table" {
  value = aws_dynamodb_table.connection_table.arn
}
output "message_table" {
  value = aws_dynamodb_table.message_table.arn
}
output "user_table" {
  value = aws_dynamodb_table.user_table.arn
}
output "user_room_table" {
  value = aws_dynamodb_table.user_room_table.arn
}