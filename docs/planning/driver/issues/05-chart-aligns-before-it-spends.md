# 05 — `/slice chart <NAME>` aligns before it spends

**Status:** ready-for-agent · **Blocks:** nothing · **Blocked by:** 02

*Measured, on this slice:* **two of the three `research` questions its own map raised, the
principal answered from memory in one sentence** — and one subagent dispatched for a third
died after 600 seconds having read nothing. Alignment is where that is caught before a
subagent is spent.

## Done when

- `/slice chart <NAME>` drafts the destination, the probable questions with their kinds, and
  the probable fog — and **dispatches nothing until the principal agrees**, including no
  `research` subagent.
- `map-slice` gains the same gate, so alignment happens whether or not the driver ran:
  draft → **agree** → measure → write `scope.md` → fire the research. Its § 4 *Fire the
  research* moves behind the gate.
- [`slices.md`](../../../rules/slices.md)'s **step 1 gate row** gains one clause naming
  agreement. It stays six steps — alignment produces agreement, not an artefact, and every
  other step produces a file.
- Spec gate rows **7** and **20** pass.

## Governed by

- [slices.md](../../../rules/slices.md) § 1 — the destination is named first, and the fog
  test is whether a question can be *stated*, not answered.
- Deficit 20 — *the map can permanently delete scope, and that is a decision.* Out of scope
  is agreed at this gate, not asserted by the agent.
