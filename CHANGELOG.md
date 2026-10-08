# Changelog

Grouped by sprint rather than by date, since that's the unit this project
itself tracks work in.

## Sprint 1 — core board

- Auth (register/login, JWT), projects with seeded Backlog/In
  Progress/Review/Done columns, project membership with admin/member roles.
- Sprints, tickets, comments.
- Optimistic-concurrency ticket moves (`version` column) — see
  [ADR 2](docs/adr/0002-optimistic-concurrency-for-ticket-moves.md).
- Live board sync over WebSocket — see
  [ADR 3](docs/adr/0003-websocket-for-live-board-sync.md).
- Burndown chart endpoint + React chart (Recharts).
- React frontend: login/register, project list, drag-and-drop board
  (dnd-kit), sprint picker.
- Docker Compose for local Postgres, Dockerfile for the API, GitHub Actions
  CI (typecheck, lint, build, unit + Testcontainers integration tests,
  Terraform validate, Docker build).
- Terraform for an AWS deployment (VPC, ALB, ECS Fargate, RDS Postgres,
  Secrets Manager) — written and validated, not applied (no AWS account on
  the build machine; see `infra/aws/README.md`).

### Real bugs found and fixed while building this sprint

- `app.set("io", ...)` was only ever called in `index.ts`, so any test that
  exercised `createApp()` directly (via supertest, without starting a real
  HTTP server) hit `Cannot read properties of undefined` the moment a route
  tried to emit a socket event. Fixed by having `createApp()` always attach
  a `Server` instance (unattached to a real `http.Server` until `index.ts`
  calls `.attach()`), so emitting is always safe, in tests or production.
- The burndown endpoint's day-range loop assumed `sprint.starts_on` was a
  string (`"2026-01-01"`), but `pg`/Kysely returns Postgres `date` columns
  as JS `Date` objects — the template literal `` `${sprint.starts_on}T00:00:00Z` ``
  silently built an invalid date string and threw `RangeError: Invalid time
  value`, caught by the integration test that actually calls the endpoint
  end-to-end. Fixed by normalizing both dates through a small
  `Date | string -> yyyy-mm-dd` helper before driving the loop off them.
- The first draft of the ten-concurrent-moves test built four request
  promises and then spread the *same four promise references* into a
  length-ten array before `Promise.all`-ing them, which doesn't create ten
  HTTP requests — it just awaits the same four responses multiple times.
  That made a single winning response get counted three times, reporting
  "3 wins" where there was really only ever one. Fixed by generating ten
  genuinely independent `request.post(...)` calls instead of reusing
  promise references.
