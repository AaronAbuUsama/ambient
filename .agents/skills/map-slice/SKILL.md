---
name: map-slice
description: Map a roadmap slice in the ambient repo before anything is specified — trace the code that already exists, read the history, measure against real data, and write docs/planning/<slice>/scope.md with its destination, what is decided, the open questions each carrying a kind, the fog, and what is out of scope. Use when a slice becomes active, when the user says "scope INGEST" or "map the next slice", or when a spec is being asked for and no scope.md exists.
---

# Map a slice

Step 1 of [`slices.md`](../../../docs/rules/slices.md). It produces one file —
`docs/planning/<slice>/scope.md` — and **decides nothing**.

**Do not write a spec in this session, and do not design one either.** The gate to the next
step is that every open question is either kinded or in the fog. Designing the shape is
[`design-slice`](../design-slice/SKILL.md) at step 2, answering questions is step 3, and
specifying is step 4.

## Before you start

Read, in this order: [`AGENTS.md`](../../../AGENTS.md),
[`CONTEXT.md`](../../../CONTEXT.md), the slice's row and dependency edges in
[`roadmap.md`](../../../docs/design/roadmap.md), and
[`seams.md`](../../../docs/design/seams.md) for the modules that already exist.

Then the history: any earlier `scope.md`, the ADRs the roadmap's Decision index names for
this territory, **and their `## Amendments` sections** — an ADR that was corrected is more
informative than one that was not.

## 1 · Name the destination

One or two lines: what reaching the end of this slice looks like. **It fixes the scope**, so
everything else is judged against it, and *out of scope* means nothing until it exists.

## 2 · Find the facts — this is the bulk of the work

**Facts are your job. Decisions are the principal's.** Never ask for something you can
measure.

- **Trace the code that already exists.** Who calls what today, what depends on the modules
  this slice will touch, what a new module would have to fit between. Name files and lines.
- **Measure against real data** wherever any exists, and **state the instrument**. A count is
  a property of how it was taken: the same question about one archive gave 177, 172, 105 and
  51 depending on the regex, and only the last one used the structure the source actually
  carries.
- **Separate fact from inference, visibly.** A number you measured and a number you reasoned
  to are different kinds of thing and must not sit in one sentence.
- **Doubt a measurement that contradicts what the principal knows about their own data.**
  Three times in one session he was right and the measurement was wrong.

## 3 · Write `scope.md` — five headings, no others

```markdown
## Destination     one or two lines
## Decided         one line per answer, pointing at whatever holds the detail
## Open            questions sharp enough to state now, each carrying a kind
## Fog             real, in scope, not yet sharp enough to phrase
## Out of scope    ruled beyond the destination; never graduates
```

**Open** — each line carries an **id**, a **kind**, and **what it waits on**, so the frontier
is a graph rather than a list:

```
R1  research   now       — <the question>
S1  spike      now       — <the question>
T1  task       after R1  — <the question>
G1  grilling   after design — <the question about the destination>
```

`now` means **dispatchable this minute**. Say how many are `now` when you report.

| Kind | Use when |
|---|---|
| `research` | a fact exists somewhere outside this working directory |
| `spike` | you cannot judge it without something concrete to react to |
| `grilling` | only the principal can decide it |
| `task` | somebody has to go and do a thing before anything can be decided |

**A question about the *shape* is not yours to ask.** *Which module owns this · what does the
caller look like · where does composition live · is X big enough to be in this slice* are all
answered by building the shape at step 2. Ask about the **destination** — what this slice is
for, what it must never get wrong. Anything shaped goes to `design-slice`, and comes back as
a `grilling` line anchored to a block of `design.md`.

This is the failure the step exists to prevent. INGEST's map asked five `grilling` questions
and **four were "is this in the slice?"** — questions that size work nobody had designed, put
to the principal with no code to look at.

**Fog** — the test is whether you can state the question precisely **now**, never whether
you can answer it. Anything coarser stays here. **Do not pre-cut fog into question-sized
pieces**; one patch may graduate into several questions, or none.

**An open question is a line, not a file.** It becomes a file only if it must outlive this
session or run AFK in parallel.

## 4 · Fire the research

For each `research` question, dispatch a subagent using the vendored
[`research`](../vendor/research/SKILL.md) skill. They are AFK and parallel —
nobody is waiting on them, and they are the exception to one-decision-per-session.

## Finish

1. `vp run shape` — every cross-link in `scope.md` resolves.
2. **Regenerate the page** — `render-slice <SLICE>`. This fills sections 1, 2, 4 and 8.
3. Report the frontier: how many questions are `now`, and what the rest wait on.

**Stop there.** Mapping is one session's work and it resolves nothing. The next step is
[`design-slice`](../design-slice/SKILL.md), **not** grilling.
