# 3. WebSocket push instead of polling for live board sync

## Status

Accepted

## Context

When two people have the same project board open, a card one person moves
should appear on the other's screen without a manual refresh. The options
were short-interval polling (e.g. `GET /tickets` every few seconds) or a
push channel.

## Decision

Use Socket.IO over WebSocket. Each project gets a room (`project:<id>`);
clients join it after authenticating the socket with the same JWT used for
HTTP, and the server emits `ticket:created` / `ticket:updated` /
`ticket:moved` / `ticket:deleted` / `comment:created` to that room whenever
the corresponding HTTP route changes state.

Socket authorization mirrors the HTTP layer rather than trusting the join
request: `project:join` is only honored if the authenticated user is
actually a member of that project (checked against `project_members`
before calling `socket.join`), so a valid JWT for project A can't be used
to listen in on project B's room.

## Consequences

- Real-time feels instant instead of polling-interval-delayed, and avoids
  N clients each hammering the API every few seconds.
- The server has to hold open connections and track room membership, which
  is more operational surface than stateless HTTP — acceptable at this
  scale; would need a shared adapter (e.g. Redis) behind a load balancer
  with more than one API instance, which this project doesn't have yet.
- Every event emission still happens from inside the same request handler
  that made the change, so the HTTP response and the broadcast can never
  disagree about what happened (no separate event-sourcing step to drift
  out of sync).
