# The method — what is missing, and the evidence

Recorded 2026-08-17, straight after IMPORT closed. **This is a scope, not a spec.** It
records what the build process does not have, and what that cost, so the fix is designed
against evidence rather than a feeling.

The area name is **open** — METHOD, FOUNDRY, WORKBENCH. Naming it is part of scoping it.

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
| Call-graph artefact | [`walkthrough-doctor.md`](../../walkthrough-doctor.md) | **none** |
| Seam rows existed before scaffolding | yes | **no — it became ticket 00** |
| Tests derived from | the spec's §4 gate, written first | the model's judgement, per ticket |

### Deficit 1 — the call-graph artefact exists, and was skipped

[`README.md`](../../../README.md) calls `walkthrough-doctor.md` *"the shortest path to owning
this codebase"* — it traces one command from keypress to output through every file it
touches. **That is the call graph, and this repo invented it, praised it, and then did not
require it.** There is no `walkthrough-import.md`, and `import` is now a real verb with three
modules behind it.

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
(`roadmap.md`, `definition-of-done.md`). Walkthroughs sit loose at `docs/`. Per-area material
is split across `docs/planning/<area>/` and `docs/adr/`. Three kinds, two-and-a-half folders.

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

**Derive it, do not design it.** Extracting a template now — from one-and-a-half good areas —
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
  ~4,800-message batches, on a callback that must not block.
