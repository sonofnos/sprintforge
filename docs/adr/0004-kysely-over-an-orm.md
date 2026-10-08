# 4. Kysely over a full ORM

## Status

Accepted

## Context

The data model has a handful of real invariants that matter under
concurrency (the ticket `version` check, the project-key uniqueness, the
default board columns created atomically with a project). A full ORM
(TypeORM, Prisma) would give migrations and model classes for free, at the
cost of hiding the exact SQL being run — which matters when the whole
point of a feature like optimistic locking is the exact shape of the
`WHERE` clause.

## Decision

Use Kysely: a typed query builder, not an ORM. Every query in `src/modules/*`
is still plain SQL shape (`updateTable(...).set(...).where(...)`), just with
compile-time column/type checking against `src/db/types.ts`. Migrations are
hand-written `.sql` files run by a small custom runner
(`src/db/migrate.ts`), not a framework-specific migration DSL.

## Consequences

- No surprise N+1 queries or hidden lazy-loading — what you read in a route
  handler is what runs against Postgres.
- Schema changes require writing SQL by hand (no `prisma migrate dev`
  autogeneration), which is more typing but means every migration is
  reviewable as plain SQL in a diff.
- `src/db/types.ts` has to be kept in sync with the migrations by hand;
  nothing currently generates it from the schema automatically. For a
  project this size that's a reasonable trade, and was already the
  approach used on a prior, larger Node/Postgres service built the same way.
