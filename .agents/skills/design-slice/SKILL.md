---
name: design-slice
description: Design the shape of a mapped slice in the ambient repo before anything is grilled — write the production caller first, read the interfaces back off it, draw the call graph from main.ts outward, write the seam delta, and turn every place the shape is still undecided into a branch point the frontier can be asked about. Produces docs/planning/<slice>/design.md. Use when a slice has a scope.md, when the user says "design INGEST" or "what does this look like in code", or when a grilling question cannot be asked without something to react to.
---

# Design a slice

Step 2 of [`slices.md`](../../../docs/rules/slices.md). It produces one file —
`docs/planning/<slice>/design.md` — and it runs **before** the frontier is worked, because
the design is what makes the frontier askable.

**This is brainstorming, not interrogation.** Put two shapes up, write the caller, and let
the caller kill one. SKELETON did exactly that and produced two ADRs and a `seams.md` four
hours before its spec. IMPORT interviewed instead, wrote its interface ADR five hours *after*
the code, and shipped a 176-line handler that made `cli` the composition owner its own spec
said it was not.

**Write no production code in this session.** Everything here is design that lives in a
markdown file. The caller you write is a sketch you will throw away and rewrite at step 5.

## The gate — check it before anything else

`scope.md` exists, has a **Destination**, and has a **Decided** section with its facts cited.

**Open does not need to be empty. That is the whole point of this step.** A design that
waits for certainty is the circular dependency this step was added to break — see
[`slices.md`](../../../docs/rules/slices.md) § Why.

## 1 · Write the caller, first, as real code

Not boxes. Not a nesting tree. **Real call expressions**, with what each returns and how each
fails, in a fenced block. Start from the verb as `main.ts` would reach it.

```ts
// what the caller does, before any of these exist
const chat = await home.chats().find(slug)          // Chat | NotFound
if (!chat) return { kind: "unknownChat", slug }      // a value, never a throw
const cursor = await work.cursor(chat)               // Cursor — starts at seq 0
```

Rules that make this useful rather than decorative:

- **Failure branches are in the sketch.** A caller with only the happy path hides exactly the
  decisions this step exists to expose. [`errors.md`](../../../docs/rules/errors.md): a
  failure is a declared value.
- **Name a module for every call.** `home.` · `transcript.` · `channel.` — the prefix *is*
  the ownership claim, and it is the claim step 6 row 10 checks against the code.
- **If the caller grows arms, the orchestration belongs in a module.** That is the deletion
  test run against code instead of a guess, which is the mistake
  [`import.md`](../../../docs/walkthroughs/import.md) was written to record.

## 2 · The call graph — the trace, with owners

From `main.ts` outward, one line per step, naming the module that owns it.
[`import.md`](../../../docs/walkthroughs/import.md) is the worked example — **read it before
drawing a new one.** Then the ownership table underneath it, which is the half a diagram
usually omits: for each step, the owner, and *why not somewhere else*.

## 3 · Read the interfaces back off the caller

**Never invent an interface ahead of its caller.** The signatures in `types.ts` are whatever
the sketch above already demanded — that is the entire method, and it is why the order
matters. Write them out and check each one against its call site.

**No public symbol without a production call site in this document.** `transcript` shipped
`from: "live"` variants nothing originates, because `channel` did not exist and no gate
looked.

## 4 · Design it twice, where the bar is met

[`seams.md`](../../../docs/design/seams.md) spends `DESIGN-IT-TWICE` only where an interface
is **written through by many callers *and* hard to change later.** Where that bar is met:
two genuinely different shapes, both written as callers, graded, and the loser recorded with
what killed it. The result is an ADR per
[`decisions.md`](../../../docs/rules/decisions.md).

Where the bar is not met, say so in one line and sketch once. Two shapes for everything is
how a design step becomes theatre.

## 5 · The seam delta

The rows to add to [`seams.md`](../../../docs/design/seams.md), written **here**, before any
module is scaffolded. `new-module` refuses a module with no `seams.md` row — IMPORT needed a
ticket 00 purely because no step owned this.

## 6 · Test seams and conformance

The highest useful seam per arrow, and what each test observes. Then the conformance table:
**public symbol → its production caller → its test seam.** A row with an empty middle column
is design that got implemented.

## 7 · State and failure sequence — only if there are durable writes

Per durable step: what is written, what a crash immediately after leaves behind, and what the
next run observes. [`import.md`](../../../docs/walkthroughs/import.md) has the worked table,
and the reason the Receipt is written last.

## 8 · Branch points — this is the frontier, and it is the gate

Every place the shape depends on something not yet decided. Each one is a heading in
`design.md` carrying the two candidate shapes as code, and each becomes one `grilling` line
in `scope.md` pointing back at it:

```
G2  grilling  after design.md § Cursor placement — <the question>
```

**A `grilling` question that cannot name a block of `design.md` is not finished.** Either it
is about the destination rather than the shape — move it back to the map — or the design
stopped short. This is the rule that stops the principal being asked in the abstract, and it
is the reason this step exists at all.

Then **order the frontier**: `research` and `spike` roots are `now` — AFK, parallel,
dispatchable this minute. Everything downstream of a branch point waits on the answer above
it, not on the session's convenience.

## The file

```markdown
# <SLICE> — design
## The caller            the sketch, failure branches included
## Call graph            main.ts outward, plus the ownership table
## Interfaces            read back off the caller
## Alternatives          only where the two-clause bar is met; the loser and what killed it
## Seam delta            rows for seams.md
## Test seams            highest useful seam per arrow, plus the conformance table
## State and failure     conditional: only where durable writes exist
## Branch points         one heading each; the frontier hangs off these
```

Every number carries **how it was measured**. A claim with no instrument is an assertion.

## Finish

1. `vp run shape` — every cross-link resolves.
2. Update `scope.md`'s **Open**: each `grilling` line now anchors into `design.md`, and each
   line carries its id and what it waits on.
3. Report: the shapes considered and which the caller killed, the seam delta, what is
   **startable now**, and what waits on the principal.
