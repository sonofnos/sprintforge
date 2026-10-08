# 1. Record architecture decisions

## Status

Accepted

## Context

This is a small team's codebase, but it still needs to survive a new
contributor asking "why is it built this way?" without that answer living
only in someone's memory or a closed pull request thread.

## Decision

We use Architecture Decision Records (ADRs), one per significant decision,
numbered sequentially, following the lightweight format Michael Nygard
described. A decision is "significant" if reversing it later would mean
rewriting more than one module.

## Consequences

Every non-trivial technical choice gets a short, dated paragraph trail. A
reviewer or a new engineer can read `docs/adr/` top to bottom in under ten
minutes and understand the shape of the system and why it isn't shaped some
other way.
