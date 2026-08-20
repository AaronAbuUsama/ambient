# 11 — the boundary between up-front and just-in-time planning is written down

**Status:** done · **Blocks:** nothing · **Blocked by:** nothing

*Converted from deficit 12, which DRIVER did not answer.*

The vendored skills want all wayfinding **up front**. This repo rejected that: planning is
just-in-time, per slice, which is what [`slices.md`](../../../rules/slices.md) is. But
[`roadmap.md`](../../../design/roadmap.md) was written up front and is **correct** to have
been — the slice names, their order, and what breaks going backwards are not derivable slice
by slice.

**Two kinds of planning, and the line between them is stated nowhere.** The principal's
framing: *"you still need to do some overall planning first — what is the general evidence
and stuff — but the tactical should probably be changed."* Nothing tells a fresh agent which
is which, so the roadmap reads as a contradiction of the rule rather than its complement.

## Done when

- One statement, in one place, says which planning is up-front and which is per-slice, and
  names `roadmap.md` as the up-front artefact and `scope.md` as the per-slice one.
- A fresh agent reading [`slices.md`](../../../rules/slices.md) does not conclude the roadmap
  breaks the rule.

## Governed by

- [language.md](../../../rules/language.md) — one statement, one home. This is a statement
  about how we work, so it is a rule, not a second copy inside the roadmap.
- [decisions.md](../../../rules/decisions.md) — if this contradicts a stated decision, it is
  an amendment.

## Comments

**2026-08-20 — written into [`slices.md`](../../../rules/slices.md) § The rule, not into a
rule of its own.** Six lines, above the six-step table, naming `roadmap.md` as the up-front
artefact and `scope.md` as the per-slice one. A second rule file was rejected: the statement
is *what this rule covers and what it does not*, so its home is the head of the rule it
bounds — a `planning.md` beside `slices.md` would immediately need a boundary of its own
against it, which is the two-authorities failure [language.md](../../../rules/language.md)
exists to stop. `roadmap.md` gains nothing: a rule about how we work does not live in the
document that says where we are.
