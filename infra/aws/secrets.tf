# DB password and JWT secret live in Secrets Manager, not as plaintext task
# definition environment variables — ECS pulls them in at container start via
# the task definition's `secrets` block (see ecs.tf).
resource "aws_secretsmanager_secret" "db_password" {
  name = "${var.project_name}/db-password"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = var.db_password
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name = "${var.project_name}/jwt-secret"
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = var.jwt_secret
}

# The full connection string is itself a secret (it embeds the password) —
# built here and only ever handed to the container via `secrets`, never as a
# plaintext environment variable.
resource "aws_secretsmanager_secret" "database_url" {
  name = "${var.project_name}/database-url"
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = "postgres://${var.db_username}:${var.db_password}@${aws_db_instance.main.address}:5432/${var.db_name}"
}
