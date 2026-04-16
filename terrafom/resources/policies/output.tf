output "get_rooms_role" {
  value = aws_iam_role.get_rooms_role.arn
}

output "disconnect_handler_role" {
  value = aws_iam_role.disconnect_handler_role.arn
}

output "connection_handler_role" {
  value = aws_iam_role.connection_handler_role.arn
}

output "is_typing_role" {
  value = aws_iam_role.is_typing_role.arn
}

output "create_room_role" {
  value = aws_iam_role.create_room_role.arn
}

output "register_new_user_role" {
  value = aws_iam_role.register_new_user_role.arn
}

output "get_message_role" {
  value = aws_iam_role.get_message_role.arn
}

output "leave_room_role" {
  value = aws_iam_role.leave_room_role.arn
}

output "get_all_users_role" {
  value = aws_iam_role.get_all_users_role.arn
}