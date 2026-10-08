# AWS infrastructure (Terraform)

VPC (2 public subnets for the ALB + Fargate tasks, 2 subnets for the RDS
subnet group), an Application Load Balancer, an ECS Fargate service running
the API container, RDS Postgres 16, and Secrets Manager entries for
`JWT_SECRET` and the full `DATABASE_URL` (the execution role can read them,
the container never sees a plaintext password in its environment).

**Status: written and validated, not applied.** There is no AWS account on
the machine this was built on. `terraform validate` passes and `tfsec`
has been run against it — see the findings below — but nothing here has
actually been provisioned or billed. The live demo link in the main README
runs on Render/Vercel instead; this directory is the AWS-shaped version of
the same architecture.

## Applying it for real

```
terraform init
terraform plan \
  -var="container_image=<ecr-repo-uri>:<tag>" \
  -var="db_password=$(openssl rand -base64 24)" \
  -var="jwt_secret=$(openssl rand -base64 32)"
terraform apply ...same vars...
```

You need an image pushed to ECR (or another registry ECS can pull from)
first — `Dockerfile` builds it. The container runs migrations against
`DATABASE_URL` on startup, before it starts accepting traffic (see the
Dockerfile's `CMD`), so no separate migration step is needed after `apply`.

## tfsec findings, and why they're left as-is for this scope

Running `tfsec .` from this directory reports:

- **Critical/High — ALB is public, HTTP-only, open on 0.0.0.0/0, tasks get
  public IPs.** Intentional for a single-service demo with no domain or ACM
  certificate provisioned: fixing it properly means a Route 53 zone + ACM
  cert + HTTPS listener + redirect, and moving Fargate tasks to private
  subnets behind a NAT gateway (which costs money sitting idle). Worth doing
  before any real traffic; not worth faking here.
- **High — ALB doesn't drop invalid headers.** Fixed (`drop_invalid_header_fields = true`
  on the `aws_lb` resource) since it's free.
- **Low — Secrets Manager entries use the AWS-managed key instead of a
  customer-managed KMS key.** Acceptable default for this scope; a
  customer-managed key is a one-resource addition if a reviewer wants it.

## What's deliberately out of scope

- No HTTPS/ACM/Route 53 (see above).
- No autoscaling policy on the ECS service (`desired_count` is a fixed
  variable).
- No CI/CD wiring to push a new image and force a new deployment — the
  GitHub Actions workflow in `.github/workflows/ci.yml` builds and tests the
  app but does not deploy to AWS.
