# DRIVER · R3 — What should this repository's own code-review skill read?

**Question.** The principal wants a code-review skill owned by this repo rather than the
vendored one, because the vendored skill grades on two axes — Standards and Spec — and
neither of them is pointed at this repository's actual conventions. It is open now, and not
before, because of a decision taken this session: every rule here is either a **code rule**
enforced by oxlint or an **agent rule** enforced by nothing mechanical, and for the second
kind *a reviewer reading the code in light of the rule is the entire enforcement mechanism*
([`scope.md`](../scope.md):107–121). So the question is not "should we fork the skill" but
"what must a reviewer here have in front of it, and is Standards + Spec enough."

**Sources.** [`vendor/code-review/SKILL.md`](../../../../.agents/skills/vendor/code-review/SKILL.md)
in full; all twelve files in [`docs/rules/`](../../../rules/); the lint block of
[`vite.config.ts`](../../../../vite.config.ts); all 169 lines of
[`scripts/shape.ts`](../../../../scripts/shape.ts);
[`definition-of-done.md`](../../../design/definition-of-done.md);
[`close-slice/SKILL.md`](../../../../.agents/skills/close-slice/SKILL.md);
[`setup-abu-usama-skills/SKILL.md`](../../../../.agents/skills/setup-abu-usama-skills/SKILL.md);
[`vendor/README.md`](../../../../.agents/skills/vendor/README.md);
[`AGENTS.md`](../../../../AGENTS.md); [`seams.md`](../../../design/seams.md);
[`ADR 006`](../../../adr/006-schema-is-the-parse-boundary.md); DRIVER's own
[`scope.md`](../scope.md). **Read-only pass.** Nothing under `src/` was opened or touched, no
rule, skill or vendored file was edited, `vp check` and `vp test` were not run, and the only
file written is this one.

**Tags.** **[read]** = asserted by the cited line. **[measured]** = observed by running
code in this session. **[inference]** = mine, asserted by no source.

*Every number below states its instrument. Measurements were taken at working-tree state
`115898f` + uncommitted changes (`M vite.config.ts`, `M package.json`, `?? tools/`,
`?? docs/planning/driver/`) — **the 17 oxlint rules are in the working tree, not in `HEAD`**.
Instrument: `git rev-parse --short HEAD`, `git status --porcelain`, `git diff --stat
vite.config.ts` → `35 insertions(+), 6 deletions(-)`. **[measured]***

---

## The answer

**One: the vendored skill's Standards axis cannot find this repo's standards, and its Spec
axis cannot find this repo's specs.** It looks for standards in *"`CODING_STANDARDS.md` or
`CONTRIBUTING.md`"* (SKILL.md:36) — neither exists here; the standards are twelve files under
`docs/rules/` reached by progressive disclosure from `AGENTS.md`. It looks for the spec via
issue references in commit messages fetched through `docs/agents/issue-tracker.md`
(SKILL.md:29) — that path does not exist (**[measured]**: `ls -d docs/agents` → *No such file
or directory*), there is no remote to fetch from (**[measured]**: `git remote -v` prints
nothing), and the spec is `docs/planning/<slice>/spec.md`. Repointing those two lookups is
the *minimum* fix, and it is not a third axis — it is axis one and axis two being aimed at
the right files.

**Two: the "by nothing" set is large, and it is where a reviewer is the only enforcement.**
Of the twelve rules, **five** are covered in whole or in part by oxlint or `shape.ts`, and
**every one of the twelve has at least one clause that nothing runs**. Ten of the twelve
files say so themselves — **[measured]**, instrument `for f in docs/rules/*.md; do tr '\n' ' '
< "$f" | grep -oi "not[* ]*currently checked"; done | wc -l` → **10 occurrences across 10
files**; only `errors.md` and `imports.md` carry none. (A naive line-oriented
`grep -rin "not currently checked" docs/rules/` returns **9**, because `decisions.md`
line-wraps the phrase between lines 43 and 44 — stating the instrument is the difference
between those two numbers.)

**Three: a third axis is genuinely missing, and the strongest candidate is not "more
standards" — it is the *shape* of the program, read against `design.md`.** Standards reads
files; Spec reads intent; nothing reads topology. That is precisely the failure
[`definition-of-done.md`](../../../design/definition-of-done.md):50 records — *"Row 10 exists
because IMPORT passed rows 1–9 while its topology was wrong"* — and today it is checked only
at slice close, by hand, once, long after the diff that caused it. **[inference]** A reviewer
looking at a diff is the earliest point at which "this handler is becoming the composition
root" is cheap to fix. Six candidates are graded in §4; I do not pick one.

### What has to change, at minimum, before any third axis is considered

| Vendored input | What it resolves to in this repo | Verdict |
|---|---|---|
| *"`CODING_STANDARDS.md` or `CONTRIBUTING.md`"* (SKILL.md:36) | the twelve files in [`docs/rules/`](../../../rules/), indexed by [`AGENTS.md`](../../../../AGENTS.md):13–26 | **repoint** |
| *"fetch via the workflow in `docs/agents/issue-tracker.md`"* (SKILL.md:29) | file does not exist; [`setup-abu-usama-skills`](../../../../.agents/skills/setup-abu-usama-skills/SKILL.md):22–31 is where the answer lives | **repoint** |
| issue refs in commit messages, `#123` / `!67` (SKILL.md:29) | no remote (**[measured]**); tickets are `docs/planning/<slice>/issues/NN-<slug>.md` | **replace** |
| *"a spec file under `docs/`, `specs/`, or `.scratch/`"* (SKILL.md:31) | `docs/planning/<slice>/spec.md`, **and now `design.md`** — a second spec-shaped artefact the vendored skill has no slot for | **replace, and widen** |
| *"skip anything tooling already enforces"* (SKILL.md:41, :64) | a live subtraction as of today: **17** oxlint rules at `error` | **make concrete** |
| the twelve Fowler smells (SKILL.md:44–56) | still useful, still judgement calls | **keep** |

---

## 1 · What the vendored skill actually reads, and when

All quotations are from
[`.agents/skills/vendor/code-review/SKILL.md`](../../../../.agents/skills/vendor/code-review/SKILL.md).
**Never edited** — [`vendor/README.md`](../../../../.agents/skills/vendor/README.md):3.

### 1.1 The two axes, as stated

> **Standards** — does the code conform to this repo's documented coding standards?
>
> **Spec** — does the code faithfully implement the originating issue / spec?

— SKILL.md:8–9. **[read]**

> Both axes run as **parallel sub-agents** so they don't pollute each other's context, then
> this skill aggregates their findings.

— SKILL.md:11. **[read]**

### 1.2 What it reads first — the fixed point

> Whatever the user said is the fixed point — a commit SHA, branch name, tag, `main`,
> `HEAD~5`, etc. If they didn't specify one, ask for it.

— SKILL.md:19. **[read]**

> Capture the diff command once: `git diff <fixed-point>...HEAD` (three-dot, so the
> comparison is against the merge-base). Also note the list of commits via
> `git log <fixed-point>..HEAD --oneline`.

— SKILL.md:21. **[read]**

> Before going further, confirm the fixed point resolves (`git rev-parse <fixed-point>`) and
> the diff is non-empty. A bad ref or empty diff should fail here — not inside two parallel
> sub-agents.

— SKILL.md:23. **[read]** So the **only** thing both axes share as raw input is a three-dot
diff and a commit list. Neither axis is given the working tree, the module map, or any
artefact of the process.

### 1.3 How it locates the spec

> Look for the originating spec, in this order:
>
> 1. Issue references in the commit messages (`#123`, `Closes #45`, GitLab `!67`, etc.) —
>    fetch via the workflow in `docs/agents/issue-tracker.md`.
> 2. A path the user passed as an argument.
> 3. A spec file under `docs/`, `specs/`, or `.scratch/` matching the branch name or feature.
> 4. If nothing is found, ask the user where the spec is. If they say there isn't one, the
>    **Spec** sub-agent will skip and report "no spec available".

— SKILL.md:27–32. **[read]**

Steps 1 and 3 are both wrong here. **[measured]** `git remote -v` prints nothing;
`ls -d docs/agents` → *No such file or directory (os error 2)*. **[read]**
[`issues.md`](../../../rules/issues.md):5 — *"Specs and issues live under `docs/planning/`.
**There is no git remote.** Never run `gh`, `glab`, or any other remote tracker command."*

The patch this repo already declared is at SKILL.md:13:

> The issue tracker should have been provided to you — read `/setup-abu-usama-skills` for this
> repo's configuration. `<!-- PATCHED: see ../README.md -->`

— **[read]**, and [`vendor/README.md`](../../../../.agents/skills/vendor/README.md):36–41 records why.
**[inference]** That patch fixes the *pointer* but not the *procedure*: step 1 of the ordered
list still tells the skill to read commit messages for issue refs and fetch them, and
`setup-abu-usama-skills` is a different file from `docs/agents/issue-tracker.md` at
SKILL.md:29 — the patched line is the preamble, line 29 was not patched.

### 1.4 How it locates the standards

> Anything in the repo that documents how code should be written, such as
> `CODING_STANDARDS.md` or `CONTRIBUTING.md`.

— SKILL.md:36. **[read]** That is the whole of the location procedure. **[measured]** Neither
file exists at this repo's root (`ls` of the working directory; the standards index is
[`AGENTS.md`](../../../../AGENTS.md):13–26, twelve rows pointing into `docs/rules/`).

On top of whatever it finds, the axis carries a fixed baseline:

> On top of whatever the repo documents, the Standards axis always carries the **smell
> baseline** below — a fixed set of Fowler code smells (_Refactoring_, ch.3) that applies even
> when a repo documents nothing. Two rules bind it:
>
> - **The repo overrides.** A documented repo standard always wins; where it endorses
>   something the baseline would flag, suppress the smell.
> - **Always a judgement call.** Each smell is a labelled heuristic ("possible Feature Envy"),
>   never a hard violation — and, like any standard here, skip anything tooling already
>   enforces.

— SKILL.md:38–41. **[read]** The baseline is twelve smells, SKILL.md:45–56: Mysterious Name,
Duplicated Code, Feature Envy, Data Clumps, Primitive Obsession, Repeated Switches, Shotgun
Surgery, Divergent Change, Speculative Generality, Message Chains, Middle Man, Refused
Bequest. **[measured]** twelve bullets, SKILL.md:45–56.

### 1.5 What each sub-agent is handed

**Standards** — SKILL.md:60–64. **[read]**

> - The full diff command and commit list.
> - The list of standards-source files you found in step 3, **plus the smell baseline from
>   step 3** pasted in full — the sub-agent has no other access to it.
> - The brief: "Report — per file/hunk where relevant — (a) every place the diff violates a
>   documented standard: cite the standard (file + the rule); and (b) any baseline smell you
>   spot: name it and quote the hunk. Distinguish hard violations from judgement calls —
>   documented-standard breaches can be hard, but baseline smells are always judgement calls,
>   and a documented repo standard overrides the baseline. Skip anything tooling enforces.
>   Under 400 words."

**Spec** — SKILL.md:66–70. **[read]**

> - The diff command and commit list.
> - The path or fetched contents of the spec.
> - The brief: "Report: (a) requirements the spec asked for that are missing or partial;
>   (b) behaviour in the diff that wasn't asked for (scope creep); (c) requirements that look
>   implemented but where the implementation looks wrong. Quote the spec line for each
>   finding. Under 400 words."

> If the spec is missing, skip the Spec sub-agent and note this in the final report.

— SKILL.md:72. **[read]**

Three properties matter for us. **[read]** The Standards sub-agent gets a *list of file
paths* plus the baseline pasted **in full** — because *"the sub-agent has no other access to
it"* (SKILL.md:63). **[inference]** That is the mechanism the twelve rules would ride on:
either pasted in full, which is far larger than a baseline of twelve bullets, or handed as
paths for the sub-agent to open — and `docs/rules/` is written for exactly that, *"Read the
rule you are about to work under"* ([`AGENTS.md`](../../../../AGENTS.md):5). **[read]** The
Spec sub-agent gets **one** spec artefact; there is no slot for a second.

### 1.6 Output shape

> Present the two reports under `## Standards` and `## Spec` headings, verbatim or lightly
> cleaned. Do **not** merge or rerank findings — the two axes are deliberately separate (see
> _Why two axes_).

— SKILL.md:76. **[read]**

> End with a one-line summary: total findings per axis, and the worst issue _within each axis_
> (if any). Don't pick a single winner across axes — that's the reranking the separation exists
> to prevent.

— SKILL.md:78. **[read]**

And the argument for separation, SKILL.md:82–87 **[read]**:

> - Code that follows every standard but implements the wrong thing → **Standards pass, Spec
>   fail.**
> - Code that does exactly what the issue asked but breaks the project's conventions → **Spec
>   pass, Standards fail.**
>
> Reporting them separately stops one axis from masking the other.

**[inference]** The output contract generalises to N axes without change: N headings, no
reranking, one line per axis. A third axis costs a heading and a sub-agent, not a redesign.

---

## 2 · The twelve rules, and what enforces each today

### 2.1 The instruments

**oxlint.** **[measured]** `grep -oE '"[a-z-]+/[a-z-]+": "error"' vite.config.ts | wc -l` →
**17** rules, all at `error`, at [`vite.config.ts`](../../../../vite.config.ts):45–63. Of
those, **[measured]** `grep -c '"anti-slop/' vite.config.ts` → **15** are anti-slop; the other
two are `vite-plus/prefer-vite-plus-imports` and `typescript/no-explicit-any`. **[measured]**
`ls tools/oxlint/anti-slop/rules | wc -l` → **15** rule files, so every rule the plugin ships
is registered. Lint runs with `options: { typeAware: true, typeCheck: true }`
([`vite.config.ts`](../../../../vite.config.ts):64) and **ignores**
`.agents/skills/vendor/**`, `.claude/skills/**` and `tools/oxlint/anti-slop/**`
([`vite.config.ts`](../../../../vite.config.ts):33). **[read]**

**`scripts/shape.ts`.** **[measured]** `wc -l scripts/shape.ts` → **169** lines. (DRIVER's
[`scope.md`](../scope.md):166 says 165 — the file's mtime is later than that measurement;
**[inference]** it grew after the map was written. Instrument stated so the two numbers do not
compete.) It makes exactly **seven** assertions, **[read]** by line:

| shape.ts | Asserts |
|---|---|
| `:92` | source file over `LIMIT = 250` lines and not in the `LONGER` exception list |
| `:98–101` | a line matching `["']~\/modules\/([^/"']+)\/internal` where the module is not the owner |
| `:102–104` | a line matching `from "../..` or `import("../..` |
| `:105–107` | a line matching `\bthrow\b` outside `*.test.ts` and `internal/testing.ts` |
| `:111–113` | a `LONGER` row naming a file that no longer exists |
| `:122–129` | every directory under `src/modules/` has `README.md`, `types.ts`, `service.ts`, `internal/`, `<name>.test.ts` |
| `:139–157` | every `](…)` in every `.md` resolves, `#frag` and `:NN` stripped |

Three of those seven are line regexes (`:98`, `:102`, `:105`). **[read]**
[`scope.md`](../scope.md):110–112 records the principal on them: *"that regex looks weird, I
don't like that at all… we should be using oxlint custom rules."*

**What `shape.ts` does not read.** **[measured]**
`grep -nE "seams|design\.md|planning|\.html|scope\.md|spec\.md|CONTEXT" scripts/shape.ts` →
**exit 1, no matches**. The shape checker is blind to every artefact the process produces.

### 2.2 The table

*Reading: "oxlint" and "shape.ts" mean a mechanical check fires on that clause today.
"nothing" means no command in this repo observes it. `vp check` (tsc) and `vp test` (the
gate suite) are named where they are the actual instrument, because calling those "nothing"
would be false.*

| # | Rule | What it requires | oxlint today | `shape.ts` today | Nothing |
|---|---|---|---|---|---|
| 1 | [language.md](../../../rules/language.md) | use the lexicon's word; a new noun is added to `CONTEXT.md` in the same change; a definition never carries a decision; the code words are not redefined | — | cross-links only (`:139`) | **all four clauses.** `:73` — *"That a newly-invented noun was added to the lexicon is **not currently checked**… a diff that introduces a domain noun and does not touch `CONTEXT.md` is the thing to question"* |
| 2 | [slices.md](../../../rules/slices.md) | six steps, one gate each; `scope.md`'s five headings; every open question carries id + kind + what it waits on; design's eight parts and three invariants; ticket blockers from symbols not narrative | — | cross-links only | **everything except link resolution.** `:198–212` names five candidates, incl. *"that every public symbol has a production caller — the one most worth automating"* |
| 3 | [modules.md](../../../rules/modules.md) | six slots per module; `main.ts` the only file reading env / exiting / printing / taking argv; no export-for-testing; the three depth tests | — | **six slots** (`:122–129`) | `main.ts` sole composition root; no nested-closure implementation (`:72–73`, self-declared); export-for-testing; deletion test, interface-is-test-surface, two-adapters bar (`:50–55`) |
| 4 | [imports.md](../../../rules/imports.md) | `~/modules/<name>/…`, never `../..`, never another module's `internal/` | — | **both clauses** (`:98–104`) | — *(the only rule with no unchecked clause besides `errors.md`)* |
| 5 | [errors.md](../../../rules/errors.md) | failures are tagged-union variants declared in `types.ts`; nothing throws; no error classes, no `instanceof` ladders | — | **no `throw`** (`:105`) | that a failure is *declared in `types.ts` as a union variant*; no error classes; no `instanceof` ladder. `vp test` gate 18 and `noFallthroughCasesInSwitch` cover the rest (`:44–48`) |
| 6 | [types.md](../../../rules/types.md) | no `any` anywhere; external data enters as `unknown`, narrowed at the boundary; discriminated unions over boolean flags | **`typescript/no-explicit-any`**; and 15 anti-slop rules bear on the narrowing clause — `no-unknown-parameters`, `no-unknown-returns`, `no-unknown-type-aliases`, `no-unsafe-dictionary-type`, `no-runtime-typeof`, `require-safety-comment-for-type-assertion`, `no-chained-type-assertions`, `no-widen-then-assert` | — | *"discriminated unions over boolean flags and optional-field state machines"* |
| 7 | [effect.md](../../../rules/effect.md) | services are interfaces, deps injected never constructed; one composition root; no ambient globals, no hidden I/O; effects at the edges | — | — | **all four.** `:48` — *"**Not currently checked.** `vp check` catches none of this, and the composition root being the only wiring site is enforced by review"* |
| 8 | [legibility.md](../../../rules/legibility.md) | 250 lines, exceptions declared with a reason; a rule that cannot be run is not a rule; no top-level implementation nested in a closure | — | **rule 1** (`:92`, `:111`) | rule 2 and rule 3 (`:40`). [`scope.md`](../scope.md):128–134 records that rule 2 *"conflates two kinds of rule"* |
| 9 | [knowledge.md](../../../rules/knowledge.md) | match OK's format; never spawn `ok`; `home` has no ports; address OK over MCP | — | — | *"That no future module shells out to `ok` is **not currently checked**"* (`:43`). `vp test` covers the scaffold shape (`:38–41`) |
| 10 | [issues.md](../../../rules/issues.md) | specs and tickets are files under `docs/planning/`; never `gh`/`glab`; one file per ticket; a `Status:` line from six strings | — | cross-links to specs/tickets (`:139`) | *"That no agent types `gh` is **not currently checked**"* (`:42`); the `Status:` vocabulary; one-file-per-ticket |
| 11 | [decisions.md](../../../rules/decisions.md) | decisions are ADRs under `docs/adr/`; read the ADRs that touch a slice; a correction is an **amendment**, never a body rewrite; never two answers in two documents | — | cross-links only (`:37`) | *"That a correction was written as an amendment rather than an edit to the body is **not currently checked** — `git log -p docs/adr/` is the evidence"* (`:43–44`) |
| 12 | [artefacts.md](../../../rules/artefacts.md) | generated HTML/diagrams designed with the named skill; one HTML artefact per slice; theme-aware, self-contained, local file, headline in five seconds | — | — | *"**Not currently checked** — no script inspects generated HTML for design quality… Enforced instead at the point of instruction"* (`:62–65`) |

**Summary. [measured]** oxlint touches **1** of the 12 rules (`types.md`). `shape.ts` touches
**4** substantively (`modules.md`, `imports.md`, `errors.md`, `legibility.md`) plus a
cross-link check that applies to every document rule but validates no rule's content. **Seven
rules — `language`, `slices`, `effect`, `knowledge`, `issues`, `decisions`, `artefacts` — have
no mechanical check on any clause at all.** That set, plus the unchecked clauses of the other
five, is what a code-review skill here has to carry.

### 2.3 One rule's own check section is already stale

**[read]** [`types.md`](../../../rules/types.md):36 — *"Assertions are **not currently
checked** — `as` is still legal and is expected to stay rare and documented at a proven
boundary."* **[measured]** `require-safety-comment-for-type-assertion`,
`no-chained-type-assertions` and `no-widen-then-assert` are all registered at `error` in
[`vite.config.ts`](../../../../vite.config.ts):48, 61, 62 as of this working tree.
**[inference]** The sentence was true yesterday and is false today, and nothing in the repo
would notice: `shape.ts` checks that the *link* resolves, never that the *claim* holds. This
is the concrete case for candidate **C** in §4 — a diff that changes what enforces a rule and
does not change the rule's check section is exactly the diff a reviewer can catch and no
command can.

---

## 3 · Definition of done rows 7–10 — which a code review could own

**[read]** [`definition-of-done.md`](../../../design/definition-of-done.md):40 — *"Rows 1–5
are the ones that fail. Rows 7–10 are the ones that get skipped when the work is done and the
writing-up is not."* **[read]** `:55` — row 10 is *"**read, not run**, like rows 7–9, because
the designed graph is prose today."*

| Row | What it reads | Owner | Why |
|---|---|---|---|
| **7** — status board | the slice's row reads `● closed`, **You are here** names the next slice ([`:18`](../../../design/definition-of-done.md)) | **`close-slice`, exclusively** | It is a statement about a slice having ended. A diff cannot be judged against it — the correct state *before* close is `◐ active`, so a reviewer flagging it would be flagging correctness |
| **8** — ledger | a dated two-line entry, and the slice's **Active** detail deleted in the same commit (`:19`) | **`close-slice`, exclusively** | Same argument. `close-slice/SKILL.md:53–59` is where the roadmap edit is specified, step by step |
| **9** — ADR amendments | every ADR statement that did not survive contact is corrected in that ADR's `## Amendments`, never a body rewrite (`:20`) | **shared — review detects, `close-slice` asserts** | The *detection* is diff-local and cheap: a diff that contradicts an ADR is visible in the diff. The *assertion that all of them were written up* is a whole-slice sweep. [`decisions.md`](../../../rules/decisions.md):11–14 requires the contradiction to be *"said explicitly"* at the moment it happens, which is review time; `:40` then names DoD row 9 as where it *"is asserted at close time, by reading"*. Two different acts, and only the second is `close-slice`'s |
| **10** — the call graph | `design.md` matches the code; the trace from `main.ts` owns each step where the design said; every public symbol has a production caller; no module became the composition root by accident (`:21`) | **shared, and this is the interesting one — see below** | |

### Row 10, split

`close-slice` states row 10 as three questions
([`close-slice/SKILL.md`](../../../../.agents/skills/close-slice/SKILL.md):29–37). **[read]**
They do not have the same shape:

1. *"**Does the graph match?** Walk the trace from `main.ts` and name any step whose owner
   differs from the design."* — **whole-program.** It needs the finished program, not a diff.
   **[inference]** `close-slice`'s.
2. *"**Does every public symbol have a production caller?** A symbol nothing constructs is
   design that got implemented — the conformance table is where to check."* — **diff-local.**
   A diff that adds an exported symbol either adds its caller or does not, and that is
   decidable from the diff alone. **[inference]** A reviewer's, and the earliest possible
   point. Corroborated by [`slices.md`](../../../rules/slices.md):211, which names this as
   *"the one most worth automating, because `transcript` shipped live variants no caller
   originates"* — **[read]**.
3. *"**Did any module become the composition root by accident?** A handler far larger than
   its siblings is the signal. `import`'s reached 176 lines against 8, 8, 12 and 14."* —
   **diff-local, and only visible in a diff.** **[inference]** By close time the handler is
   simply 176 lines and looks like a file; in the diff that grew it from 14, the growth is the
   finding. This is the row's own origin story
   ([`definition-of-done.md`](../../../design/definition-of-done.md):50–53) and it is the one
   place where reviewing late is strictly worse than reviewing early.

**[inference]** So row 10 is not one row. Questions 2 and 3 are review's; question 1 is
`close-slice`'s. Rows 7 and 8 are `close-slice`'s outright. Row 9 splits into a detection a
reviewer can do and an assertion only close can make. **A code-review skill that claimed all
of rows 7–10 would be wrong; one that claimed none of them leaves questions 2 and 3 to be
asked once, at close, about a program that no longer shows how it got that way.**

---

## 4 · Candidate third axes

**Not picked. Graded.** Each states what it would *read* — the concrete input beside the diff
— because that is the design question: a sub-agent gets the diff plus one list of files
(SKILL.md:62–63), so an axis is defined by that list.

### A — Shape · the call graph and the seam map

**Reads:** `docs/planning/<slice>/design.md` (call graph, interfaces, seam delta, conformance
table) and [`seams.md`](../../../design/seams.md).
**Asks:** does this diff put behaviour where the design said it goes; does every public symbol
it adds have a production caller in the same diff; does a module here own a row in `seams.md`;
did a handler grow toward being the composition root.

**Evidence.** **[read]** [`definition-of-done.md`](../../../design/definition-of-done.md):50 —
*"Row 10 exists because IMPORT passed rows 1–9 while its topology was wrong… Every test
passed, every check was green, and no row looked at the shape of the program."* **[read]**
[`slices.md`](../../../rules/slices.md):155 — *"Everything was green while the topology was
wrong. That is the argument for a gate that reads the call graph rather than only the tests."*
**[measured]** `shape.ts` contains no reference to `seams`, `design.md`, `planning`, `scope.md`
or `spec.md` (grep, exit 1), so no command reads either artefact. **[read]**
[`scope.md`](../scope.md):166–170 — for all of INGEST's steps 1–4, `ingest` was a module in the
design, the call graph and five tickets, owned no row in `seams.md`, and `vp run shape` printed
`clean` every day.

**Weakness.** **[read]** [`slices.md`](../../../rules/slices.md):201–203 calls the graph
*"prose today"*, and [`ingest/design.md`](../../ingest/design.md) holds it as hand-typed ASCII
([`scope.md`](../scope.md):199–204). **[inference]** An axis that reads prose is a judgement
call, not a check — but so is the entire Standards axis, and SKILL.md:41 already says every
baseline finding is *"always a judgement call"*.

**Overlap:** none with Standards. Partial with Spec — but Spec reads `spec.md`, which
**[read]** [`slices.md`](../../../rules/slices.md):115 says *"does not restate the design."*
The two artefacts are deliberately disjoint, which is the cleanest argument that this is a
third axis and not a widening of the second.

### B — Language · the lexicon

**Reads:** [`CONTEXT.md`](../../../../CONTEXT.md).
**Asks:** does this diff introduce a domain noun with no lexicon entry; does it use a word the
lexicon tells you not to use; does it name a code identifier something the lexicon already
names differently.

**Evidence.** **[read]** [`language.md`](../../../rules/language.md):73–75 — *"That a
newly-invented noun was added to the lexicon is **not currently checked**. The observable state
is a **review** one: a diff that introduces a domain noun and does not touch `CONTEXT.md` is
the thing to question."* **This is the only rule in the twelve that names review as its
enforcement and describes the check in diff terms.** **[read]**
[`language.md`](../../../rules/language.md):37 — *"One word naming two operations produced four
wrong answers in a single session."* **[read]** DRIVER found a live instance while mapping:
[`scope.md`](../scope.md):208–221 — *call stack* in 3 places against *call graph* in 17 files,
one of each in a **rule**, and `CONTEXT.md` has an entry for neither.

**Weakness.** **[inference]** Narrow. It is one clause of one rule, and on many diffs it will
report nothing. **[inference]** It is also arguably a Standards finding — `language.md` *is* a
documented standard, so repointing Standards at `docs/rules/` picks it up for free. The
counter-argument is that it needs a different input (`CONTEXT.md`, which is not a rule file)
and a different question (what is *absent* from a file the diff did not touch), and Standards
sub-agents are given a diff, not a lexicon.

### C — Record · decisions, amendments, and rule-check freshness

**Reads:** `docs/adr/`, the **Decided — do not re-litigate** list in
[`AGENTS.md`](../../../../AGENTS.md):59–71, and the `## The check` section of every rule the
diff touches.
**Asks:** does this diff contradict an ADR or a Decided item — and if so, is the contradiction
*said out loud* and written as an amendment; and does this diff change what enforces a rule
without updating that rule's check section.

**Evidence.** **[read]** [`decisions.md`](../../../rules/decisions.md):11–14 — *"When
implementation contradicts an ADR… say so explicitly and record the correction in that
document's `## Amendments` section. **Never rewrite the body.**"* **[read]** `:43–44` — that
this happened *"is **not currently checked** — `git log -p docs/adr/` is the evidence."*
**[read]** [`AGENTS.md`](../../../../AGENTS.md):72 — *"Contradicting one of these, or an ADR,
is allowed — silently is not."* **[read]**
[`definition-of-done.md`](../../../design/definition-of-done.md):45 — *"Row 9 is the sharpest.
Four statements in ADR 001 were wrong on contact with the implementation; a fifth followed."*
And the live case measured in §2.3: [`types.md`](../../../rules/types.md):36 says assertions
are unchecked while three assertion rules went to `error` the same day.

**Weakness.** **[inference]** Half of this is DoD row 9, which `close-slice` already owns — so
the axis has to be scoped to *detection in the diff*, not *the writing-up*, or it duplicates a
gate. **[inference]** The rule-check-freshness half is a genuinely new question that belongs to
no existing row, and it is the half with a measured failure sitting in the working tree today.

### D — Depth · the `codebase-design` tests

**Reads:** [`modules.md`](../../../rules/modules.md):44–61 and the vendored
`codebase-design` skill.
**Asks:** the deletion test, is-the-interface-the-test-surface, and the one-adapter-is-a-
hypothetical-seam bar.

**Evidence.** **[read]** [`modules.md`](../../../rules/modules.md):48 — *"Three tests, applied
before adding anything."* **[read]** `:72–73` — nothing checks them. **[read]**
[`vendor/README.md`](../../../../.agents/skills/vendor/README.md):11 — `codebase-design` is
vendored precisely because `modules.md` *"requires its vocabulary **exactly**."*

**Weakness — I think this one is weak.** **[inference]** It overlaps the vendored smell
baseline almost completely: the deletion test is Middle Man (SKILL.md:55), the two-adapters bar
is Speculative Generality (SKILL.md:53), and the interface-is-the-test-surface test is what
Feature Envy and Message Chains detect from the other side. **[read]** SKILL.md:40 already says
*"The repo overrides"* — so pointing Standards at `docs/rules/` makes `modules.md`'s three
tests the repo's override of those three smells, in the axis that already exists. Making it a
third axis buys a heading and pays for it with a second sub-agent asking a
correlated question.

### E — Gate integrity · does the change come with an assertion that can fail

**Reads:** the slice's `spec.md` §4 and the module's `<name>.test.ts`.
**Asks:** does this diff add behaviour with no gate assertion; does an assertion it adds
actually discriminate.

**Evidence.** **[read]** [`ADR 006`](../../../adr/006-schema-is-the-parse-boundary.md):36–40 —
*"`transcript.test.ts` uses `toEqual` 15 times and `toStrictEqual` **zero** times. `toEqual`
treats `{ text: undefined }` and `{}` as equal, so the suite cannot observe a change in key
presence — which is exactly the class of change that produced D1."* Instrument stated in that
ADR: `grep -c` over the file, 2026-08-19. **[read]**
[`definition-of-done.md`](../../../design/definition-of-done.md):12 — row 1 is *"the gate is
the spec's §4 made executable."*

**Weakness.** **[inference]** This is arguably inside Spec: *"requirements that look
implemented but where the implementation looks wrong"* (SKILL.md:70) covers a test that cannot
fail, if the sub-agent is told to read the gate. **[inference]** It also has a real claim to be
separate — a green suite that cannot observe the defect is the same failure class as a green
`shape.ts` over a wrong topology, and neither Standards nor Spec is currently pointed at the
test file at all.

### F — Artefacts and process · did the step finish

**Reads:** [`artefacts.md`](../../../rules/artefacts.md),
[`slices.md`](../../../rules/slices.md), the slice's HTML page.
**Asks:** was the page regenerated; was a diagram drawn with `diagram-design`; does the diff
respect the step gates.

**Evidence.** **[read]** [`slices.md`](../../../rules/slices.md):21 — *"Every step ends by
regenerating the slice's one page… A step that did not update the page did not finish."*
**[read]** [`artefacts.md`](../../../rules/artefacts.md):62 — *"**Not currently checked** — no
script inspects generated HTML for design quality, and it is not obvious one usefully could."*

**Weakness — I think this one is weak as a code-review axis.** **[inference]** A code diff
rarely contains the page, and when it does, the reviewer is reviewing 121 KB of generated HTML
rather than code. **[read]** [`scope.md`](../scope.md):142–153 measured that
`render-slice <SLICE>` *"is written as a command in six places and is not a command"* — so the
thing this axis would check for is not producible by a command yet. **[inference]** This is
DRIVER's own subject matter; it belongs to whatever runs the steps, not to the skill that
reads a diff.

### At a glance

| # | Axis | What it reads beside the diff | Overlaps | Unchecked by anything today |
|---|---|---|---|---|
| **A** | Shape — call graph, seam map | `design.md`, `seams.md` | none with Standards; disjoint from `spec.md` by rule | yes, entirely (measured: `shape.ts` grep, exit 1) |
| **B** | Language — the lexicon | `CONTEXT.md` | arguably Standards, once Standards points at `docs/rules/` | yes — and the rule names *review* as its enforcement |
| **C** | Record — ADRs, amendments, rule-check freshness | `docs/adr/`, `AGENTS.md` Decided, rule check sections | half is DoD row 9 (`close-slice`) | the freshness half, yes — live case in §2.3 |
| **D** | Depth — the three `codebase-design` tests | `modules.md`, `codebase-design` | heavy — Middle Man, Speculative Generality, Feature Envy | yes, but the baseline already asks the same questions |
| **E** | Gate integrity | `spec.md` §4, `<name>.test.ts` | partial with Spec | yes — measured in ADR 006 |
| **F** | Artefacts and process | `artefacts.md`, `slices.md`, the page | DRIVER's own subject | yes, and its own rule says a check is not obviously possible |

### One thing that is not an axis, and should not be dressed as one

**[inference]** *"Skip anything tooling already enforces"* (SKILL.md:41, and again in the
Standards brief at SKILL.md:64) is currently a sentence the sub-agent has to interpret. With
17 oxlint rules at `error` (**[measured]**), it can be a **list**: the axis-one brief can name
what is already mechanical — `no-explicit-any`, the 15 anti-slop rules, `shape.ts`'s seven
assertions — and say *report none of these*. That is not a third dimension; it is the
subtraction that stops axis one spending its 400 words on findings `vp check` already prints.

---

## What this pass did not answer

- **Whether the third axis is one axis or two.** A and C are both "read the record against the
  code" and could be one heading; A and E are both "the green checks did not look at this" and
  could be another. Deciding that is a grilling question, not a research one. **[inference]**
- **Whether `docs/rules/` is pasted or opened.** SKILL.md:63 pastes the baseline *"in full"*
  because the sub-agent has no other access; twelve rule files are far larger than twelve
  bullets, and [`AGENTS.md`](../../../../AGENTS.md):5 is built for progressive disclosure
  instead. Which of the two a sub-agent gets is a design decision with a token cost attached,
  and it was not measured here. **[inference]**
- **Whether `/code-review` resolves at all.** [`scope.md`](../scope.md):181–187 records that it
  does not — it resolves to a harness built-in with the same name and a different job, and
  seven of nine vendored skills are dangling. That is S1's, not R3's.

---

## Addendum · 2026-08-19, after ticket 08

**§2.2's table and §2.3's summary are as measured before `d440bc1`, and three rows have
moved.** They are left standing rather than edited — a findings file is evidence with a date
on it. This is the re-measurement, and it is the list ticket 09 must carry.

*Instrument: `grep -cE '^\s+"[a-z-]+/[a-z-]+": "error"' vite.config.ts` → **21** (15
`anti-slop`, 4 `contract`, `typescript/no-explicit-any`, `vite-plus/prefer-vite-plus-imports`);
`vp run shape` read top to bottom.*

| # | Rule | Was | Is now |
|---|---|---|---|
| 4 | [imports.md](../../../rules/imports.md) | `shape.ts`, both clauses | **oxlint** — `contract/no-relative-escape`, `contract/no-foreign-internal`. Read off the import specifier, so a doc-comment link and a `${import.meta.dirname}/../..` no longer count |
| 5 | [errors.md](../../../rules/errors.md) | `shape.ts`, no `throw` | **oxlint** — `contract/no-throw`, on a `ThrowStatement`. `vp test` gate 18 asserts the same invariant and now parses rather than greps |
| 8 | [legibility.md](../../../rules/legibility.md) | `shape.ts`, rule 1 | **oxlint** — `contract/file-length`. `shape.ts` keeps the stale-exception-row half, which needs a walk of the tree |

**Summary, re-measured.** oxlint touches **4** of the 12 rules (`types`, `imports`, `errors`,
`legibility`) — was 1. `shape.ts` touches **2** substantively (`modules`, and `legibility`'s
exception list) plus the seam-row check and the cross-link check, which applies to every
document rule and validates no rule's content — was 4.

**What has not moved, and is the whole of 09's case.** Seven rules — `language`, `slices`,
`effect`, `knowledge`, `issues`, `decisions`, `artefacts` — still have **no mechanical check on
any clause**, and all twelve still have at least one unchecked clause. Ticket 08 made four
checks better instruments; it made none of the seven checked.
