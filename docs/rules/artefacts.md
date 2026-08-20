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

**Two skills this table used to name are deliberately absent, and one of them is a tool rather
than a dependency.** `impeccable` **designed `render-slice`'s template once** and is not
vendored: the layout is now decided and lives in `assets/shell.html`, so rendering a slice needs
the template, not the skill that shaped it. It was vendored briefly on 2026-08-17 and removed
again the same day for exactly this reason — 3.2 MB of design playbooks to re-derive a layout
that is already fixed. `dataviz` ships with the harness and cannot be vendored at all.

If a real product surface lands — INGEST's pairing screen is the candidate — it is a UI rather
than a document, it has no template yet, and reaching for `impeccable` there is that slice's
decision.

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

`vp run shape` — `brokenGeometry` in
[`scripts/shape/checks.ts`](../../scripts/shape/checks.ts) asserts that the four diagram recipes
in [`diagrams.md`](../../.agents/skills/render-slice/references/diagrams.md) obey the geometry
they declare. Each carries a `lowest ink | legend rule | canvas` row, and the check asserts the
two rules that keep a legend clear of the ink: `legendRuleY == canvasHeight - 68` and
`lowestInk + 32 <= legendRuleY`. Both constants are read out of that file's own checklist rather
than copied into the script, and a recipe that declares **no** row is itself an offence — a check
that passes by looking at nothing is what let a canvas formula true of no recipe, and a legend
rule 8px off its own canvas, sit in that file from the day it was written. `vp test` —
[`scripts/shape/checks.test.ts`](../../scripts/shape/checks.test.ts) asks it the cases this
repository does not contain, including a recipe clearing its legend by exactly the floor and a
heading renamed out of the roster.

That is the *recipes'* arithmetic, not the page's design. The lowest ink is a judgement the recipe
states rather than a coordinate anything can find — recipe B's is a lifeline foot and not its
deepest message — and a diagram whose three numbers agree can still overrun a slot, collide, or
read as a browser default.

**Not currently checked** — no script inspects generated HTML for design quality, and it is
not obvious one usefully could.

Enforced instead at the point of instruction: any brief that asks for a generated artefact
must name the skill to design it with. If you are writing that brief and have not named a
skill, the brief is incomplete.

## Amendments

**2026-08-20 — the recipes' declared geometry is checked; the generated page still is not.**
`vp run shape` gained a walk over
[`diagrams.md`](../../.agents/skills/render-slice/references/diagrams.md) after two numeric
contradictions shipped inside that file — a `canvasHeight = lowestBoxBottom + 112` constant true
of no recipe, and recipe B's canvas at 720 where its own legend rule at 644 requires 712 — both
because nothing ran the file's checklist. The check is a function of its text with its own
rows in `checks.test.ts`, per [legibility.md](legibility.md) — *"and the checkers are checked"*,
which landed on master the same day and which the first cut of this one predated.

The *"Not currently checked"* paragraph stands **as written**. It is a statement about generated
HTML, and no script inspects generated HTML; what is now checked is the arithmetic of the recipes
a page is drawn from, which is a different claim. It is recorded as two paragraphs above it, and
this entry, rather than as an edit to it: collapsing the two would read as if this rule had always
been enforced by a script, and the reason it is not — that design quality is not obviously
checkable, so the enforcement is the brief — is the part worth keeping. The paragraph moved below
the new one only to match every other rule here, which states what runs before what does not.
