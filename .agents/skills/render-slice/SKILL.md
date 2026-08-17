---
name: render-slice
description: Render one slice as a single self-contained HTML page — its destination, what is decided, the open question DAG, the call stack and module diagrams, the spec, the ticket graph and the evidence, in one document. Use when the user asks to see a slice, to render or share a slice, wants the plan as a page, or says "show me INGEST".
---

# Render a slice

**One slice, one document — and it is where the work happens, not a report at the end.**

This is a **living, multi-section HTML document** for the slice: the destination, the open
questions, the decisions and ADRs, the diagrams, the plan, the tickets, the evidence. It is
regenerated **as the slice progresses**, so at any moment it is the current state of the whole
thing in one place, readable together.

**Every step of [`slices.md`](../../../docs/rules/slices.md) ends by calling this**, and each
one adds its own sections — that is the rule, not a habit, and each step skill's *Finish*
names it. Re-render between steps too, whenever something lands: a question answered, a
decision taken, a ticket closed. It is cheap, and a document that is stale between milestones
is one nobody opens.

**The diagrams live inside it, inline.** Do not scatter `.svg` files beside it — the whole
point is one document rather than a directory nobody can navigate. (Separate SVGs become
worth having when this repo has a remote and diagrams go in pull requests. It has none, so
they do not.)

Output: `docs/planning/<slice>/<slice>.html`. **Gitignored and regenerated**, never
hand-edited — the markdown and the ADRs stay the source of truth, and the document never
becomes a second place to keep things true.

## Why one page and not several

A directory of loose HTML files is sprawl: each is stale the moment another lands, and nobody
knows which to open. A slice is one thing and reads as one thing. **If you are about to write
a second HTML file for a slice, you are writing a section of this one.**

## Compose, never fork

The diagrams are drawn by the vendored
[`diagram-design`](../vendor/diagram-design/SKILL.md) skill and **embedded inline** as SVG.
Load it, follow its type reference, run its taste gate — then lift the `<svg>` into a section
here. Do not restyle it, do not edit the vendored skill, and do not invent a second visual
language.

Its first-run branding gate is **already answered** in
[`setup-abu-usama-skills`](../setup-abu-usama-skills/SKILL.md). Do not ask it again.

## The template — nine sections, and they are not a matter of taste

**The sections are [`slices.md`](../../../docs/rules/slices.md)'s six steps projected**, one
or two per step. That is why the list is fixed and why it is obvious: a section is missing
exactly when the step that fills it has not run, so **the page's own completeness is the
progress bar.** Nothing needs to compute which step a slice is on — you look at it.

| # | Section | Filled by | Source | Grows |
|---|---|---|---|---|
| 1 | **Destination + where it stands + what to do next** | 1 Map | `scope.md`, `roadmap.md` | every step |
| 2 | **Decided** — one line per settled fact, each cited | 1 Map | `scope.md` § Decided | every step |
| 3 | **Design** — the caller, the **call-stack sequence diagram**, the **module/interface diagram**, the interfaces, the seam delta | 2 Design | `design.md` | corrected at step 4 |
| 4 | **The frontier** — the question **DAG**, kinds coloured, AFK roots marked kickable | 1 Map | `scope.md` § Open + Fog | **shrinks** to empty at step 3 |
| 5 | **Decisions** — every ADR this slice produced or amended, with what each beat | 2 Design, 3 Frontier | `docs/adr/` | as they land |
| 6 | **The plan** — problem, solution, the numbered gate | 4 Plan | `spec.md` | — |
| 7 | **Tickets** — the blocking DAG, each with its status | 4 Plan | `issues/*.md` | status moves at step 5 |
| 8 | **Evidence** — every measured number, with the instrument that produced it | every step | `scope.md`, `design.md`, spec Further Notes | every step |
| 9 | **Done** — the ten definition-of-done rows, pass/fail with the evidence | 6 Close | `close-slice` output | — |

**Sections 3 and 4 are the pair that earns the page.** The design is what the frontier hangs
off — every `grilling` question anchors into a branch point in section 3, so the two are read
together and neither makes sense alone. That adjacency is the whole reason this is one
document and not two.

**Section 4 is a DAG, never a list.** Colour by kind — `research` and `spike` are AFK and
dispatchable, `task` needs a human, `grilling` needs the principal — and draw each question's
edge to what it waits on. Reading it must tell an operator what to start **this minute**.

**The section contract above is fixed now; the markup settles on the first real render.**
Once a slice has been drawn end to end, that page is the reference and the layout stops
drifting — one visual language per project, same as the diagrams.

## Non-negotiables

Inherited from [`artefacts.md`](../../../docs/rules/artefacts.md) and not restated there:

- **Theme-aware.** Legible in light and dark. Never assume a white page.
- **Self-contained.** Inline CSS and SVG. No CDN, no external request, no JavaScript needed
  to read it. Fonts degrade to system stacks.
- **A local file. Never an Artifact.** A slice can carry measurements taken from the
  principal's real account.
- **The headline in five seconds.** Where the slice stands, and what to do next, above the
  fold. Everything else is drilled into, not excavated.
- **No personal data.** Counts, spans and hashes only. Message text, chat subjects, phone
  numbers and display names stay in `.spike-private/`, which is gitignored.

## Finish

Report the path and what it contains — which sections rendered, and which were empty because
the slice has not reached them yet. Then say the one thing the page says: **what is startable
right now.**
