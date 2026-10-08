variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "eu-west-1"
}

variable "project_name" {
  description = "Short name used to prefix all resources"
  type        = string
  default     = "sprintforge"
}

variable "container_image" {
  description = "Fully qualified image URI for the API container (e.g. an ECR repo URI:tag)"
  type        = string
}

variable "container_port" {
  type    = number
  default = 4000
}

variable "db_name" {
  type    = string
  default = "sprintforge"
}

variable "db_username" {
  type    = string
  default = "sprintforge"
}

variable "db_password" {
  description = "RDS master password. Pass via TF_VAR_db_password, never commit it."
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "jwt_secret" {
  description = "Secret used to sign auth JWTs. Pass via TF_VAR_jwt_secret."
  type        = string
  sensitive   = true
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "fargate_cpu" {
  type    = number
  default = 256
}

variable "fargate_memory" {
  type    = number
  default = 512
}
