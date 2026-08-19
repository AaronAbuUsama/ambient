# 10 — the register converts, and METHOD closes

**Status:** ready-for-agent · **Blocks:** nothing · **Blocked by:** 03

*Measured:* [`deficits.md`](../../../history/method-deficits.md) is **739 lines, 28 deficits** — 6
closed, 2 fixed, 1 declined, 19 open — in three informal states with no way to record
*retracted* or *declined*. DRIVER's decisions answer or dissolve about ten of the nineteen.

## Done when

- The ten deficits DRIVER does not answer — **12, 15, 16, 17, 18, 19, 20, 23, 24 and the
  sharpened 27** — become ticket files under this directory, in the form
  [`issues.md`](../../../rules/issues.md) already requires.
- Every other entry is marked with what answered it, including the two this slice corrected:
  deficit 10 was never declined, and the no-fix rule was an instruction to stop one agent.
- `deficits.md` moves to [`docs/history/`](../../../history/) as the evidence record it
  always was, and `docs/planning/method/` ceases to exist.
- **METHOD's roadmap row reads `● closed`**, with a dated ledger entry saying what it shipped
  and what it learned.
- Spec gate row **19** passes.

## Governed by

- [docs/README.md](../../../README.md) — `planning/` lasts *"until the slice closes"*;
  `history/` holds superseded evidence and **defers to `design/`**.
- [decisions.md](../../../rules/decisions.md) — the corrections to deficits 10 and 24 are
  amendments, never rewrites. The record of being wrong is the point.
- The principal's routing rule, this slice: *inside the process it goes back in the map;
  outside it, or deferred, it becomes a ticket.*

## Comments

**2026-08-19 — three of four bullets done; METHOD is not closed.**

Done:

- The ten surviving deficits are ticket files **11–20** in this directory, each with the
  measurement and instrument that produced it. Deficit 27 is carried in its sharpened form:
  re-check at a **1280** viewport, not the 1440 the register wrongly stated.
- Every other entry is marked with what answered it, in a disposition table covering 7–28.
- The two corrections are `## Amendments`, never edits to the body: **deficit 10 was never
  declined** — what was declined was one implementation, a markdown parser, not the entry
  point the principal had asked for directly — and **the no-fix rule was an instruction to
  stop one agent**, not a standing law, which read as permanent forbids this very pass.
- `deficits.md` is now [`docs/history/method-deficits.md`](../../../history/method-deficits.md)
  and the handoff beside it; `docs/planning/method/` no longer exists. Thirteen inbound links
  broke on the move and `vp run shape` named every one.

**Not done: METHOD's roadmap row.** It cannot honestly read `● closed`. Step 5's gate in
[`slices.md`](../../../rules/slices.md) is *every build ticket is `done`*, and tickets **08**
and **09** are `ready-for-agent` — 08 was not started because its own coordination clause
forbids it while another session is working in `src/` and the lint configuration and
`vp check` is red for reasons that are not ours. Both conditions held: that session committed
`5ef71c8` mid-run and has uncommitted edits in `src/modules/` now.

Closing the row would assert something false about the one document whose whole job is to say
where we are. **The row moves when 08 and 09 land.**
