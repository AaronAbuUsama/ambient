---
name: render-slice
description: Render one slice as a single self-contained HTML page — its destination, what is decided, the open question DAG, the call stack and module diagrams, the spec, the ticket graph and the evidence, in one document. Use when the user asks to see a slice, to render or share a slice, wants the plan as a page, or says "show me INGEST".
---

# Render a slice

**One slice, one page.** Everything about a slice — scope, design, spec, tickets, evidence —
composed into a single self-contained HTML file. It is the artefact rule for this project:
[`artefacts.md`](../../../docs/rules/artefacts.md).

Output: `docs/planning/<slice>/<slice>.html`. **Gitignored and regenerated**, never
hand-edited — it is derived from the markdown, so the markdown stays the source of truth and
the page never becomes a second place to keep things true.

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

## What the page contains, in this order

Read the slice's directory and build only the sections that have content. A slice at step 1
has three; a closed slice has all seven.

| # | Section | Source | Present when |
|---|---|---|---|
| 1 | **Destination + where it stands** | `scope.md`, `roadmap.md`, `vp run slice` | always |
| 2 | **Decided** | `scope.md` § Decided | always |
| 3 | **The frontier** — the open-question **DAG**, kinds coloured, AFK roots marked kickable | `scope.md` § Open + Fog | until the frontier clears |
| 4 | **Design** — the **call-stack sequence diagram**, the **module/interface diagram**, and the interfaces as code | the slice's design | from step 2 |
| 5 | **The plan** — problem, solution, program design, the numbered gate | `spec.md` | from step 3 |
| 6 | **Tickets** — the blocking DAG, each with its status | `issues/*.md` | from step 3 |
| 7 | **Evidence** — every measured number, with the instrument that produced it | `scope.md`, spec Further Notes | always, once measured |

**Section 3 is the one that earns the page.** A flat list of questions cannot show what is
kickable now; a DAG can. Colour by kind — `research` and `spike` are AFK and dispatchable,
`task` needs a human, `grilling` needs the principal — and draw the design step as the node
everything HITL hangs off. Reading it should tell an operator what to start **this minute**.

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
