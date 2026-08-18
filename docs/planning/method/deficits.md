# The method — what is missing, and the evidence

Recorded 2026-08-17, straight after IMPORT closed. **This is a scope, not a spec.** It
records what the build process did not have, and what that cost, so the fix was designed
against evidence rather than a feeling.

**There are four cohorts.** The first, below, was found by *reading* what IMPORT produced.
The second was found on 2026-08-18 by *running* the new rule on INGEST — nine defects the
artefacts hit at step 1, and six the principal hit in the process itself. A method that has
been read is not a method that has been used, and the second cohort is that difference.
The **third** is the step report itself, which took two more rounds of being unreadable before
it got a specification — that specification is the template at the foot of this file. The
**fourth** came out of step 5, the first time Build ever ran under the rule, and all three of
its entries are about what the method does when it is *wrong* rather than when it is working.

**Deficits are logged here and not fixed.** Standing instruction from the principal,
2026-08-18: *"I don't want anyone to fix the defects — if anyone's tried to fix defects,
revert them."* This file is a record, and the record is the whole deliverable. A deficit
that arrives with a fix attached has cost a decision that was not the agent's to make —
what the method becomes is METHOD's to decide, in one pass, once the evidence has stopped
accumulating. **Cohort four has already had one fix written and reverted under this rule;
that retraction is recorded at deficit 25 rather than erased.**

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
| 10 | **There is no entry point. Nothing runs a step.** | **not a deficit.** Built, and reverted six minutes later because the principal does not want one. See 24 |
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

# Fourth cohort — what the method does when it is wrong

**2026-08-18, INGEST step 5.** The first time Build ever ran under the rule. Steps 1 to 4
produce documents and the rule has a great deal to say about them; step 5 produces code,
commits and retractions, and it turns out to be where the method is thinnest.

The three below share one shape, and it is not the shape of the earlier cohorts. Deficits
1–6 were *"we codified the artefacts and not the method"*; 7–21 were *"we codified the
method's outputs and not its operation."* **These are: the method has a forward gear and no
reverse.** It can close a deficit, assert a precondition and answer a question. It cannot
un-close, enforce, or record a decision made while building.

| # | Deficit | Where the fix goes |
|---|---|---|
| 24 | **A deficit can be closed and cannot be un-closed.** 318 lines were built and reverted, and this document says it never happened | this file's status table, and [decisions.md](../../rules/decisions.md) |
| 25 | **`new-module`'s precondition is a sentence, so it has never once refused.** Ticket 00 exists in both slices that have had one | **written, proven, and reverted.** Open — see below |
| 26 | **Build makes decisions and the method has nowhere to put them.** Two were made inside ticket 00 alone | [slices.md](../../rules/slices.md) § 5 |

### Deficit 24 — a deficit can be closed, and cannot be un-closed

`0c7eae3` at **09:55:49** closed deficit 10. It added `scripts/slice.ts` (178 lines),
`.agents/skills/slice/SKILL.md` (122 lines) and its symlink, a row in
[AGENTS.md](../../../AGENTS.md)'s skill table, six lines to
[slices.md](../../rules/slices.md), and flipped this document's own entry for 10.

`00d9b09` at **10:01:10** reverted all 318 lines. Its message is `git revert`'s default —
*"This reverts commit 0c7eae3…"* — and **nothing anywhere says why.**

The revert was clean, which is the problem. It took the *record* back along with the work,
so line 175 above reads *"there is no entry point, a new skill"* exactly as it did before
09:55, and the document now asserts something that is true only by accident. A reader who
finds this file tomorrow learns that the entry point was never attempted. A reader who runs
`git log` learns it existed for six minutes. Those are two answers alive in two places, which
is the failure [decisions.md](../../rules/decisions.md) was written to stop:

> *"A silently corrected ADR reads as if the design were right first time, which teaches the
> next reader nothing and quietly removes the evidence."*

That rule governs ADRs and the **Decided** list and stops there. It never occurred to it that
this file — the record of what is wrong — could itself need an amendment, and its own check
line already admits the weak spot: *"that a correction was written as an amendment rather than
an edit to the body is **not currently checked**."*

**The status vocabulary is the concrete gap.** The table at the top of this file has `closed`
and it has open. There is no `retracted`, so there is nowhere to put *built, reverted, and
here is what we learned* — and a deficit that has been attempted once is worth strictly more
than one that has not, because the next attempt starts from the reason the first came out.

**This entry does not say the revert was wrong.** It says that whatever the reason was, it is
not written down, and six minutes is far too fast for the reason to have been nothing.

**Amended 2026-08-18, and the reason is not what this entry guessed.** Asked directly, the
principal said: *"I didn't want an entry point."* Deficit 10 was therefore never a deficit —
it was a proposal, recorded in the shape of a defect, and it got built because a shape it was
never checked against read as a mandate. The revert was correct, complete and fast for exactly
that reason.

**Which sharpens this entry rather than dissolving it.** The method had nowhere to say *"10 is
a proposal, not a defect, and it is declined"* — so the only vocabulary available was build it
or delete it, and both were used within six minutes. The missing status is still missing, and
it now needs two words rather than one: `retracted` for work that was tried and pulled, and
`declined` for a deficit the principal does not accept. Neither exists, and this file's only
alternative to them is silence.

### Deficit 25 — `new-module`'s precondition is a sentence, so it has never once refused

[`new-module/SKILL.md:11`](../../../.agents/skills/new-module/SKILL.md) is quoted in three
documents as the thing that stops a module existing before its seam row:

> *"the module must already own something in `docs/design/seams.md` … A module with no row
> is not a module yet."*

**It is prose in a skill file.** It refuses only if the agent reading it decides to. Nothing
runs, and [legibility.md](../../rules/legibility.md) has the sentence for exactly this: *a
rule that cannot be run is not a rule.*

[`scripts/shape.ts`](../../../scripts/shape.ts) has three sections — source files (`:73`), the
six slots (`:105`), cross-links (`:121`). The six-slot loop reads `src/modules/*` and asks
whether each has its files. **Nothing reads `seams.md` at all.** So for the whole of INGEST's
steps 1–4, `ingest` was a module in `design.md`, in the call graph, in five tickets, and in
neither `seams.md` nor any check — and `vp run shape` printed `clean` on every one of those
days.

**This is deficit 3 for the third time**, and the second time it was declared closed. That
closure reads: *"`plan-slice` names `new-module`'s seam-row precondition."* Naming a
precondition in a second document is not checking it — it is the same sentence, in one more
place, still unexecuted. The cost is visible and identical in both slices that have reached
step 5:

| | IMPORT | INGEST |
|---|---|---|
| Ticket `00` | `00-seam-rows.md` — `archive`, `transcript` | `00-seam-rows-and-libsql.md` — `channel`, `ingest` |
| Writes code | no | no |
| What it does | copies the rows a design already wrote | copies the rows a design already wrote |

Two files, two slices, one job. **`00` is not a ticket, it is a missing check with a number.**

**A fix was written, it worked, and it was reverted. This deficit is open.**
[`shape.ts`](../../../scripts/shape.ts) grew a fourth section — every module named in a
`docs/planning/<slice>/design.md` § Seam delta, and every directory under `src/modules/`,
must own a row in `seams.md`. Run against the tree as it stood at `00d9b09`, four days of
`clean`, it said:

```
docs/planning/ingest/design.md: § Seam delta names `ingest`, which owns no row in docs/design/seams.md
shape: 1 problems
```

**It was reverted the same session, under the standing instruction at the top of this file.**
Not because it was wrong — it fired on exactly the state it was written for — but because
fixing a deficit is a decision about what the method becomes, and that decision is METHOD's
to make in one pass rather than an agent's to make in passing. Thirty-eight lines of
`shape.ts`, plus the check-feet of [modules.md](../../rules/modules.md) and
[slices.md](../../rules/slices.md) and a paragraph in `new-module`, went back.

**Recording it is the point.** Deficit 24, two entries up, is that a retraction leaves no
trace; this is the first one that does. The evidence above — that the check exists, that it
compiles, that it fires on the real prior state and passes on the current one — is the part
worth keeping, and it is worth keeping precisely so the eventual fix does not start from zero.

*Why the fix was a check and not a generator.* The obvious move is to generate `seams.md`'s
rows out of `design.md` § Seam delta, and it does not work: the delta's third column is
**`Depends on`** and `seams.md`'s is **`Interface is about`**. They are different facts. The
`ingest` row's `runIngest(deps) → IngestReport`, one call was authored by analogy to
`import`'s, not copied from anywhere — and the delta's `Owns` cells open with `**amended.**`
and `**new.**`, which are markers for a delta and wrong in a permanent map. A generator would
have to invent the one column that matters or silently degrade it. A checker cannot get a
cell wrong, because it writes none.

### Deficit 26 — Build makes decisions, and the method has nowhere to put them

Ticket 00's *Done when* is three lines, and one of them is *"`pnpm install` resolves, and
`vp check` is pass·pass."* Reaching it took two decisions the ticket never anticipated:

| Decision | What was at stake | Where it is recorded |
|---|---|---|
| `whatsappd` pinned to `0.4.0-alpha.3` from the registry, **not** `link:../whatsappd` | a `link:` makes `pnpm install` here depend on a directory outside this repository | the ticket's `## Comments` |
| `baileys` and `protobufjs` `allowBuilds: false` | `pnpm` refuses to install while they are unanswered, so `vp check` failed on `ERR_PNPM_IGNORED_BUILDS` before reading a single file | the ticket's `## Comments` |

Neither is an ADR and neither should be — [decisions.md](../../rules/decisions.md) reserves
those for *"a decision that shapes the codebase"*, and a pinned alpha and a build-script
policy are below that bar. **But the rule has no bar below that one.** The only decision
surface in [slices.md](../../rules/slices.md) is step 3, the frontier, whose gate is *"Open
and Fog are both empty"* — by construction it is closed before Build begins. So a decision
made at step 5 has exactly one home, a `## Comments` block that no gate reads and no step
report carries.

**And the gate cannot see it.** [definition-of-done.md](../../design/definition-of-done.md) is
sixteen rows of command-or-observable-state; `close-slice` will read every one of them and
will not read a Comments block. Both facts above are load-bearing for the next person who runs
`pnpm install` in this repo, and both are one `git log` away from invisible.

**The smallest honest fix is not a new artefact.** It is a line in `slices.md` § 5 saying
where a build-time decision goes, and the cheapest answer is the one the third cohort already
built for a different problem: the step report. A decision made at step 5 is reported at step
5, and the report is what the principal reads.

---

## The step report — the template

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
