---
name: plan-slice
description: Turn a mapped slice into a spec and its build tickets in the ambient repo — write docs/planning/<slice>/spec.md including the Program design (production call sites, call graph, test seams, conformance table, seam delta), then one ticket file per tracer bullet with blockers derived from symbols and call sites. Use when a slice's scope.md has an empty Open and Fog, when the user says "spec INGEST" or "plan the slice", or after the last open question resolves.
---

# Plan a slice

Step 3 of [`slices.md`](../../../docs/rules/slices.md). It turns an answered
`scope.md` into `spec.md` and the build tickets.

## The gate — check it before anything else

**`scope.md`'s Open and Fog must both be empty.** That is what "the way is clear" means. If
either has entries, stop and say which: planning around an open question is how a decision
gets made silently by whoever implements it.

## 1 · The spec

Sections, in this order. Use [`import/spec.md`](../../../docs/planning/import/spec.md) as
the worked example and the vendored `to-spec` skill for the product half.

```markdown
# <SLICE> — spec
**Slice:** · **State:** · **Specified:**

The question this slice answers.
The frame — what it is allowed to get wrong, and what it must never get wrong.

## Problem Statement · ## Solution · ## User Stories
## Implementation Decisions
## Program design          <- the part that was missing before
## Testing Decisions
## The gate                <- numbered, executable. definition-of-done row 1 reads it.
## Out of Scope · ## Further Notes
```

Every number in it carries **how it was measured**. A claim with no instrument is an
assertion, and this repository has been wrong six times that way in one session.

## 2 · Program design — five parts, and a sixth only if durable writes exist

**Design the caller before the callee.** Everything else follows from that one rule.

| Part | What to write |
|---|---|
| **Production call sites** | the caller's real code, failure branches included, before any interface exists |
| **Call graph** | the trace from `main.ts` outward, naming the module that owns each step |
| **Test seams** | the highest useful seam per arrow, and what each test observes |
| **Conformance table** | public symbol → its production caller → its test seam |
| **Seam delta** | the rows to add to [`seams.md`](../../../docs/design/seams.md), **before** any module is scaffolded |
| *conditional:* **state and failure sequence** | per durable step: what is written, what a crash leaves behind, what a retry observes |

Two invariants the design must satisfy:

- **No implemented public symbol without a current production call site.** `transcript`
  shipped `from: "live"` variants only its own deserialiser builds — nothing *originates*
  one, because `channel` does not exist. No gate noticed.
- **Only the composition root wires.** If a call site is growing arms, the orchestration is
  in the wrong module — `import`'s handler reached 176 lines against 8, 8, 12 and 14 for its
  siblings while its own spec said it *"wires and does nothing else"*.

**If an interface here is written through by many callers *and* hard to change later,
[`seams.md`](../../../docs/design/seams.md) says design it twice** — two genuinely different
shapes, graded, and the result is an ADR per
[`decisions.md`](../../../docs/rules/decisions.md).

## 3 · The tickets

One file per tracer bullet: `docs/planning/<slice>/issues/NN-<slug>.md`, numbered in
dependency order, per [`issues.md`](../../../docs/rules/issues.md). Never one combined file,
and never `gh` — there is no remote.

- **A tracer bullet cuts a narrow but complete path** through every layer it touches, and is
  demoable on its own. A ticket that builds one layer is horizontal and is wrong.
- **Blockers come from symbols, call sites and owned files** — never from narrative order.
- Sized to one context window.
- Each carries `**Status:**`, its gate rows from the spec, and a **Governed by** section
  naming the rules and skills that bind it — including any precondition, such as
  `new-module` refusing a module with no `seams.md` row.

## Finish

`vp run shape`, then report the ticket graph: what can start now, and what waits on what.

**Write no code in this session.**
