# 2. Optimistic concurrency for ticket moves

## Status

Accepted

## Context

A sprint board's one genuinely concurrent operation is two people dragging
the same card at close to the same instant — one marking it "Done" while
another drags it to "Review", say. With a naive `UPDATE tickets SET
column_id = ... WHERE id = ...`, whichever write lands last wins silently;
the other person's intent is dropped with no error, and nothing in the UI
tells them it happened.

Two ways to prevent that were considered:

1. **Pessimistic locking** (`SELECT ... FOR UPDATE` then update, or an
   application-level lock per ticket) — correct, but holds a database
   connection/lock for the length of a request, and doesn't fit a
   stateless HTTP API well (the lock would need to span the whole
   request, including network latency to the client).
2. **Optimistic locking** with a `version` integer column: every update
   requires the caller's last-known `version`, applied as
   `WHERE id = $1 AND version = $2`, and bumps it by one. If the row's
   version has moved on, zero rows match, and the caller gets a `409`.

## Decision

Use optimistic locking (`version` column on `tickets`). The move endpoint
(`POST /tickets/:id/move`) and the general update endpoint (`PATCH
/tickets/:id`) both require the client to send the version they last saw;
a lost race gets a `409 Conflict`, not a silent overwrite.

## Consequences

- No lock is held across a request; the check-and-update is a single atomic
  UPDATE statement, so Postgres's own row-level locking does the real work.
- The client has to hold onto the current `version` for every ticket and
  surface a "someone else changed this, refreshing" message on `409` — see
  `BoardPage.onDragEnd` for that.
- Proved under a real two-connection concurrent-move integration test and a
  ten-way concurrent-move test (`packages/server/test/integration/concurrency.test.ts`):
  exactly one request wins, the rest get `409`, and the row's `version`
  advances by exactly one, not zero and not more than one.
