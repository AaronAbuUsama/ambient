# DRIVER — spec

**Slice:** DRIVER · **State:** specified, not built · **Specified:** 2026-08-19

The shape is [`design.md`](./design.md) and this document does not restate it — the caller,
the dispatch trace, the interfaces and the conformance table live there, and
[decisions.md](../../rules/decisions.md) forbids one statement having two homes. Every
question this slice raised, and what answered it, is [`scope.md`](./scope.md)'s **Decided**.
The one ADR it produced is
[ADR 006](../../adr/006-schema-is-the-parse-boundary.md).

Vocabulary is [CONTEXT.md](../../../CONTEXT.md) — *Slice, Kind, HITL / AFK, Fog, Spike* are
used here in exactly the senses defined there, per [language.md](../../rules/language.md).

---

## The question this slice answers

**Can a slice be run, rather than remembered?**

Six skills exist and each one works. Nothing invokes them in order, nothing knows which step
a slice is on, and nothing notices when a step ends without its artefact. So every session
opens with the principal reconstructing state out loud, and every cross-cutting obligation —
regenerate the page, report what changed — is a convention an agent has to remember.

## The frame

**What it is allowed to get wrong.** The wording of the step report. The exact staleness
heuristic. Whether `auto` mode ever gets built. All of these are cheap to change: they are
markdown, and one caller types them.

**What it must never get wrong.** Two things, and they are the same failure at two scales:

1. **An agent must never answer its own `grilling` question.** The mechanism is structural,
   not textual — `grilling` has no row in the dispatch table, so there is nothing to
   dispatch it to.
2. **A step must never report green while its artefact is wrong.** This is the failure the
   whole method exists to remove, and the one this slice is most able to reproduce: INGEST
   passed sixteen gate rows while `seams.md` described a mechanism disproved four days
   earlier.

---

## Problem Statement

Measured 2026-08-19 at `940c5d7`, working tree clean. Each figure carries its instrument.

| What is wrong | Measured | Instrument |
|---|---|---|
| An obligation stated in prose and called from nowhere | *"Regenerate the page — `render-slice <SLICE>`"* in **6** places; `package.json` has **2** scripts, neither of them `render-slice` | `grep` over `.agents/skills/*/SKILL.md` and `docs/rules/slices.md`; `node -e` over `package.json .scripts` |
| A step with no skill | **1 of 6** — step 3 | the skill table in `AGENTS.md`, read against `slices.md`'s six rows |
| Skills that do not resolve to what this repository vendored | **44 of 124** entries in `~/.claude/skills/` dangle, including all seven vendored upstream skills | `test -e` over every symlink in that directory |
| Skills invoked by bare name rather than by path | **3** lines — `walkthroughs/slice.md` 91, 92, 135 — plus `slices.md:126` | two greps, the second narrowed to invocation form |
| Rules with no mechanical check | **7 of 12** have none on any clause; all 12 have at least one unchecked clause | [findings/01](./findings/01-code-review-inputs.md), read against `vite.config.ts` and `scripts/shape.ts` |
| A review skill whose axes point at nothing | Standards → `CODING_STANDARDS.md` · `CONTRIBUTING.md`; Spec → `docs/agents/issue-tracker.md`. **All three absent**, `git remote -v` prints nothing | `test -e` on each path; `git remote -v \| wc -l` → 0 |
| A defect register in a form nothing else uses | **739 lines, 28 deficits**, three informal states, no way to say *retracted* or *declined* | `wc -l`; `grep -oE` over the bolded status strings |

## Solution

One skill, `/slice`, with two invocations and no others. It reads seven signals off disk to
learn which step a slice is on, reports that before doing anything, **stops and asks**, and
then dispatches one step skill by repository path — followed by `render-slice` and the step
report, which stop being conventions and become call sites.

It **reads; it does not parse.** `scripts/slice.ts` was built twice as a markdown parser and
deleted twice, at `68d2180` and `00d9b09`. The seven signals are file existence and one
`grep` for a `Status:` line.

It **writes nothing durable.** That is what keeps it cheap, and it is why two-session
collision is *reported* rather than locked.

Full shape: [`design.md`](./design.md).

## User Stories

- *As the principal,* I type `/slice DRIVER` and learn which step it is on, what changed
  since last time, and what would happen next — **before** anything runs.
- *As the principal,* I type `/slice chart KNOWLEDGE` and am shown a drafted destination and
  question set to react to, and **nothing is dispatched until I agree** — because two of the
  three `research` questions this slice raised, I answered from memory in one sentence.
- *As the principal,* I answer a `grilling` question knowing no agent can answer it for me,
  because nothing can dispatch it.
- *As a reviewer,* I read a diff against this repository's own twelve rules and against
  `design.md`, rather than against a `CODING_STANDARDS.md` that does not exist.
- *As the next agent in this repository,* I type `/tdd` and get the vendored copy.

## Implementation Decisions

Each is recorded with what it beat in [`scope.md`](./scope.md) § Decided; this is the index.

| # | Decision | Where the detail is |
|---|---|---|
| 1 | The entry point is a **skill**, not a script | scope § Decided; two deletions of `scripts/slice.ts` |
| 2 | The model is `wayfinder`'s two invocation modes over this repo's six steps | scope § Decided; recovered at `33ebae2` |
| 3 | The driver **dispatches `render-slice`**; five restatements are deleted | design § Branch points, B1 |
| 4 | The driver **emits the step report**; its template leaves `deficits.md` | design § Branch points, B3 |
| 5 | **No seventh skill.** AFK kinds join the dispatch table; `grilling` has no row | design § Branch points, B2 |
| 6 | `disable-model-invocation: true` on the driver now; **observe** the mechanism before flagging six | design § Branch points, B4 |
| 7 | Two-session collision is **reported**, never locked | design § Branch points, B5 |
| 8 | Our own code-review skill: **repoint both axes, add Shape** | scope § Decided, G9; [findings/01](./findings/01-code-review-inputs.md) |
| 9 | The register **converts to tickets, then archives**; METHOD closes | scope § Decided, G10 |
| 10 | **Alignment is the front of step 1**, as a gate — not a seventh step | scope § Decided, G11 |
| 11 | Rules are **code rules (lint)** or **agent rules (the reviewer)**. No third kind, no tripwire | scope § Decided, G2 |

## Design

[`design.md`](./design.md). It holds the caller, the dispatch trace and its ownership table,
the three interface surfaces, the empty seam delta, the conformance table, the state-and-
failure table, and the five collapsed branch points with what each beat.

**The seam delta is empty.** DRIVER adds no module, so there is **no ticket `00`** — the
first slice for which that is true, and the reason ticket `00` existed in both IMPORT and
INGEST is that it wrote seam rows nothing else would.

## Testing Decisions

**A skill has no test seam.** No `vp test` assertion can observe a markdown file dispatching
another markdown file, and pretending otherwise is how this document would become theatre.

What is observed, and how:

| Claim | Observed by |
|---|---|
| every dispatch path resolves | `vp run shape` — it already checks document cross-links, so writing the paths as links makes this run |
| the driver reports the right step | by hand, against four slices whose state is known and different |
| the driver changed no step skill | `git diff --stat .agents/skills/` names only the new file |
| the seam-row check fires | `vp test` — it is a `shape.ts` section, and it fired on the real prior state once already |
| the page is not stale | `<slice>.html` newer than the newest `.md` beside it |

Two of the seven state signals — *step 5 all tickets done*, *step 6 roadmap closed* — are
exercised by no live slice at the right moment, because every slice that has them is already
closed. They are checked against the historical state of `import/` and `ingest/`.

---

## The gate

The spec's §4, made executable. `close-slice` runs
[definition-of-done.md](../../design/definition-of-done.md) over it.

1. `/slice DRIVER` names the step DRIVER is actually on, the artefact that decided it, and
   what would run next — **without running anything**.
2. `/slice` on a slice with no directory offers `chart` and does not create one.
3. `/slice` on a name that is not on the roadmap lists the slice names and stops.
4. `/slice` on a slice whose current step's artefact exists but fails that step's gate says
   which gate clause failed, and offers `redo`.
5. All seven state signals are read by `ls` and `grep` only. **No file is parsed into a data
   structure** — checked by reading the skill.
6. The driver reports the step **before** it asks, and asks **before** it dispatches. Every
   dispatch is preceded by a `y` in the transcript.
7. `/slice chart <NAME>` reaches an alignment gate and dispatches nothing before agreement —
   including no `research` subagent.
8. Every dispatch names a skill by repository path. `grep` finds no bare-name invocation in
   the driver.
9. The dispatch table has a row for `research` and for `spike`, and **no row for
   `grilling`** — the mechanism by which an agent cannot answer its own grilling question.
10. Running any step through the driver leaves `<slice>.html` newer than every `.md` beside
    it.
11. Every step run through the driver emits a step report in the template's shape: no bare
    id in a heading, every question written as a question, what closed as well as what is
    open.
12. `vp run shape` resolves every dispatch path in the driver, as document cross-links.
13. `/tdd`, `/code-review`, `/grilling`, `/research`, `/prototype`, `/codebase-design` and
    `/domain-modeling` each resolve to the copy under `.agents/skills/vendor/`, not to a
    plugin or a harness built-in.
14. `scripts/shape.ts` names any module in a `design.md` § Seam delta that owns no row in
    `seams.md`, and exits non-zero. It passes on the tree as it stands.
15. `no-throw`, the `../..` import ban, the cross-module `internal/` ban and the 250-line
    limit are oxlint rules. `shape.ts` contains **no line-level regex over source**.
16. The driver carries `disable-model-invocation: true`, and the observation of whether that
    flag blocks skill-to-skill dispatch is recorded with its instrument.
17. `/slice` on a slice touched by another session in the last N minutes says so, from
    `mtime` and `git status`, and writes no lock file.
18. Our code-review skill reads `docs/rules/` for Standards, `docs/planning/<slice>/spec.md`
    for Spec, and `design.md` plus `seams.md` for Shape — and carries the list of what
    tooling already enforces.
19. `docs/planning/method/` no longer exists; `deficits.md` is under `docs/history/`; the ten
    surviving deficits are ticket files; METHOD's roadmap row reads `● closed`.
20. `map-slice` reaches an agreement gate before it measures or dispatches, and
    `slices.md`'s step-1 gate names it.

## Out of Scope

Confirmed by the principal, 2026-08-19.

- **Packaging the method as a plugin or a boilerplate repo.** It has run on one slice.
- **Genericising the method away from this project.** Acknowledged, and a later round.
- **The page's no-personal-data rule** — declined outright; deficit 28.
- **Re-solving the four diagram recipes to fit a 944px container.** Deficit 27 is sharpened
  by this slice — the register's own proposed fix was tried and does not work — but the fix
  is a re-solve of all four recipes and is its own piece of work.
- **Adopting Effect `Schema`.** [ADR 006](../../adr/006-schema-is-the-parse-boundary.md) is
  accepted for `home` and proposed for `transcript`; the work is not DRIVER's.

## Further Notes

**Every number in this document was measured on 2026-08-19 at `940c5d7`** unless it names a
different instrument inline. Two of them corrected an earlier claim in the same session — the
"38 bare-name references" was 34 kind-names used as vocabulary plus 4 real ones, and deficit
27's "1440px display" is a 1280px viewport. Both are recorded because the instrument mattered
more than the figure.

**This slice's own map got something wrong, and it is worth carrying.** Two of its three
`research` questions were facts the principal already held, and one subagent died after 600
seconds having read nothing. Gate row 7 exists because of that, and `map-slice` has no test
for *"could the principal simply answer this?"* — which is what the alignment gate becomes.
