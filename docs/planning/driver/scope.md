# DRIVER — scope

Mapped 2026-08-19, against the skills tree, [`scripts/shape.ts`](../../../scripts/shape.ts)
and the four cohorts in [`method/deficits.md`](../method/deficits.md). **This is a scope, not
a spec.** It records what the process does not have and what that has cost; the shape is
[`design-slice`](../../../.agents/skills/design-slice/SKILL.md)'s at step 2.

The name is provisional. DRIVER names the headline — nothing drives a step — but the slice
also covers filing, artefacts and self-containment.

---

## Destination

**A slice is run by one skill that knows which step is next and dispatches it; the artefacts a
slice produces — the seam rows, the call graph, the page — are generated or checked rather
than asserted in prose; and every skill the process invokes resolves inside this repository.**

Reaching it means a session opens with *"DRIVER is at step 2, here is what changed"* rather
than with the principal reconstructing state out loud.

---

## Decided

- **The entry point is a skill, not a script.** `scripts/slice.ts` was built and deleted
  twice — `68d2180` (*"a skill reads markdown, it does not need a parser"*) and `00d9b09`.
  Both times what got built was a markdown parser in `scripts/`. Principal, this session:
  *"an entry point is not a script that writes Markdown… the entry point is a skill."*
- **Deficit 10 is live, not declined.** The register records *"not a deficit — the principal
  does not want one"*; what actually happened was a degraded agent being stopped mid-run.
  Principal, this session: *"it's not that I didn't want it, I did want it."*
  [`deficits.md`](../method/deficits.md) needs this as an amendment, not an edit.
- **The no-fix rule is lifted for this slice.** It was a standing instruction to stop that
  same agent, promoted into a constitution by a later one. Principal, this session: *"we do
  need to fix it… before we do the next slice."*
- **The model is `wayfinder`'s two invocation modes over this repo's six steps.** Recovered
  from `33ebae2`, before the vendor was pruned. Its front half — the four kinds, the fog
  test, destination-first, out-of-scope-never-graduates, one-decision-per-session-except-
  research — is already adopted almost verbatim into [`slices.md`](../../rules/slices.md).
  What was dropped is `## Invocation`: **Chart the map** and **Work through the map**. That
  omission is deficit 10.
- **`slices.md`'s six steps stay.** Wayfinder stops at *"the way is clear"* and hands off —
  *"Plan, don't do."* Steps 4–6 are the execution half it refuses, and they are proven: six
  ticket files, blocking edges, executed end to end across two slices.
- **The page is for the human and the reviewer, not the agent.** Principal, this session.
  That is what makes it an artefact rather than a working file.
- **The seam-row check is wanted, as a check and not as a mechanism.** `new-module` refusing
  a module with no seam row *"showed where the process was not self-consistent"* — principal,
  this session. The proven check at [deficit 25](../method/deficits.md) is revived rather than
  re-derived. **Amended later the same session:** this was first written as *"the tripwires
  are wanted"*, and the tripwire framing is withdrawn — see G2 below. It is one more thing
  `shape.ts` checks, with no ceremony around it.

**Answered during step 1, recorded where they landed.** [`slices.md`](../../rules/slices.md)
puts answers at step 3; deficit 19 says nothing permits recording one earlier and nothing
forbids it either. These arrived in the mapping session, so they are written here.

- **A skill can dispatch another skill.** Principal, first-hand. R1 closed without research.
- **`disable-model-invocation: true` is respected by Claude and by codex** — it means the
  model cannot start the skill, only a human can. **Action attached:** the skills only a
  human should start need the flag set, and none of this repo's seven carry it today.
- **Never symlink to `~/.claude`.** `.agents/` is the source of truth and `.claude/`
  symlinks into it, locally, so one update propagates. Principal, this session. The 44
  dangling entries in `~/.claude/skills/` are the failure of that rule at machine level.
- **The driver stops by default and dispatches what it can.** Principal: *"generally stop,
  unless it's in auto mode… anything that can be dispatched should be dispatched."*
  **And the front of it is an alignment step** — agree what the questions are before any of
  them are spent. The map as first written had no such step.
- **A defect is a ticket type, routed by where you are.** Inside the process it goes back
  into the map; outside it, or deliberately deferred, it becomes a ticket. Principal, this
  session.
- **A call graph cannot be derived from source, because the artefact is not the edges.**
  Principal: *"we have these modules, we have these seams — what is the call? how does the
  journey flow through the code?"* The derivable part is `a → b → c`; the artefact is which
  module owns each step and what it returns, as at [`ingest/design.md:203`](../ingest/design.md).
  **Its name is undecided and the repo uses two** — see the language defect below.
- **S2 is answered: the page at step 1 works, and three things about it do not.** Rendered
  2026-08-19, 121 KB, self-contained, no console error. Deficits 13 and 14 are genuinely
  fixed — twelve sections including ten stubs, nav built, switching bound, nothing thrown.
  **Approved by the principal.** Three defects came out of looking at it, and per the routing
  rule they are recorded here rather than in the register, because the slice that fixes them
  is this one:
  - **Deficit 27 reproduces, and its stated instrument is wrong.** At a 1440 viewport the
    diagram does not clip; at 1280 it hides 96px and cuts the terminal box in half. The
    register says *"on a 1440px display"* and quotes the 1280-viewport numbers. Display is
    not viewport, and anyone re-checking it at 1440 would wrongly close it.
  - **The page cannot show its own completeness.** [`sections.md`](../../../.agents/skills/render-slice/references/sections.md)
    claims *"the page's own completeness is the progress bar."* The nav renders twelve
    identical entries; nothing marks a filled section from a stub, so reading the slice's
    state costs twelve clicks. **This is the defect closest to the destination** — a page
    that starts blank and fills as the slice advances is invisible if filling does not show.
  - **Nothing signals horizontally clipped content.** The diagram figure and the terminal
    block both overflow silently. A cut box reads as a box that ends.
- **Deficit 17 confirmed, and both files are wrong.** `map-slice` says step 1 fills sections
  *1, 2, 4 and 8*; 4 and 8 are the DESIGN group and cannot exist before step 2.
  `sections.md` says *three*. DRIVER filled three — **1, 2 and 11**. One file has the count
  right and the identity wrong; the other has both wrong.
- **G1 answered: the word is "call graph".** Principal, this session. But the map was wrong
  to call it *two words for one thing*: [`setup-abu-usama-skills`](../../../.agents/skills/setup-abu-usama-skills/SKILL.md)
  line 79 uses *call stack* for a **sequence** diagram showing *"order, returns, failure
  branches, loops — what a nesting tree cannot"*, and recipe B is `Type: sequence` under a
  heading that says Call graph. **There are two artefacts of one subject** — the nesting tree
  in `design.md`, which has no returns in it, and the sequence view, which does. The Principal
  described wanting the one with returns. Naming them is a `CONTEXT.md` entry; deciding
  whether `design.md` should hold the second one is step 2's.
- **G2 answered: two kinds of rule, and no third thing.** Principal, this session.
  - **Code rules → oxlint.** `install-anti-slop` was run on 2026-08-19; its 15 rules are
    registered in `vite.config.ts` and all set to `error`. The four line regexes in
    [`shape.ts`](../../../scripts/shape.ts) — `throw`, `../..`, cross-module `internal/`,
    file length — become custom oxlint rules. Principal on the regexes: *"that regex looks
    weird, I don't like that at all… we should be using oxlint custom rules."*
  - **Agent rules → just rules.** They live in `docs/rules/`, `AGENTS.md` points at them by
    progressive disclosure, the agent reads the one it is working under, and **the code
    reviewer reviews the code in light of them.** Nothing refuses; nothing halts. Principal:
    *"there is no formal need for a tripwire… everything doesn't have to be enforced by
    code."* The tripwire framing was the agent's invention and is withdrawn.
  - **`shape.ts` keeps only what no linter can see** — the six slots, which is a filesystem
    question, and cross-link resolution, which reads many documents at once.
  - **This is why R3 is the other half.** Our own code-review skill is the enforcement for
    every agent rule, which is what makes it worth building rather than borrowing.
- **Installing anti-slop cost 133 errors, and 87 of them are a design disagreement.**
  `no-runtime-typeof` 47, `no-unknown-parameters` 24, `no-unsafe-dictionary-type` 16 all say
  the same thing: narrow once at the edge, not in helpers. [`types.md`](../../rules/types.md)
  says data *"enters as `unknown` and is narrowed at the boundary, one key at a time"* and
  never says the boundary is **one function**, so narrowing is spread across four modules.
  Whether `types.md` sharpens or those three rules become agent rules is undecided.
- **`legibility.md` rule 2 conflates two kinds of rule.** Principal, this session: code
  conventions can be encoded as lint; agent rules cannot, and demanding a check of both is
  leakage. Evidence: rule 2 sits between two source-file rules in a file about source files,
  is the only rule there with no check named for it, and its *Why* cites a **code** check
  that did not exist. Four of the seven process rules answer their *check* section with
  *"not currently checked"* or with *cross-links resolve*, which checks nothing about the
  rule it is attached to.

---

## The facts this map measured

*Instrument stated with each. Measured 2026-08-19 at `940c5d7`, working tree clean.*

**`render-slice <SLICE>` is written as a command in six places and is not a command.**

```
$ node -e "…require('./package.json').scripts…"
ambient: node --import ./scripts/module-aliases.ts src/main.ts
shape:   node scripts/shape.ts
```

Two scripts. Nothing named `render-slice`; nothing in `scripts/` mentions it. The instruction
*"Regenerate the page — `render-slice <SLICE>`"* appears in `map-slice`, `design-slice`,
`plan-slice`, `close-slice` and twice in [`slices.md`](../../rules/slices.md). **One
convention, six copies, zero call sites, zero checks.**

**Step 3 is the only step with no repo skill.**

| Step | Skill |
|---|---|
| 1 · Map | `map-slice` |
| 2 · Design | `design-slice` |
| **3 · Frontier** | **none** — dispatches `grilling`, which does not resolve |
| 4 · Plan | `plan-slice` |
| 5 · Build | `new-module`, then `tdd` and `code-review`, neither of which resolves |
| 6 · Close | `close-slice` |

**`shape.ts` is 165 lines in three sections and reads none of the process artefacts.**
Source files (`:73`), the six slots (`:111`), cross-links (`:127`). `grep` for
`seams|design.md|planning|\.html` over that file returns **nothing**. So for all of INGEST's
steps 1–4, `ingest` was a module in the design, the call graph and five tickets, owned no row
in [`seams.md`](../../design/seams.md), and `vp run shape` printed `clean` every day.

**Skill references split 4 by path against 3 invocations by bare name.**
By path, which resolves inside the repo: `map-slice`→`research`, `render-slice`→
`diagram-design`, `setup-abu-usama-skills`→`domain-modeling` and →`diagram-design`.
By bare name, which resolves outside it: [`walkthroughs/slice.md`](../../walkthroughs/slice.md)
lines 91, 92 and 135 — `/prototype`, `/grilling`, and `/new-module → /tdd → /code-review`.
Plus [`slices.md`](../../rules/slices.md):126 naming all three in prose.
*A wider grep returned 38 hits; 34 of them were the four **kind** names used as vocabulary —
"a `grilling` question" — which is correct usage. The instrument mattered.*

**Neither `/tdd` nor `/code-review` resolves to what this repo vendored.** `~/.claude/skills/`
holds 124 entries of which **44 are dangling symlinks** into a pruned `~/.agents/skills/`,
including all seven mattpocock skills. `.claude/skills/vendor` is a directory of directories
with no `SKILL.md`, so it registers nothing. `/code-review` resolves to a harness built-in
with the same name and a different job. **The guarantee in
[`vendor/README.md`](../../../.agents/skills/vendor/README.md) — *"a rule must not depend on
words that can change without a diff here"* — is not currently held for seven of nine.**

**The register cannot express what has already happened to it.**

```
closed ×8   ·   "fixed this run" ×2   ·   carried ×2
```

`open` is not a state, it is the absence of one. There is no way to record *built, proven,
reverted* (deficit 25) or *proposed and declined* (deficit 10) — so both were written as
prose inside the entry, where no index reads them.

**Of three artefacts, one is generated.** [`seams.md`](../../design/seams.md) is hand-edited
and its rows do not arrive from the design that wrote them — which is why line 27 still
describes a Cursor INGEST proved does not exist. The call graph at
[`ingest/design.md:189`](../ingest/design.md) is hand-typed ASCII, checked by
[definition-of-done](../../design/definition-of-done.md) row 10 *read, not run*. Only the
page is produced by a machine, and it carries eight of the nineteen open deficits.

**Step 3 — the frontier worked, 2026-08-19.** Six questions answered in one round, all six
against a named block of [`design.md`](./design.md) rather than in the abstract, which is what
step 2 was added to guarantee.

- **G5 → the driver dispatches `render-slice`, and the five restatements are deleted.**
  The instruction is stated six times and called zero times, and `render-slice <SLICE>` is not
  a command — `package.json` has two scripts. Deficit 10's own diagnosis is that this is *"a
  convention an agent must remember, not a call site."* Accepted cost: a step skill run without
  the driver no longer regenerates the page, which is the correct cost, because running a step
  bare is what the driver exists to stop.
- **G7 → the driver emits the step report, and the template leaves `deficits.md`.**
  Four of the nineteen open deficits — 7, 8, 9 and 22 — are this one artefact. Its
  specification currently sits at the foot of a defect register, which
  [`docs/README.md`](../../README.md) gives the lifetime *"until the slice closes"*. Moving it
  also gives deficit 26 — build-time decisions with nowhere to go — its only proposed home.
- **G6 → no seventh skill. The AFK kinds join the driver's dispatch table.**
  `research` → `vendor/research`, `spike` → `vendor/prototype`; `grilling` and `task` hand back.
  **The HITL rule stops being prose an agent might obey and becomes a table with no row for
  `grilling`.** A `frontier-slice` skill was rejected because its only distinctive job is the
  one thing [`slices.md`](../../rules/slices.md) forbids it to do.
- **G3 → flag the driver now; test the mechanism on one step skill before flagging six.**
  Nobody has observed whether `disable-model-invocation` blocks a *skill* dispatching a flagged
  skill or only the model starting it. Flagging all seven acts on that unknown; the driver's own
  flag is free and obviously right.

  **Observed 2026-08-19, ticket 02's first act — it blocks both.** A skill carrying the flag
  cannot be dispatched by an agent at all: the Skill tool refuses with *"cannot be used with
  Skill tool due to disable-model-invocation … reserved for explicit user invocation."*
  *Instrument: two skills created differing only in the flag — `b4-probe` flagged,
  `b4-control` not. After the registry rescan the control loaded and the probe was refused.
  A first attempt on `close-slice` loaded the skill and was discarded as a stale registry:
  the flag was added mid-session to a skill already registered without it.*

  **This is why G3 said observe first.** Had the attached action under *Answered during step
  1* been carried out — *"the skills only a human should start need the flag set"* — across
  the six step skills, the driver could not have dispatched any of them. The flag goes on the
  driver, and on nothing the driver has to call.
- **G8 → the driver reports staleness; it writes no lock.**
  From `mtime` and `git status`, two commands and no state of its own — which keeps the property
  that makes the driver cheap. A lock file would make the driver the one thing that writes
  durably, and would add a stale-lock failure. Not hypothetical: a `shape` run read a file
  mid-write today and reported a violation that exists in no commit.
- **G9 → repoint both axes, and add **Shape** as the third.**
  Standards → `docs/rules/`, Spec → `docs/planning/<slice>/spec.md`, plus the list of what
  tooling already covers. Both vendored targets are absent here and `git remote -v` prints
  nothing — *instrument: `test -e` on each path, 2026-08-19*. Shape reads `design.md` and
  `seams.md` and catches the two defects this method exists because of: IMPORT's 176-line
  handler, and a public symbol with no producer. **Record** was rejected for now — its stronger
  half belongs to `close-slice` under definition-of-done row 9.

- **G10 → the register converts, then archives.** The nine deficits DRIVER does not answer —
  12, 15, 16, 17, 18, 19, 20, 23, 24 and the sharpened 27 — become ticket files under
  `issues/` at step 4, in the form [`issues.md`](../../rules/issues.md) already requires.
  Every other entry is marked with what answered it. [`deficits.md`](../method/deficits.md)
  then moves to [`docs/history/`](../../history/) as the evidence record it always was, and
  **METHOD's roadmap row closes.** *Measured: 28 deficits — 6 closed, 2 fixed, 1 declined, 19
  open, of which DRIVER's decisions answer or dissolve about ten.* Keeping it live was
  rejected because `docs/README.md` gives `planning/` the lifetime *"until the slice closes"*,
  and a register nobody reads is the 2000-line ledger failure the roadmap's own cap exists to
  prevent.
- **G11 → alignment is the front of step 1, not a seventh step.** `map-slice` gains a gate:
  draft the destination and the probable question set, **agree it**, and only then measure and
  dispatch. [`slices.md`](../../rules/slices.md)'s step-1 gate gains one clause; the six steps
  stay. Two files change instead of thirteen — *measured: "six steps" appears 19 times across
  13 files, including a section heading in [`walkthroughs/slice.md`](../../walkthroughs/slice.md)
  and the rationale for the page's twelve sections.* It is a gate rather than a step because it
  produces agreement, not an artefact, and every other step produces a file. Leaving it out of
  the rule entirely was rejected as deficit 12 repeated verbatim — *the up-front / just-in-time
  boundary is nowhere written.*

**Step 3's gate passes: Open and Fog are both empty.** Seventeen questions were raised across
the slice and every one is closed, dissolved or retired.

**One fog patch dissolved rather than graduating.** *What lands in the lint bucket* is no longer
a question: G2 settled that the four `shape.ts` regexes become custom oxlint rules, and ADR 006
settled the rest. It is build work, and becomes a ticket at step 4.

---

## A language defect, found while mapping

The repository uses **two words for one artefact**, and
[`CONTEXT.md`](../../../CONTEXT.md) — whose entire job is one word, one meaning — has an
entry for neither.

```
"call stack"    3 places, one of them a RULE   docs/rules/artefacts.md:15
                                               .agents/skills/setup-abu-usama-skills/SKILL.md:79
                                               .agents/skills/vendor/README.md:18
"call graph"   17 files, one of them a RULE    docs/rules/slices.md, definition-of-done row 10,
                                               four skills, every design.md, the roadmap
CONTEXT.md                                     no entry for either
```

[`language.md`](../../rules/language.md) is the rule this breaks, and its own stated check is
*"every cross-link resolves"* — which is why nothing caught it.

## Open

**Empty — the gate passes.** Seventeen questions were raised across this slice and every one
is answered, dissolved or retired. All of them are recorded in **Decided** above, with what
answered them.

---

## Fog

**Empty.** Three patches dissolved into answers at step 3 and two graduated into G10 and
G11, which is the frontier working as [`slices.md`](../../rules/slices.md) describes: an
answer clears the fog ahead of it, and what becomes specifiable becomes a question.

---

## Out of scope

**Confirmed by the principal, this session.**

- **Packaging the method as a plugin, or as a boilerplate repo.** *"We need to dogfood it a
  few more times until we've got it right… at no point adding it as infrastructure yet."*
- **Genericising the method away from this project.** *"This is very much coded and hard
  coded to this project whereas it should be a bit more generic"* — acknowledged, and a later
  round.

- **The page's no-personal-data rule.** Principal, this session: *"drop that rule
  altogether… that is very very specific to the thing and no, we don't need that rule."*
  [Deficit 28](../method/deficits.md) is therefore **declined** — not fixed, not open,
  not closed. It is the first entry to need a state the register cannot express, which is
  the live case for the filing work.

**Provisional — the agent's, not yet confirmed.**

- **Correcting `seams.md:27` and `knowledge-flow.md:42`**, which still describe a Cursor. It
  is a product-documentation fix worth five minutes on its own, and it is more useful to this
  slice left standing, as the live case S1 and G3 are measured against.
- **Rewriting the vendored skills.** [`vendor/README.md`](../../../.agents/skills/vendor/README.md)
  forbids it and nothing here needs it.
