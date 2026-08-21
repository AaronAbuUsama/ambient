# 00 — the seam rows

**Status:** done · **Blocks:** 01, 02, 03, 04 · **Blocked by:** nothing

**Writes no code.** `00` is reserved for exactly this: the ticket that unblocks the rest.
[`new-module`](../../../../.agents/skills/new-module/SKILL.md) **refuses a module with no
`seams.md` row**, and both modules this Slice adds need one before they can be scaffolded.

The rows are already written — [`design.md`](../design.md) § Seam delta — and were landed
during the design session because `vp run shape` refuses a design that names a module with no
row. **This ticket verifies rather than authors**, which is why it is minutes rather than an
afternoon.

## What to do

1. Confirm [`seams.md`](../../../design/seams.md) holds the amended `knowledge` row and the
   new `observe` row, and that the dependency block reads
   `observe ─> transcript (read), knowledge` and
   `knowledge ─> home (a Place), failure`.
2. Confirm `cli ─> home, import, channel, ingest, knowledge, observe`.
3. Confirm [`CONTEXT.md`](../../../../CONTEXT.md) holds **Observation** and **Window**, the
   two nouns this Slice introduced.

## Done when

- `vp run shape` reports no new problem.
- `new-module knowledge` and `new-module observe` would both be accepted.
- Nothing under `src/` changed.

## Governed by

[`modules.md`](../../../rules/modules.md) · [`language.md`](../../../rules/language.md) ·
[`issues.md`](../../../rules/issues.md) · `new-module`'s seam-row precondition

## Comments

**2026-08-21 — verified, nothing authored.** All three checks passed as written, so this
stayed the minutes-long ticket it says it is.

- [`seams.md`](../../../design/seams.md) holds the amended `knowledge` row (`:30`, carrying
  the [ADR 007](../../../adr/007-knowledge-is-files-not-a-client.md) amendment away from
  *"hides the OK MCP client"*) and the new `observe` row (`:31`). The dependency block reads
  `observe ─> transcript (read), knowledge` (`:54`) and
  `knowledge ─> home (a Place), failure` (`:55`).
- `cli ─> home, import, channel, ingest, knowledge, observe` (`:41`).
- [`CONTEXT.md`](../../../../CONTEXT.md) holds **Window** (`:58`) and **Observation** (`:64`).
- `vp run shape` clean; nothing under `src/` changed.

**Status vocabulary corrected in the same commit.** All five tickets read `**Status:** todo`,
which [`issues.md`](../../../rules/issues.md) does not define — the six are `needs-triage`,
`needs-info`, `ready-for-agent`, `ready-for-human`, `done`, `wontfix`, plus `retracted`. They
were written before that rule tightened. The other four now read `ready-for-agent`, which is
what `plan-slice` writes and what they in fact were.
