output "api_url" {
  value       = "http://${aws_lb.main.dns_name}"
  description = "Public ALB URL for the API (put a real domain + ACM cert in front of it for HTTPS)"
}

output "db_endpoint" {
  value     = aws_db_instance.main.endpoint
  sensitive = true
}
