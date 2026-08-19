# METHOD — session handoff

**Written 2026-08-17, second pass.** Supersedes the version written before the compaction. The
single source of truth for where this work stands.

Branch `main`, tip **`e49e7a9`**, working tree clean.
`vp check` pass·pass · `vp test` 53 passed · `shape` 44 files, 6 modules, clean · `fallow` 0 lines.

---

## The mission

**METHOD turns how a slice gets built from folklore into skills**, because IMPORT shipped green
while its topology was wrong and nothing noticed.

The rule is [`docs/rules/slices.md`](../rules/slices.md). The operator's page is
[`docs/walkthroughs/slice.md`](../walkthroughs/slice.md). Why it was needed is
[`deficits.md`](method-deficits.md).

---

## What changed this session

### Design became step 2 — the circular dependency is gone

The rule ran **Map → Frontier → Plan**, gated step 2 on *"Open and Fog are both empty"*, and put
the Program design inside `spec.md` at step 3 whose first invariant was *design the caller before
the callee*. **Every question had to be answered before anything could be designed, and the
design is what makes the questions askable.** A circular dependency, in two rows of one table.

It fired once, on INGEST, and produced what the shape predicts: ten open questions, no code, and
**four of five `grilling` questions asking whether something was in the slice** — size questions
about work nobody had designed.

Now: **Map → Design → Frontier → Plan → Build → Close.** Six steps.
[`design-slice`](../../.agents/skills/design-slice/SKILL.md) produces `design.md`, and its gate
is the one that matters:

> A `grilling` question that cannot name a block of `design.md` is not finished. Either it belongs
> back in the map, or the design stopped short.

Program design moved out of `spec.md` wholesale; definition-of-done row 10 reads `design.md`.
Open questions gained an id and what they wait on, so the frontier is a graph.

### `render-slice` became a real skill

```
.agents/skills/render-slice/
  SKILL.md                 process + the gate
  assets/shell.html        the chrome. 4 placeholders: /*FONTS*/ <!--BODY--> <!--DATA--> /*NAV*/
  assets/fonts.css         88 KB base64 woff2 (Geist, Geist Mono, Instrument Serif, all SIL OFL)
  references/sections.md   the twelve sections, grouped Plan · Design · Record
  references/diagrams.md   four diagram recipes with SOLVED coordinates
```

**Assemble, not author.** The agent writes only section bodies and a nav array, then splices.
`fonts.css` is spliced by path and **never read into context**.

`references/diagrams.md` is the load-bearing file: it ships pre-solved geometry per node count,
plus the formula `legendRuleY = canvasHeight − 68`, because freehand placement is what fails.

### `impeccable` is a tool, not a dependency

It designed `assets/shell.html` once and is **not vendored**. Vendored for artefacts:
`diagram-design` plus the template. Recorded in [`artefacts.md`](../rules/artefacts.md) and
`vendor/README.md`. Vendor is back to **2.1 MB, nine skills**.

---

## Defects found by looking, not by measuring

Each of these passed a numeric self-check and was wrong:

| Defect | What it was |
|---|---|
| Legend through a row of nodes | The frontier legend rule sat at y=412; its lowest box bottomed at 448. Coordinates copied from a shorter canvas. |
| Nothing readable | A 1000-unit viewBox clamped to `min-width:760px` renders 8px mono at **6.1px**. |
| Renamed the rule's own vocabulary | "The caller" is **Production call sites**; "crash story" is **state and failure sequence**. Renaming them is how a page stops matching the rule it renders. |
| Sections ordered by producer | Sorted by which step fills them, not by what a reader needs first. `Decided` was section 2. |

**The standing instruction that follows:** *look at the page.* Measuring the DOM is not looking.

---

## Where things stand

**Done and committed**

```
0900888  design becomes step 2, and the page is the method projected
afecdb5  render-slice becomes a real skill — shell, fonts, solved geometry
d7bccda  impeccable is a tool, not a dependency — drop it, keep the template
db720d5  fix the formatting vp check caught in the shell and font assets
e49e7a9  IMPORT gets a design.md, and INGEST is wiped to be redone properly
```

**IMPORT is the worked example.** [`design.md`](../planning/import/design.md) holds the caller, call graph,
interfaces, seam delta, conformance table and crash story. `import.html` renders all twelve
sections and is gitignored, regenerated from that markdown.

**INGEST is deleted, deliberately.** Its `scope.md`, three research findings
(`06-durable-runtime`, `07-media-states`, `08-event-mapping`), the write-path spike, the worktree
and its branch are all gone. It was mapped under the old rule. **It gets redone through all six
steps so the method is dogfooded rather than described.**

**Still open**

- `design-slice` has **never run.** Until INGEST goes through it, the restructure is unproven.
- The template has only rendered a **closed** slice. Every section had content; the empty-state
  path is untested, and INGEST will test it at step 1.
- Two call-graph inconsistencies: calls inside a LOOP fragment, and `resolveMedia`, have no
  return arrows where every other call does.
- `METHOD` has no `scope.md` of its own.
- `intake/scope.md` and `import/spec.md` still say the pairing screen is designed with
  `impeccable`. Now inaccurate; needs an amendment, not an edit.
- No definition-of-done row asserts the page was regenerated.

---

## Gotchas

- **Never run destructive git commands in `~/projects/whatsappd`.** Another agent works there.
  Read freely; use a worktree to write.
- **A full WhatsApp sync is one-shot per credential.** Do not spend a pairing on a tool that does
  not durably write.
- **`.spike-private/` is gitignored personal data.** Read it for evidence; commit nothing from it.
- **Never edit `.agents/skills/vendor/`.** Two declared exceptions, both in its README.
- **No remote.** Never `gh`, never `glab`.
- **Run all four checks**: `vp check`, `vp test`, `vp run shape`, `pnpm dlx fallow dupes`.
- **A `.replace()` that misses reports nothing.** Print a hit or a miss on every scripted edit.
- **State the instrument with every number.**
- **Do not commit and run checks in one command.** It has shipped a lint error twice today.

## The standing lesson

**Three times the principal said a measurement contradicted what he knew about his own account,
and three times he was right. When that happens, doubt the measurement.**

Its twin, learned today: **a numeric self-check is not a look.** Every visual defect this session
passed its own assertions.

## Key pointers

| What | Where |
|---|---|
| The contract | [`AGENTS.md`](../../AGENTS.md) |
| The lexicon | [`CONTEXT.md`](../../CONTEXT.md) |
| How a slice is built | [`docs/rules/slices.md`](../rules/slices.md) |
| The operator's page | [`docs/walkthroughs/slice.md`](../walkthroughs/slice.md) |
| The worked design | [`docs/planning/import/design.md`](../planning/import/design.md) |
| The worked call graph, as a tour | [`docs/walkthroughs/import.md`](../walkthroughs/import.md) |
| Doc map | [`docs/README.md`](../README.md) |
| Where we are | [`docs/design/roadmap.md`](../design/roadmap.md) |
