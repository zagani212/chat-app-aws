variable "connect" {
  type = string
  description = "The function's ARN for connect action"
}
variable "disconnect" {
  type = string
  description = "The function's ARN for disconnect action"
}
variable "create_room" {
  type = string
  description = "The function's ARN for create room action"
}
variable "get_messages" {
  type = string
  description = "The function's ARN for get messages action"
}
variable "get_rooms" {
  type = string
  description = "The function's ARN for get rooms action"
}
variable "is_typing" {
  type = string
  description = "The function's ARN for isTyping action"
}
variable "leave_room" {
  type = string
  description = "The function's ARN for leaveRoom action"
}
variable "list_users" {
  type = string
  description = "The function's ARN for listUsers action"
}
variable "send_messages" {
  type = string
  description = "The function's ARN for sendMessages action"
}