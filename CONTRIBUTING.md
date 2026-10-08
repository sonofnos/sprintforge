# Contributing

## Day-to-day workflow

- `main` is always deployable. Work happens on short-lived branches,
  `<initials>/<short-description>` (e.g. `ce/burndown-chart`).
- Open a PR as soon as there's something reviewable, even a draft — don't
  sit on a branch until it's "finished." Small PRs get reviewed faster and
  are easier to reason about than one that touches ten files.
- CI (`.github/workflows/ci.yml`) runs typecheck, lint, build, and the full
  test suite (including the real-Postgres integration tests via
  Testcontainers) on every PR. A red CI run blocks merge; there's no
  "merge anyway, fix later."
- Every PR that changes a public API shape, a database column, or a
  concurrency/locking strategy gets a short ADR in `docs/adr/` alongside
  it — see [ADR 1](docs/adr/0001-record-architecture-decisions.md). A PR
  that *could* use one and doesn't is a reasonable review comment.

## Sprints, in this repo's own terms

This project is a sprint board, so it practices what it tracks: work is
pulled from the `Backlog` column into the active sprint at planning,
moves across `Backlog → In Progress → Review → Done` as it's actually
worked (not retroactively updated at standup), and `GET
/sprints/:id/burndown` is the real source of truth for whether a sprint
is on track — not a gut feeling two days before the end date. A sprint
that's trending badly on its burndown is worth raising at the next standup,
not waiting for the retro to mention.

## Code review

Reviewing someone else's PR, especially a less experienced contributor's:

- **Say what's good, specifically, not just what to change.** "Nice catch
  handling the 409 case in the UI" costs nothing and teaches what
  "good" looks like as effectively as a correction does.
- **Distinguish "this is wrong" from "this is a style I'd choose
  differently."** Block merge on the first, leave the second as a
  suggestion ("nit:" prefix) that doesn't need addressing before merge.
- **Ask questions before asserting bugs.** "What happens if two requests
  hit this at once?" invites the author to find the race themselves (and
  remember the lesson) rather than being handed the answer.
- **A review that only says "LGTM" on a PR touching money, auth, or
  concurrency logic isn't a review.** At minimum, trace through what
  happens on the unhappy path: the network call fails, the second request
  arrives first, the token is expired.
- If you're asking for a change, you're expected to either approve once
  it's made or say exactly what's still missing — reviews shouldn't go
  through more than two or three rounds before either merging or an
  actual conversation (call, not more comments).

## Mentoring junior contributors

- Pair on the first PR of a kind (first migration, first endpoint touching
  the `version` column) rather than reviewing it cold after the fact.
- When a review comment points out a bug, link to *why* it's a bug (an
  ADR, a test that would have caught it, a one-line explanation of the
  race) rather than just the fix — the goal is the person not needing the
  same comment on their next five PRs.
- It's fine for a junior's first few PRs to need more rounds of review than
  a senior's; that gap closing over time is the actual signal that
  mentoring is working, not the first PR being perfect.

## Tests

- A bug fix ships with a test that fails without the fix and passes with
  it — not just a passing test suite afterward.
- Concurrency-sensitive code (anything touching `version`, any
  `SELECT ... FOR UPDATE`, any unique-constraint-as-idempotency-key) gets
  a real concurrent test against a real database, not a sequential one
  that happens to pass. See
  `packages/server/test/integration/concurrency.test.ts` for the pattern:
  fire the requests with `Promise.all`, not `await` one at a time.
