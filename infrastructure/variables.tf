variable "location" {
  description = "Region de Azure"
  type        = string
  default     = "eastus"
}

variable "project_name" {
  description = "Nombre base del proyecto"
  type        = string
  default     = "online-exams"
}

variable "postgres_admin" {
  description = "Usuario administrador de PostgreSQL"
  type        = string
  default     = "examadmin"
}

variable "postgres_password" {
  description = "Password de PostgreSQL"
  type        = string
  sensitive   = true
}