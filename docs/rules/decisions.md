# Decisions and amendments

## The rule

A decision that shapes the codebase is an ADR under `docs/adr/`, named
`NNN-<slug>.md`. **Read the ADRs that touch an area before working in it** — they are
listed in the roadmap's Decision index.

ADRs are created lazily, when a decision is actually made. Do not scaffold empty ones.

When implementation contradicts an ADR, or contradicts the **Decided — do not
re-litigate** list in [AGENTS.md](../../AGENTS.md), say so explicitly and record the
correction in that document's `## Amendments` section. **Never rewrite the body.** Never
leave two answers alive in two documents.

## Why

**Five statements in [ADR 001](../adr/001-home-interface.md) were wrong on contact with
the implementation** — `HomeDeps` had no members left once `ok init` was dropped, the
non-empty-problems tuple cost an assertion at eight sites, `converge` is async for a
different reason than stated, the `Place` properties had to become methods to have
anywhere to say `BadName`, and one throw survived that the caller was already treating
as a condition. The decision — the handle, one list with two verbs, nothing cached —
survived all five.

That is the case for amendments rather than edits. A silently corrected ADR reads as if
the design were right first time, which teaches the next reader nothing and quietly
removes the evidence that the *reasoning* held while the details did not. A reader who
can see which parts broke can calibrate how much to trust the rest.

**Two answers alive in two documents is the failure this repo has already fixed once.**
An amendment section is the one place a correction can live without creating a second
authority.

## The check

`vp run shape` — every cross-link in every document resolves, so an ADR that is moved or
renamed cannot be quietly orphaned.

[definition-of-done.md](../design/definition-of-done.md) row 9 is where this is asserted
at close time, by reading.

That a correction was written as an amendment rather than an edit to the body is **not
currently checked** — `git log -p docs/adr/` is the evidence.
