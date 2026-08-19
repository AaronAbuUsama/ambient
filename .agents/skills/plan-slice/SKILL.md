---
name: plan-slice
description: Turn a mapped, designed and answered slice into a spec and its build tickets in the ambient repo — write docs/planning/<slice>/spec.md, reconcile design.md against the answers the frontier produced, then one ticket file per tracer bullet with blockers derived from symbols and call sites. Use when a slice's scope.md has an empty Open and Fog, when the user says "spec INGEST" or "plan the slice", or after the last open question resolves.
---

# Plan a slice

Step 4 of [`slices.md`](../../../docs/rules/slices.md). It turns an answered `scope.md` and a
settled `design.md` into `spec.md` and the build tickets.

## The gate — check it before anything else

Two conditions, both hard:

1. **`design.md` exists.** If it does not, stop and run
   [`design-slice`](../design-slice/SKILL.md). A spec written with no design is how a
   176-line handler gets built without anyone noticing.
2. **`scope.md`'s Open and Fog are both empty.** That is what "the way is clear" means.
   Planning around an open question is how a decision gets made silently by whoever
   implements it.

## 1 · The spec

Sections, in this order. [`import/spec.md`](../../../docs/planning/import/spec.md) is the
worked example — read it before writing a new one.

```markdown
# <SLICE> — spec
**Slice:** · **State:** · **Specified:**

The question this slice answers.
The frame — what it is allowed to get wrong, and what it must never get wrong.

## Problem Statement · ## Solution · ## User Stories
## Implementation Decisions
## Design                  <- a link to design.md. Never a second copy of it.
## Testing Decisions
## The gate                <- numbered, executable. definition-of-done row 1 reads it.
## Out of Scope · ## Further Notes
```

Every number in it carries **how it was measured**. A claim with no instrument is an
assertion, and this repository has been wrong six times that way in one session.

**The spec does not restate the design.** `design.md` holds the caller, the call graph, the
interfaces, the seam delta and the conformance table.
[`decisions.md`](../../../docs/rules/decisions.md) forbids one statement having two homes,
and a design copied into a spec is a copy that goes stale in one edit.

## 2 · Reconcile the design against the answers

Every branch point in `design.md` was a `grilling` question, and step 3 answered all of them.
**Go back and collapse them:** the chosen shape becomes the design, the loser moves under
`## Alternatives` with what killed it, and the `## Branch points` section empties.

Then re-check the two invariants against the collapsed design:

- **No implemented public symbol without a current production call site.** `transcript`
  shipped `from: "live"` variants only its own deserialiser builds — nothing *originates*
  one, because `channel` does not exist. No gate noticed.
- **Only the composition root wires.** If a call site is growing arms, the orchestration is
  in the wrong module — `import`'s handler reached 176 lines against 8, 8, 12 and 14 for its
  siblings while its own spec said it *"wires and does nothing else"*.

An answer that changed the shape is normal and is why this step exists. An answer that
changed the shape and left `design.md` saying the old thing is the failure.

## 3 · The tickets

One file per tracer bullet: `docs/planning/<slice>/issues/NN-<slug>.md`, numbered in
dependency order, per [`issues.md`](../../../docs/rules/issues.md). Never one combined file,
and never `gh` — there is no remote.

- **A tracer bullet cuts a narrow but complete path** through every layer it touches, and is
  demoable on its own. A ticket that builds one layer is horizontal and is wrong.
- **Blockers come from symbols, call sites and owned files** — never from narrative order.
  All three are already written down in `design.md`; read them off it rather than inventing
  an order that sounds sensible.
- Sized to one context window.
- Each carries `**Status:**`, its gate rows from the spec, and a **Governed by** section
  naming the rules and skills that bind it — including any precondition, such as
  `new-module` refusing a module with no `seams.md` row.

## Finish

1. `vp run shape` — every cross-link in `spec.md` and `design.md` resolves.
2. Report the ticket graph: what can start now, and what waits on what.

**Write no code in this session.**
