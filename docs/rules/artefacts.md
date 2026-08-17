# Generated artefacts are designed, never defaulted

## The rule

Any HTML, diagram, chart or report this project generates for a human to read is **designed
using the installed design skills**. Load the skill before writing the markup, not after.

| Artefact | Skill |
|---|---|
| **A slice** — its scope, design, spec, tickets and evidence | `render-slice` |
| An architecture, flow, sequence or state diagram | `diagram-design` (vendored) |
| A product surface a user touches — the pairing screen | *not vendored; see below* |

**One HTML artefact per slice, and no others.** A slice's whole story — what is decided, what
is open, the call stack, the interfaces, the tickets, the measurements — renders as **one
page**, produced by `render-slice`. A directory of loose HTML files is the sprawl this row
exists to prevent: each one is stale the moment another lands, and nobody knows which to open.

`render-slice` **composes** `diagram-design` rather than replacing it — the diagrams are drawn
by the vendored skill and embedded inline, so upstream stays untouched.

**Two skills this table used to name are deliberately absent.** `impeccable` was vendored and
removed: the only page this project generates is a slice, and `render-slice` owns it.
`dataviz` ships with the harness and cannot be vendored at all. If a real product surface
lands — INGEST's pairing screen is the candidate — it is a UI rather than a document, and
vendoring `impeccable` for it is that slice's decision.

Non-negotiables for every generated page:

- **Theme-aware.** Legible in light and dark. Never assume a white page.
- **Self-contained.** Inline CSS and JS, no external requests, no CDN.
- **A local file.** Never an Artifact.
- **The headline in five seconds.** A reader knows the answer before scrolling; detail is
  what they drill into, not what they excavate.
- No unstyled tables, no browser-default typography, no grey zebra striping, no emoji used
  as interface chrome.

Personal or account data stays in `.spike-private/`, which is gitignored, and never leaves
the machine.

## Why

Left unbriefed, a generator produces the default: an unstyled table, system fonts, striped
rows. It is technically correct and nobody reads it. The slug spike produced 913 rows of
genuinely good analysis in exactly that form and the principal's verdict was *"absolute
garbage… I strongly hate this."* He was right, and the fault was the brief — it asked for
"a single self-contained HTML file" and said nothing about design.

The skills exist precisely so this is not improvised each time. Not loading one is choosing
the default by omission.

This is the same discipline as everything else here: **a convention nobody enforces is a
hope.** The enforcement for this one is that the brief names the skill.

## The check

**Not currently checked** — no script inspects generated HTML for design quality, and it is
not obvious one usefully could.

Enforced instead at the point of instruction: any brief that asks for a generated artefact
must name the skill to design it with. If you are writing that brief and have not named a
skill, the brief is incomplete.
