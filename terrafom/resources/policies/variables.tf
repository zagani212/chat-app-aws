variable "chat_room_table" {
  type = string
  description = "The ARN of chat room table"
}
variable "connection_table" {
  type = string
  description = "The ARN of connection table"
}
variable "message_table" {
  type = string
  description = "The ARN of message table"
}
variable "user_table" {
  type = string
  description = "The ARN of user table"
}
variable "user_room_table" {
  type = string
  description = "The ARN of user room table"
}

variable "apigw_execution_arn" {
  type = string
  description = "The execution ARN of api gateway"
}