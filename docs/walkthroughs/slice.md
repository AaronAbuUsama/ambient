# Walkthrough — building a slice

**This is the operator's page.** [`slices.md`](../rules/slices.md) is the rule; this is what you
actually type, what comes back, and how you tell whether it is going well. It is the
counterpart to [`walkthroughs/doctor.md`](./doctor.md), which traces one command
through the code.

Worked against **INGEST**, which is the next slice.

---

## The six steps at a glance

```
  1  map-slice INGEST             →  scope.md            you read it, you correct it
  2  design-slice INGEST          →  design.md           you react to the caller
  3  work the frontier            →  Decided grows       one question per session
  4  plan-slice INGEST            →  spec.md + tickets   you approve the ticket graph
  5  per ticket: new-module · tdd · code-review          one ticket per session
  6  close-slice INGEST           →  the roadmap moves

  every step ends with:  render-slice INGEST   ← the one page, brought up to date
```

**You are in the loop at steps 1 to 4.** Step 5 is the one that runs unattended.

**The page is the thing you look at, not the markdown.** Each step adds its own sections, so
what is missing from it names the step that has not run — you never have to ask where a slice
is.

---

## Step 1 — Map

```
/map-slice INGEST
```

**What it does:** traces the code that already exists, reads the ADRs and their amendments,
measures against real data, and writes `docs/planning/ingest/scope.md`.

**What comes back:** one file with five headings, and a report of the frontier.

**How you tell it went well:**

| Good | Bad |
|---|---|
| Every number says how it was measured | numbers with no instrument |
| **Open** questions name modules and call sites, not just mechanisms | only questions about behaviour |
| **Fog** is not empty on a real slice | an empty Fog means it charted past what it can see |
| It decided nothing | a spec appeared |

**The failure to watch for:** a map that reads like a feature list. IMPORT's grill asked good
questions about timezones and dedup and never asked *which modules exist and what calls
what* — which is how a 176-line handler got built without anyone noticing.

## Step 2 — Design

```
/design-slice INGEST
```

**What it does:** writes the caller before anything it calls exists, reads the interfaces back
off it, draws the call graph from `main.ts` outward, writes the seam delta, and turns every
undecided place into a **branch point** with two candidate shapes as code.

**What comes back:** `design.md`, two diagrams on the page, and a frontier where every
`grilling` question points at a block of the design.

**What you actually do here:** react to the caller. Not approve a plan — *read the code and
say which shape is wrong.* That is the step, and it is the one that has never existed.

| Good | Bad |
|---|---|
| The caller is real call expressions with failure branches | boxes, or a nesting tree |
| Two shapes where the bar is met, one killed by the caller | one shape presented as inevitable |
| Interfaces read **back off** the caller | interfaces invented first, caller fitted to them |
| Every branch point carries both candidates as code | a branch point described in prose |

**The one question worth asking out loud:** *"is any module here becoming the composition
root?"* If a call site is growing arms, the answer is yes — and this is the step where that
costs nothing to fix.

## Step 3 — Work the frontier

Each open question carries a **kind**, and the kind decides who does it:

| Kind | You type | You do |
|---|---|---|
| `research` | nothing — it was fired at step 1 | read the findings file when it lands |
| `spike` | `/prototype` | react to the artefact. That is its whole job |
| `grilling` | `/grilling` | **answer.** The agent must not answer for you |
| `task` | nothing | go and do the thing, then say what you found |

**One decision per session, except research.** The answer appends one line to **Decided** and
the question disappears from **Open**.

**Every `grilling` question arrives with code attached** — it names a branch point in
`design.md`, and both candidate shapes are written out there. If one reaches you without
that, step 2 stopped short; send it back rather than answering in the abstract.

**How you tell it went well:** Fog shrinks as Open shrinks. If Open empties while Fog is
still full, the map was charted too shallow and step 4's gate will refuse.

## Step 4 — Plan

```
/plan-slice INGEST
```

**It refuses to start unless `design.md` exists and Open and Fog are both empty.** That
refusal is a feature — it is the difference between deciding something and letting whoever
implements it decide silently.

**What comes back:** `spec.md` — which links the design rather than restating it — the
collapsed `design.md` with its branch points resolved, and the build tickets.

**Re-read the design before you approve the tickets.** The answers from step 3 have just been
folded into it:

| Part | The question you are checking |
|---|---|
| The caller | does it read like one verb, or is it growing arms? |
| Call graph | does each step's owner match [`seams.md`](../design/seams.md)? |
| Test seams | is each test at the highest useful seam, or reaching inside? |
| Conformance table | does every public symbol have a real caller? |
| Seam delta | are the `seams.md` rows there **before** any module is scaffolded? |
| Branch points | is the section empty, with each loser recorded under Alternatives? |

## Step 5 — Build

One ticket per session, fresh context each time:

```
read the ticket → /new-module if it adds one → /tdd → /code-review → commit
vp check && vp test && vp run shape && pnpm dlx fallow dupes
```

`new-module` **refuses a module with no [`seams.md`](../design/seams.md) row.** That is why the
seam delta is step 2's job and why IMPORT needed a ticket 00 it should not have needed.

**How you tell it went well:** each ticket closes green on its own. A ticket that needs the
next one to go green is not a tracer bullet.

## Step 6 — Close

```
/close-slice INGEST
```

Runs [`definition-of-done.md`](../design/definition-of-done.md) and **reports before writing**.
A failing row is the answer to *"can we close it"* — not something to fix as part of closing.

Rows 1–6 run. Rows 7–10 are read. **Row 10 is the new one**, and the one that would have
caught IMPORT: does the code's call graph match the design's.

---

## Where am I? — `render-slice`

```
/render-slice INGEST
```

**Every step ends by running this, and each adds its own sections** — nine of them, one or two
per step, listed in [the skill](../../.agents/skills/render-slice/SKILL.md). So the page's own
completeness tells you where the slice is: a missing section names the step that has not run.

It reads the same markdown you do and holds no state of its own, so it cannot drift from
reality — and anything it says wrong is a document to fix, never a cache to clear.

**There is deliberately no script behind this.** A slice lives in markdown that an agent can
read directly; parsing those files with a regex to tell you which step you are on would be a
second, more fragile definition of what a slice is. One existed for about an hour and was
deleted.

## What is proven, and what is not

**Honesty about the method itself**, because it has been used on exactly zero slices:

| | Status |
|---|---|
| Build tickets — tracer bullets, blocking edges, one session each | **proven.** Six of them, executed end to end by an agent, all green |
| `close-slice` rows 1–9 | **proven.** Two slices closed on them |
| `slices.md`'s six steps | **unproven.** Written from one slice's failures, then corrected once |
| `map-slice`, `design-slice`, `plan-slice` | **unproven.** `map-slice` ran once and the result is being redone |
| `design.md` | **unproven.** No slice has one yet |
| Row 10, the call graph | **unproven**, and read-not-run until two slices have produced the artefact |

**The one correction already made.** The first version of this had five steps and no Design.
`map-slice` ran once, on INGEST, and returned five `grilling` questions of which **four asked
whether something was in the slice** — size questions about work nobody had designed. That is
what Design being a step fixes, and it is why INGEST is being mapped again rather than
answered.

**INGEST is the test.** If step 2 comes back with a caller you can argue with, the method
worked. If it comes back with a list of questions, it did not, and the deficit is in the
skills rather than in whoever ran them.
