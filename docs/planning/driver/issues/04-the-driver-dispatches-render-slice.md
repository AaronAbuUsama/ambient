# 04 — the driver dispatches `render-slice`, and five restatements are deleted

**Status:** done · **Blocks:** nothing · **Blocked by:** 02

*Measured:* the instruction *"Regenerate the page — `render-slice <SLICE>`"* appears in
**six** places — `map-slice`, `design-slice`, `plan-slice`, `close-slice`, and twice in
`slices.md`. `package.json` has **two** scripts, `ambient` and `shape`. **It has never been
a command.** *Instrument: `grep` over those files; `node -e` over `package.json .scripts`.*

Deficit 10's own diagnosis: *"a convention an agent must remember, not a call site."*

## Done when

- The driver dispatches `render-slice` after every step it dispatches.
- The instruction is deleted from all four skills and both places in `slices.md`. `slices.md`
  keeps the **rule** — every step ends with the page regenerated — and drops the instruction
  about how, because the driver now does it.
- Accepted and stated cost: a step skill run **without** the driver no longer regenerates the
  page. That is correct — running a step bare is what the driver exists to stop.
- Spec gate row **10** passes.

## Governed by

- [artefacts.md](../../../rules/artefacts.md) — one HTML artefact per slice, and no others.
- [slices.md](../../../rules/slices.md) § Seeing it.
