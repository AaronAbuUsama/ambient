---
name: slice
description: Run the next step of a Slice in the ambient repo — read where it is off its own files, run that step's skill, regenerate its page, and report. The entry point for slices.md's six steps. Use when the user says "run INGEST", "what's next on this slice", "continue the slice", or names a slice with no step, and whenever a session starts on slice work.
---

# Run a Slice

**The entry point.** [`slices.md`](../../../docs/rules/slices.md) has six steps and each has a
skill; nothing ran them. Every session began with a human reconstructing which step was next,
and one step shipped without regenerating its page because **no step knew it was a step**.

That is [deficit 10](../../../docs/planning/method/deficits.md), and it is
[deficit 3](../../../docs/planning/method/deficits.md) recurring one level up — *"the pipeline
had no step that knew the pipeline"*, closed once at the edge between two skills and left
unowned in the middle.

## 1 · Ask where it is. Never work it out yourself.

```bash
vp run slice <SLICE>
```

It prints the step, **why** that step, the skill to run, which artefacts exist, every open
question, and whether the page is stale. It is a function of what is on disk —
[`scripts/slice.ts`](../../../scripts/slice.ts) — so it cannot drift from the files the way a
remembered answer does.

**Read down from the most advanced artefact, never up from the first one missing.** SKELETON
and IMPORT closed before this rule existed and have no `scope.md` at all; a ladder that works
upward reports them at step 1. The roadmap's status board is the authority on *closed*, not the
files.

## 2 · Run that step, and only that step

| Step | Skill | Mode |
|---|---|---|
| 1 · Map | [`map-slice`](../map-slice/SKILL.md) | one session |
| 2 · Design | [`design-slice`](../design-slice/SKILL.md) | one session |
| 3 · Work the frontier | none — the *kind* decides | `research`/`spike` are AFK **and parallel**; `grilling` is HITL, **one decision per session** |
| 4 · Plan | [`plan-slice`](../plan-slice/SKILL.md) | one session |
| 5 · Build | [`new-module`](../new-module/SKILL.md), then `tdd`, then `code-review` | **one ticket per session** |
| 6 · Close | [`close-slice`](../close-slice/SKILL.md) | one session |

**Do not skip a step and do not run two.** Each gate exists because skipping it has already
cost something, and every one of those costs is in
[`deficits.md`](../../../docs/planning/method/deficits.md).

**At step 3, fire every `research` and `spike` at once.** They are AFK and nothing serialises
them — INGEST closed four of them inside a single day that way, and three of the four changed
the design.

## 3 · Regenerate the page

[`render-slice`](../render-slice/SKILL.md), always, before reporting. `vp run slice` tells you
when the page is stale; **it went stale three commits deep in one session** because nothing
checked it and the work got interesting.

## 4 · Report — and this has a shape

**Two rules generate the rest:**

1. **Write for someone who has read nothing.** Not the rule, not the scope, not the design.
   Expand every id the first time it appears; every question is a sentence ending in a question
   mark. No `§`, no filename standing in for a thought.
2. **Do not re-render the page.** Say what *changed* and point at the page. The page is the
   process; prose is a worse copy of it.

````markdown
# Where we are

<SLICE> is one slice on the roadmap. Every slice goes through the same six steps.

| Step | State | What it produces |
|---|---|---|
| **1 · Map** | ✅ done | … |
| **2 · Design** | ⬅ **just finished** | … |
| … | | |

<one line: the page has all of it, and which section is worth reacting to>

# What <SLICE> is, in two lines
<no jargon, no ids, one measured number so it is concrete>

# What this step decided
<the shapes that went up, which one the caller killed, and the mechanism — not the taste>

# The open questions

Every question gets a short id so the documents can point at it. That is all the
letters mean:

| | Kind | Who answers it |
|---|---|---|
| **R** | research | a background agent, reading source code |
| **S** | spike | throwaway code, run to find out |
| **T** | task | a human goes and looks something up |
| **G** | grilling | **you.** Only you can decide it |

## ✅ Answered      <id> — <question>  ·  the answer, with its instrument
## 🟢 Open — nobody is waiting on you
## 🔴 Open — these are yours

# Housekeeping
<checks, commits, anything you want permission for. Three lines maximum.>
````

**Never**, each because it happened:

| Never | Because |
|---|---|
| A bare id in a heading or a lead sentence | *"What is T1? I can't see T1 anywhere"* |
| A question written as a fragment — *"one Chat, or the seed"* | that is a filename, not a question |
| A `§` reference standing alone | it points into a document the reader has not opened |
| Re-narrating the page's **Where it stands** in prose | the page does it better |
| An answer without its question | *"I don't even know what the question was"* |
| What is open, without what just closed | the frontier is meaningless without what produced it |
| An ASCII box-drawing header | tried twice, unreadable both times |

## Finish

Run the four checks — `vp check`, `vp test`, `vp run shape`, `pnpm dlx fallow dupes` — then
commit. **Never in one command**; that has shipped a lint error twice.
