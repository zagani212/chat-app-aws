variable source_file {
  type = string
  description = "The source file of your function"
  default = null
}
variable source_dir {
  type = string
  description = "The source directory of your function"
  default = null
}

locals {
  valid_input = (
    (var.source_file != null && var.source_dir == null) ||
    (var.source_file == null && var.source_dir != null)
  )
}

resource "null_resource" "validate" {
  count = local.valid_input ? 0 : 1

  provisioner "local-exec" {
    command = "echo 'Provide either source_file OR source_dir, not both.' && exit 1"
  }
}

variable function_name {
  type = string
  description = "The name of your function"
}
variable layer_arn {
  type = string
  description = "The arn of the layer used by your function"
  default = null
}
variable iam_role {
  type = string
  description = "The arn of the iam role"
}
variable handler {
  type = string
  description = "The handler of the function"
}