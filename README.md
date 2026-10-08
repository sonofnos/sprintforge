# SprintForge

A sprint-planning board — React + Node/Express/TypeScript + PostgreSQL,
with live multi-user sync and a burndown chart. Built to dogfood the thing
it tracks: the repo itself ships with a [CONTRIBUTING.md](CONTRIBUTING.md)
covering the Agile/code-review/mentoring process, and a
[CHANGELOG.md](CHANGELOG.md) kept by sprint instead of by date.

**Live demo:** <https://sprintforge-three.vercel.app> (frontend, Vercel) ·
API at <https://sprintforge-api-bl89.onrender.com> (Render, Postgres on
Neon — see [Deployment](#deployment) for why, and `infra/aws/` for the same
architecture as validated-but-unapplied Terraform for AWS). Render's free
plan sleeps after inactivity, so the first request after a while can take
up to ~a minute.

## What it does

- Projects → sprints → a Backlog/In Progress/Review/Done board. Tickets
  carry points, an assignee, and a comment thread.
- Drag a card between columns (dnd-kit) and it moves for every other
  viewer of that project in real time (Socket.IO), not on their next
  refresh.
- A sprint's burndown chart (Recharts) plots ideal-vs-actual remaining
  points per day, computed from real ticket `completed_at` timestamps.
- Role-based project membership (admin/member) — only a member can see or
  edit a project's board, only an admin can invite others or delete tickets.

## The one real concurrency bug this project is built around

Two people dragging the same card at the same instant is the one place
this kind of app actually races. Each ticket carries a `version` integer;
every move/update must supply the version it last saw, and the update is a
single `WHERE id = $1 AND version = $2` — the loser gets a `409`, not a
silently dropped move. Proved under a real test that fires two (and
separately, ten) concurrent HTTP requests at the same ticket with
`Promise.all`, against a real Postgres container, and asserts exactly one
wins and the row's version advances by exactly one. Details and the
alternative considered (pessimistic locking) are in
[ADR 2](docs/adr/0002-optimistic-concurrency-for-ticket-moves.md).

Three more real bugs found while building this (a missing `io` instance
crashing any route that emits an event when tested without a real HTTP
server, a `Date`-vs-string bug in the burndown date-range loop, and a test
that silently reused the same promise three times instead of making ten
real requests) are written up with root cause in
[CHANGELOG.md](CHANGELOG.md).

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router, dnd-kit, Recharts, Socket.IO client |
| Backend | Node.js, Express, TypeScript, Kysely (typed SQL, not an ORM — [ADR 4](docs/adr/0004-kysely-over-an-orm.md)), Socket.IO, Zod validation |
| Database | PostgreSQL 16 |
| Auth | JWT, bcrypt password hashing |
| Tests | Vitest (unit + frontend component), Supertest + Testcontainers (real-Postgres integration tests, not mocks) |
| CI | GitHub Actions — typecheck, lint, build, full test suite, `terraform validate`, Docker build |
| Infra | Dockerfile + docker-compose for local dev; Terraform for AWS (VPC/ALB/ECS Fargate/RDS/Secrets Manager) in `infra/aws/` |

## Running it locally

```bash
npm install
docker compose up -d                       # Postgres on :5436
npm run migrate -w packages/server         # or: npm run dev -w packages/server, which needs this first
npm run dev -w packages/server             # API on :4000
npm run dev -w packages/web                # frontend on :5173
```

Copy `packages/server/.env.example` and `packages/web/.env.example` to
`.env` if you want to override the defaults (they work out of the box
against the Docker Compose Postgres).

## Testing

```bash
npm run test -w packages/server   # unit (pure burndown-math tests) + integration (real Postgres via Testcontainers)
npm run test -w packages/web      # component tests (Vitest + Testing Library)
```

The integration suite needs a working Docker daemon (Testcontainers starts
a real `postgres:16-alpine` per test file and tears it down after); no
service containers or manual setup required, it runs the same way in
GitHub Actions on `ubuntu-latest`.

## Deployment

The live demo runs on Render (API + managed Postgres) and Vercel
(frontend) — accounts already in place, zero new signups needed for a
portfolio deploy. `infra/aws/` has the same architecture written as
Terraform (VPC, ALB, ECS Fargate, RDS Postgres, Secrets Manager for
`JWT_SECRET`/`DATABASE_URL`) for a target where AWS is the actual
requirement; it's validated (`terraform validate`, `tfsec`) but not
applied, since there's no AWS account on the machine this was built on.
See `infra/aws/README.md` for exactly what that means and what a real
`apply` would need.

## Project layout

```text
packages/server/   Express API, Kysely + Postgres, Socket.IO, tests
packages/web/       React frontend
docs/adr/           Architecture decision records
infra/aws/          Terraform (VPC, ALB, ECS Fargate, RDS, Secrets Manager)
.github/workflows/  CI
```
