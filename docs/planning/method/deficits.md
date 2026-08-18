# The method — what is missing, and the evidence

Recorded 2026-08-17, straight after IMPORT closed. **This is a scope, not a spec.** It
records what the build process did not have, and what that cost, so the fix was designed
against evidence rather than a feeling.

**There are three cohorts.** The first, below, was found by *reading* what IMPORT produced.
The second was found on 2026-08-18 by *running* the new rule on INGEST — nine defects the
artefacts hit at step 1, and six the principal hit in the process itself. A method that has
been read is not a method that has been used, and the second cohort is that difference.
The **third** is the step report itself, which took two more rounds of being unreadable before
it got a specification — that specification is the template at the foot of this file.

**The slice is METHOD, and most of this is now closed.** What each deficit became:

| Deficit | Status |
|---|---|
| 1 · the call graph was never drawn | **closed** — Design is step 2 of [slices.md](../../rules/slices.md) and produces `design.md`, definition-of-done row 10 reads it, and [walkthroughs/import.md](../../walkthroughs/import.md) is the worked example |
| 2 · `design-it-twice` skipped where it applied | **closed** — [ADR 004](../../adr/004-transcript-line-is-a-union-on-provenance.md) supplies it late, and `plan-slice` checks the bar from now on |
| 3 · the pipeline did not know its preconditions | **closed** — `plan-slice` names `new-module`'s seam-row precondition; the seven skills it dispatches to are vendored, so they always resolve |
| 4 · the grill was not rooted in modules | **closed** — `map-slice` traces callers and dependents before a question is asked |
| 5 · the documentation layout mixed three kinds of thing | **closed** — six directories, one statement per home, decided by [docs/README.md](../../README.md); nothing loose at the docs root |
| 6 · the conventions were not cohesive enough to hand over | **closed** — [walkthroughs/slice.md](../../walkthroughs/slice.md) is the operator's page, and `render-slice` draws a slice as one page |
| **carried** · the Receipt described the last run | **closed** — it now keeps the run that wrote the lines and appends to `reruns` |
| **carried** · `cli` was the composition owner | **closed** — the operation moved to the `import` module; the handler is 74 lines, from 176 |

**Still open, deliberately:** the **template repo**. It is a plan, not a need — deriving it
before the method has been used on a real slice would freeze conventions from one-and-a-half.

The rest of this document is the evidence, kept as written.

---

## The one-line diagnosis

**We codified the artefacts and not the method.**

Eleven files under [`docs/rules/`](../../rules/) say what a *file* must look like — six slots,
no `throw`, 250 lines, `~/modules/…`, no `any`. `vp run shape` enforces every one.

**Nothing says how a decision becomes a file.** So when the method mattered, it fell back to
generic skills that do not know this repository. The shape survived, because a checker
defends it. The process degraded, because nothing does.

---

## What was different about IMPORT, and it is measurable

| | SKELETON | IMPORT |
|---|---|---|
| Interfaces designed before code | **yes** — design-it-twice on two seams | **no** |
| ADR for a load-bearing interface | **two** (001 `home`, 002 `work`) | **none.** ADR 003 is about a *mechanism*, not an interface |
| Call-graph artefact | [`walkthroughs/doctor.md`](../../walkthroughs/doctor.md) | **none** |
| Seam rows existed before scaffolding | yes | **no — it became ticket 00** |
| Tests derived from | the spec's §4 gate, written first | the model's judgement, per ticket |

### Deficit 1 — the call-graph artefact exists, and was skipped

[`README.md`](../../../README.md) calls `walkthroughs/doctor.md` *"the shortest path to owning
this codebase"* — it traces one command from keypress to output through every file it
touches. **That is the call graph, and this repo invented it, praised it, and then did not
require it.** There was no walkthrough for `import` when this was written, and `import` is a
real verb with four modules behind it. [walkthroughs/import.md](../../walkthroughs/import.md)
now exists — written after the code, which is the wrong order and says so.

**And it is where tests come from.** Every arrow in a trace is a seam; every seam is a test
point. Letting the model decide what to test, per ticket, is what replaced this.

### Deficit 2 — `design-it-twice` has a stated trigger, and `transcript` met it

[`seams.md`](../../design/seams.md) says it is spent *"only where an interface is written
through by many callers **and** hard to change later."*

`transcript` is written through by **two Readers plus KNOWLEDGE**, and its line format is on
**13,134 lines on disk right now**. It met the bar on both clauses and got a single design,
authored inside a grill round, with no ADR and no alternative considered.

It may well be right. Nobody looked.

### Deficit 3 — the pipeline did not know its own preconditions

[`new-module`](../../../.claude/skills/new-module/SKILL.md) refuses a module with no
`seams.md` row: *"A module with no row is not a module yet."* `grill-with-docs` does not know
that skill exists, so the grill produced a module boundary with no seam rows, and the gap was
only caught while writing tickets — by reading the skill on the way past.

**Ticket 00 exists because the pipeline had no step that knew the pipeline.**

### Deficit 4 — the grill was not rooted in modules

The round asked good questions about *mechanism* — timezone, dedup, media states. The
questions that decide the code — **which modules exist, what calls what, in which order,
returning what** — arrived because they were forced in, not because the skill asks them.

### Deficit 5 — the documentation layout mixes three kinds of thing

`docs/design/` holds settled truth (`product.md`, `seams.md`) beside method
(`roadmap.md`, `definition-of-done.md`). Walkthroughs sat loose at `docs/`. Per-slice material
was split across `docs/planning/<slice>/` and `docs/adr/`. Three kinds, two-and-a-half folders.

**Closed.** Six directories, each holding one kind of statement, with the test that decides
which in [docs/README.md](../../README.md). Nothing at the docs root but that map.

### Deficit 6 — the conventions are not cohesive enough to hand over

They are good enough for the people who wrote them. The test of cohesion is whether a fresh
agent, given only the repo, follows them without a human noticing gaps — and this session
found gaps three times.

---

## What to steal, and what to refuse

From `wayfinder`, **the ticket types**: it recognises that some work must be *prototyped*,
some *researched*, some *decided*, and only then *built*, and it picks per item. That is the
right idea and nothing here has it — every ticket IMPORT produced was a `build`.

**Refuse its sprawl.** It fans into many documents and becomes a documentation exercise. The
constraint that prevents that: **a ticket's output is one file, and a `decide` ticket that
produces more than an ADR has failed.**

Proposed kinds, each with a hard output:

| Kind | Output, capped | Done when |
|---|---|---|
| `learn` | one findings file, cited to primary sources | the question is answered or named unanswerable |
| `try` | throwaway code, kept as evidence, plus one paragraph | the design question is settled |
| `decide` | **an ADR, or one spec section. Nothing else.** | the alternatives were written down and one won |
| `build` | code, tests, a green gate | the gate rows pass |

---

## The template repo

Wanted: *"this is how I want to start all of these sorts of projects."*

**Derive it, do not design it.** Extracting a template now — from one-and-a-half good slices —
freezes conventions that have not been used twice. INGEST is the test: drive it with the new
pipeline, and extract whatever survives. That is this repo's own principle applied to itself
— *operate it by hand until it is good, then automate.*

## Open, for the scope

- **What is in scope**: only the missing skills, or the docs layout too, or the template?
- **Fork or wrap** the Mattpocock skills? The vocabulary ones (`codebase-design`,
  `domain-modeling`) are generic and good and we already depend on their words. The pipeline
  ones (`grill-with-docs`, `to-spec`, `to-tickets`) are the ones that did not fit.
- **Does the method get a gate?** A rule that cannot be run is not a rule
  ([`legibility.md`](../../rules/legibility.md)) — so what checks that a walkthrough exists,
  or that a seam row precedes a module?

## Carried forward, not to be lost

- **The Receipt describes the last run, not the import.** After a second identical import it
  reads `linesWritten: 0` beside a 13,134-line Transcript. Provenance-confusing; the fix is
  to keep the first run's numbers and record re-runs, or name receipts by run.
- **INGEST's open question** — how a one-shot full sync survives a crash between seven
  ~4,800-message batches, on a callback that must not block. **Answered 2026-08-18** by `R1`
  and `R2`: it does not survive one. See [ingest/scope.md](../ingest/scope.md), Decided 13–18.

---

# Second cohort — found by running it

**2026-08-18, INGEST step 1.** The first real run of the six-step rule. Everything here was
produced by *using* the method, not by reading it, which is the only reason any of it was
found: **nine of these were invisible until a slice existed that was not closed.**

| # | Deficit | Where the fix goes |
|---|---|---|
| **The process has no surface** — raised by the principal, and the more serious group | | |
| 7 | The step report has no specification | [slices.md](../../rules/slices.md), and each step's skill |
| 8 | The frontier is reported cut off from what produced it | [slices.md](../../rules/slices.md) § 3 |
| 9 | Research is reported as answers with no questions | [map-slice](../../../.agents/skills/map-slice/SKILL.md) *Finish* |
| 10 | ~~There is no entry point. Nothing runs a step.~~ **CLOSED 2026-08-18** | [`slice`](../../../.agents/skills/slice/SKILL.md) + [`scripts/slice.ts`](../../../scripts/slice.ts) |
| 11 | `render-slice`'s job is not legible from outside it | [render-slice](../../../.agents/skills/render-slice/SKILL.md) |
| 12 | The up-front / just-in-time planning boundary is nowhere written | [slices.md](../../rules/slices.md) *Why*, or [roadmap.md](../../design/roadmap.md) |
| **The artefacts break at step 1** — found by the run | | |
| 13 | The page template threw on any slice before step 6 | **fixed this run** |
| 14 | The template hardcoded one slice's name and status | **fixed this run** |
| 15 | The diagram checklist passed on an unreadable diagram | [diagrams.md](../../../.agents/skills/render-slice/references/diagrams.md) |
| 16 | `diagrams.md` has no geometry for the case it tells you to use | [diagrams.md](../../../.agents/skills/render-slice/references/diagrams.md) |
| 17 | `map-slice` and `sections.md` disagree about what step 1 fills | one of the two is wrong |
| 18 | `sections.md` contradicts itself on empty sections | [sections.md](../../../.agents/skills/render-slice/references/sections.md) |
| 19 | Nothing says who owns an answer that lands in the wrong step | [slices.md](../../rules/slices.md) § 3 |
| 20 | The map can permanently delete scope, and that is a decision | [slices.md](../../rules/slices.md) § 1 |
| 21 | Nothing asserts the page was regenerated | [definition-of-done.md](../../design/definition-of-done.md) — carried, confirmed |

---

## The process has no surface

### Deficit 7 — the step report has no specification, so it is improvised every time

[slices.md](../../rules/slices.md) specifies **artefacts** and **gates** exhaustively. It says
nothing about what the agent *says* when a step ends. The only reporting instruction in the
whole chain is one line in `map-slice`:

> Report the frontier: how many questions are `now`, and what the rest wait on.

That was followed exactly, and exactly that was insufficient. The principal's words:

> *"this response format is horrible … it's just highly disorientating … I need to know where
> I am visually."*

**The root cause is the more useful half.** The page *is* the process — twelve sections,
grouped, with a **Where it stands** table naming all six steps. The report re-narrated that in
prose and did it worse. **A step report must not re-render the page.** It owes a short header
— where we are, and where to look — and then only what *changed*.

The fix is a cap, not a template: an orientation header of a few lines, a pointer to the page,
and no prose the page already holds better.

### Deficit 8 — the frontier is reported cut off from what produced it

The report listed what was open. It did not list what had been **done**, so the open items had
nothing to be relative to.

> *"the frontier is not just what's literally on the frontier, is what's already been done …
> it doesn't make sense if it's not connected to what's coming before it."*

The rule made this easy to get wrong: step 3 is named *"Work the frontier"* and the frontier
is defined as the **Open** heading alone. But an open question is only legible beside the
answers already banked — three of INGEST's nine closed inside step 1, and a report showing six
open while saying nothing about the three closed describes a slice that has not moved.

### Deficit 9 — research is reported as answers with no questions

The report gave findings — *"media downloads serially inside acceptance"* — without ever
stating what had been asked.

> *"I don't even know what the question was … you didn't say, okay, here's the research,
> here's what was done, here's what the research question was, here's what came back."*

**And `research` is precisely the kind where this matters most.** It is the one kind that is
**AFK and parallel** — [slices.md](../../rules/slices.md) says so and makes it the exception to
one-decision-per-session — so it is the one kind whose dispatch the principal never witnesses.
Every other kind he would see happen. The kind that most needs its question restated is the
one with no instruction to restate it.

### Deficit 10 — there is no entry point, and nothing runs a step

This is the one that matters.

Six phases of work ran off **one long human prompt**. The skills were invoked — `map-slice`
and `render-slice` both ran — but nothing **drove** them: nothing read where the slice was,
picked the step, chained `render-slice`, and reported.

> *"there should be like one skill to drive the whole process … instead of having to give you
> that brain dump."*

**It is deficit 3 recurring one level up.** That one read: *"the pipeline had no step that knew
the pipeline."* It was closed by making `plan-slice` name `new-module`'s precondition — which
fixed the edge between two skills and left the pipeline itself unowned. Every skill now names
`render-slice` in its *Finish*, and that is a **convention an agent must remember**, not a call
site. No step knows it is a step.

### Deficit 11 — `render-slice`'s job is not legible from outside it

> *"I'm not even sure what render-slice is even doing."*

It is called at the end of every step, writes a **gitignored** file, and reports a byte count.
Nothing says what it read, which sections it filled, which it left empty, or what changed since
the last render. Its own *Finish* asks for exactly that report — and the report has no
consumer, because there is no step report (deficit 7) to carry it.

### Deficit 12 — the boundary between up-front and just-in-time planning is nowhere written

The vendored skills want all wayfinding **up front**. This repo rejected that: planning is
just-in-time, per slice, which is what [slices.md](../../rules/slices.md) is. But
[roadmap.md](../../design/roadmap.md) was written up front and is **correct** to have been —
the slice names, their order, and what breaks going backwards are not derivable slice by slice.

**So there are two kinds of planning and the line between them is stated nowhere.** The
principal's framing:

> *"you still need to do some overall planning first — what is the general evidence and stuff —
> but the tactical should probably be changed."*

Nothing tells a fresh agent which is which, so the roadmap reads as a contradiction of the rule
rather than its complement.

---

## The artefacts break at step 1

### Deficit 13 — the page template threw on any slice before step 6

`shell.html` dereferenced `p1`–`p4` and `c1`–`c4` unconditionally. One missing block raised a
`TypeError`, which killed the whole IIFE — **so the nav array never built and section switching
never bound.** A slice at step 1 would have rendered as one scrolling page with no navigation
at all.

**Cause: the template was extracted from one rendered page** — IMPORT, closed, twelve sections,
exactly four data blocks — so the shape of that page became a hard requirement of every page.

**It was predicted in writing and shipped anyway.** [SESSION-HANDOFF.md](SESSION-HANDOFF.md):
*"The template has only rendered a closed slice. Every section had content; the empty-state path
is untested, and INGEST will test it at step 1."*

**Fixed this run.** Blocks are discovered, keyed by a `data-mode`, and skipped when absent.

### Deficit 14 — the template hardcoded one slice's name and status

`<title>IMPORT — slice</title>`, `<h1>IMPORT</h1>`, and a rail foot reading `CLOSED · 6/6` on a
slice at step 1. Same cause as 13: extracted, not parameterised. **Fixed this run** —
`<!--SLICE-->` and `<!--STATUS-->`.

### Deficit 15 — the diagram checklist passed on an unreadable diagram

Two defects, both obvious in one second of looking, both invisible to every numeric check in
[diagrams.md](../../../.agents/skills/render-slice/references/diagrams.md):

- **Four connectors shared one vertical corridor** at `x=356`, two of them overlapping in `y`.
  They rendered as **one continuous line**; which question fed which gate row was untraceable.
- **Two legend strings overran their slot** and collided with the next swatch.

The checklist says *"No two connectors share an attach point; shared edges fanned ≥12px."* They
did not share an attach point — they shared the whole corridor — so the rule never fired. And
there is **no rule at all** about text width against available slot width.

**This is the third recorded instance of the standing lesson**, and the first where the lesson
was already written at the foot of the file being followed: *"Then open the page and look at
it. Measuring the DOM is not looking."*

**Two rules are missing**: one corridor per connector, ordered so runs nest and nothing crosses;
and a stated character budget per legend slot and per box field line.

### Deficit 16 — `diagrams.md` has no geometry for the case it tells you to use

Recipe C says: *"Above 6 questions, group the homogeneous ones into a single box listing them as
field lines."* Every solved coordinate in that recipe is for a **240×48** box. A box with three
field lines is 96 tall.

INGEST opened nine questions, so the grouping instruction fired **immediately**, and the
geometry had to be solved freehand — **which is the exact thing the file exists to prevent**:
*"Do not invent coordinates. Freehand placement is what produces collisions."*

### Deficit 17 — `map-slice` and `sections.md` disagree about what step 1 fills

| Says | What |
|---|---|
| `map-slice` *Finish* | *"Regenerate the page — this fills sections **1, 2, 4 and 8**."* |
| `sections.md` | *"A slice at step 1 has **three**."* |

Sections 4 and 8 are **Modules and interfaces** and **State and failure** — both in group
DESIGN, both impossible before step 2. `sections.md` was followed. Nothing catches the
disagreement, and one of the two files is simply wrong.

### Deficit 18 — `sections.md` contradicts itself on empty sections

> *"Build only the sections that have content."*

against

> *"Empty sections say which skill fills them and what will be in them. An empty section is
> information, not an apology."*

Resolved by judgement toward rendering stubs — the page's completeness can only *be* the
progress bar if the incomplete sections are on it — but a rule conflict was resolved silently
by an agent, which is the failure mode this whole directory exists to prevent.

### Deficit 19 — nothing says who owns an answer that lands in the wrong step

`map-slice` instructs that research be fired **at step 1**. All three of INGEST's answered
during step 1. Recording an answer is **step 3's** job — *"answers, appended to Decided."*

They were appended and the page re-rendered, which was right for the work and **crossed a step
boundary with nothing in the rule permitting it and no requirement to say so.** The rule needs
one line: an answer is recorded when it lands, whatever step is running.

### Deficit 20 — the map can permanently delete scope, and that is a decision

[slices.md](../../rules/slices.md) § 1: *"Out of scope is a scoping act, not a step on the route
… it never graduates."* The map writes it, and the map is the agent's.

The same rule says: **facts are the agent's job, decisions are the principal's.**

INGEST's map ruled the pairing screen out of scope. It may well be right. But *permanently
deleting scope* is a decision wearing a scoping act's clothes, and the rule hands an agent the
pen with no gate — it was flagged in the report only because the agent chose to. A `grilling`
line, or an explicit *"Out of scope is provisional until the principal confirms it"*, would
close it.

### Deficit 21 — nothing asserts the page was regenerated

Carried from [SESSION-HANDOFF.md](SESSION-HANDOFF.md) and **confirmed still true**. Every step
is required to end by regenerating the page; no definition-of-done row, and no check, would
notice a page a step out of date. Same class as the row that already exists for the call graph
— read, not run.

---

## What the second cohort says as a whole

The first cohort was *"we codified the artefacts and not the method."*

The second is narrower and sharper: **we codified the method's outputs and not its operation.**
Every one of 7–12 is a missing *surface* — no entry point, no step report, no statement of
where you are — and every one of 13–18 is an artefact that only worked for the one state it was
authored against.

Both have the same shape as deficit 3, which is the one this repo has now hit three times: **a
pipeline where every part knows its own job and nothing knows the pipeline.**

---

# Third cohort — the report itself

**2026-08-18, straight after step 2.** Deficits 7, 8 and 9 said the step report has no
specification. Two more rounds of it being unreadable produced the specification, below, plus
two defects those rounds exposed.

| # | Deficit | Where the fix goes |
|---|---|---|
| 22 | **Ids were used as if they were words.** `T1`, `S1`, `R1` in a report to someone who has never opened `scope.md` | the template below |
| 23 | The frontier diagram carries **filenames, not questions** — `T1  linked-device slots free` | [diagrams.md](../../../.agents/skills/render-slice/references/diagrams.md) recipe C |

### Deficit 22 — ids were used as if they were words

Two reports in a row led with `T1` and `S1` and left the principal to guess.

> *"What is T1 and S1? How am I supposed to see T1 and S1? … you're using jargon right now."*

The ids are real and load-bearing — they are how `scope.md`, `design.md` and the page point at
one another. **The defect is not that they exist, it is that they were never introduced and
never expanded.** An id is an index into a document the reader has not read.

### Deficit 23 — the frontier diagram carries filenames, not questions

Recipe C's field lines are ~40 characters, so each question got compressed to
`T1  linked-device slots free` and `G2  § The caller`. **Both are labels for something the
reader is expected to already know.** The diagram whose entire job is to show what is open
shows five strings that cannot be read without a second document.

The recipe's own budget is the cause — 240-wide boxes at 8–9px mono. **A question does not fit
in a node.** The fix is that recipe C's box carries the *kind and the count*, and the questions
themselves live in the table beside it, in full. What the diagram is for is the **shape** —
who answers, what waits on what — not the wording.

---

## The step report — the template

**Moved 2026-08-18 to [`slice`](../../../.agents/skills/slice/SKILL.md) § 4**, the skill that
owns reporting. A template is a rule, and a rule does not live in the record of what was wrong
— [language.md](../../rules/language.md), one statement one home. What follows is kept as the
evidence that produced it.

### As it was first written

**This is the fix for deficits 7, 8, 9, 11 and 22**, and it is a cap on length as much as a
shape. Every step of [slices.md](../../rules/slices.md) ends with this, and nothing in it may
restate what the page holds better.

**The two rules that generate the rest:**

1. **Write for someone who has read nothing.** Not the rule, not the scope, not the design.
   Every id is expanded the first time it appears; every question is a sentence ending in a
   question mark; no `§`, no filename standing in for a thought.
2. **Do not re-render the page.** Say what *changed* and point at the page for the rest. The
   page is the process; a prose copy of it is a worse copy.

````markdown
```
<SLICE>   ①Map ✔  ②Design ✔ ← just ran  ③Frontier ← next  ④Plan  ⑤Build  ⑥Close
```
↑ **Delete this line.** ASCII rules are hard to read; use the table. It is here only to say
  it was tried and rejected.

# Where we are

<SLICE> is one slice on the roadmap. Every slice goes through the same six steps.

| Step | State | What it produces |
|---|---|---|
| **1 · Map** | ✅ done | ... |
| **2 · Design** | ✅ **just finished** | ... |
| **3 · Work the frontier** | ⬅ **next** | ... |
| 4 · Plan | — | ... |
| 5 · Build | — | ... |
| 6 · Close | — | ... |

<one line: the page has all of it, and which section is the one to react to>

# What <SLICE> is, in two lines

<no jargon, no ids. What a person would say out loud. Include one measured number
 so it is concrete.>

# What this step decided

<the shapes that went up, which one the caller killed, and WHY — the mechanism,
 not the aesthetics. Two short paragraphs, then a table if the trade is real.>

# The open questions

Every question gets a short id so the documents can point at it. That is all the
letters mean:

| | Kind | Who answers it |
|---|---|---|
| **R** | research | a background agent, reading source code |
| **S** | spike | throwaway code, run to find out |
| **T** | task | a human goes and looks something up |
| **G** | grilling | **you.** Only you can decide it |

## ✅ Answered
**<id> — <the question, as a question>**
<the answer, in plain words, with its instrument>

## 🟢 Open — nobody is waiting on you
**<id> — <the question, as a question>**
*Why it matters:* <one line>  ·  *Blocked by:* <or "nothing — I can run this now">

## 🔴 Open — these are yours
**<id> — <the question, as a question>**
<enough context to answer it without opening a file. Candidates, if there are candidates.>

# Housekeeping

<checks, commits, and anything you would like permission for. Three lines maximum.>
````

**What the template forbids**, each because it happened:

| Never | Because |
|---|---|
| A bare id in a heading or a lead sentence | deficit 22 |
| A question written as a fragment — *"one Chat, or the seed"* | it is a filename, not a question |
| A `§` reference standing alone | it points into a document the reader has not opened |
| Re-narrating the page's **Where it stands** in prose | deficit 7 — the page does it better |
| Reporting an answer without its question | deficit 9 |
| Reporting what is open without what just closed | deficit 8 |
| An ASCII box-drawing header | tried twice, unreadable both times |
