# DRIVER — design

Written 2026-08-19, against [`scope.md`](./scope.md). **No production code was written in
this session.** The caller below is a sketch, and step 5 will rewrite it.

## What this step had to bend, and it is a finding

[`design-slice`](../../../.agents/skills/design-slice/SKILL.md) assumes the thing being
designed is a TypeScript module reached from `main.ts`. It asks for real call expressions,
a trace from `main.ts` outward, rows for [`seams.md`](../../design/seams.md), and a test
seam per arrow.

**DRIVER's product is a skill.** It is markdown that reads files and dispatches other
skills. There is no module, no `main.ts` path, and no `seams.md` row — so three of the
step's eight sections have no literal subject.

They are not skipped. They are read across, and each translation is stated where it is
made:

| The step asks for | For a skill it is |
|---|---|
| the production call site, as code | **what the principal types, and what comes back** — the invocation, verbatim |
| the call graph from `main.ts` | **the dispatch trace** — what is read, what is decided, what is dispatched |
| interfaces read off the caller | **the state signals** read from disk, and what each step skill owes back |
| the seam delta | **empty, and that is the finding** — see § Seam delta |

This is deficit territory. It is recorded in `scope.md` rather than fixed here.

---

## The two shapes, and the caller that kills one

### Shape A — one skill, two modes, that dispatches

`/slice <SLICE>` reads the slice's files, says where it is, and offers to run the next step.
`/slice chart <NAME>` starts one that does not exist yet. It dispatches the step skill,
then `render-slice`, then issues the step report.

### Shape B — a signpost that decides but never dispatches

`/slice <SLICE>` reads the same files and prints the same state, then stops. It tells you
which skill to run next. You run it.

**The caller kills B.** The whole complaint deficit 10 records is:

> *"there should be like one skill to drive the whole process … instead of having to give
> you that brain dump."*

Shape B removes the *"which step am I on"* half of the brain dump and leaves the other
half standing: you still invoke `design-slice` yourself, and you still hand it the context
it needs. Under B, a session opens with two invocations instead of one, and the second one
is the one that was expensive. **A signpost that points at work you must still describe is
the state we are already in.**

---

## The caller

Two invocations, and they are the whole public surface.

### `/slice <SLICE>` — advance

```
> /slice DRIVER

DRIVER · step 2 of 6

  1 Map        done      scope.md — 3 questions open, all dispatchable now
  2 Design     ← next    design.md does not exist
  3 Frontier   —
  4 Plan       —
  5 Build      —
  6 Close      —

Two agents are running in this repository. Neither holds anything DRIVER needs.

Next: design-slice. It writes the caller first, then reads the interfaces off it.
Run it? [y / n / what changed since last time]
```

Failure branches, all of them values a reader sees rather than exceptions:

```
> /slice KNOWLEDGE
KNOWLEDGE has no directory under docs/planning/. It is `○ next` on the roadmap.
Start it?  →  /slice chart KNOWLEDGE

> /slice DRVIER
No slice named DRVIER. On the roadmap: SKELETON · IMPORT · METHOD · INGEST ·
KNOWLEDGE · HARNESS · LOOPS · CAPABILITIES · MOUTH · MEDIA · EVALS.

> /slice DRIVER            (with scope.md present and design.md half-written)
DRIVER · step 2, and design.md exists but has no ## Branch points.
Step 2's gate is the branch points. Finish it, or say `redo` to start the step again.
```

### `/slice chart <NAME>` — start one

Chart is where **alignment** happens, and it is the front of the whole process:

```
> /slice chart KNOWLEDGE

KNOWLEDGE is `○ next` on the roadmap, and depends on IMPORT ● and INGEST ●, both closed.
MEDIA is `○ off-path` and the roadmap says trusting KNOWLEDGE waits on it.

Before anything is spent — here is what I think this slice is, and what I think is open.
React to it; nothing is dispatched until you do.

  Destination   <two lines, drafted from roadmap.md and product.md>
  Probably open <n questions, drafted, each with a kind>
  Probably fog  <n patches>

  Of those, 3 are `research` and would go out to background agents now.
  2 are yours and nobody else can answer them.

Agreed? [y / amend / not yet]
```

**Nothing is dispatched before that `y`.** The principal, this session: *"at the beginning
there has to be an alignment thing … if we're aligned and we know what the research is, and
something can be dispatched on its own, it should just go."*

That gate is also the fix for a measured defect: this slice's own map classified two
questions as `research` that the principal answered from memory in one sentence. An
alignment step is where that is caught before a subagent is spent.

---

## Call graph

The dispatch trace. `/slice` is the only entry point; everything below it is a read or a
dispatch.

```
/slice <SLICE>                       the ONE thing the principal types
  │
  ├─ read the state                  seven signals, all `ls` and `grep`. NOT a parser.
  │    ├─ docs/planning/<slice>/           does the directory exist?
  │    ├─ …/scope.md                       exists → step 1 done
  │    ├─ …/design.md                      exists → step 2 done
  │    ├─ …/scope.md § Open                any lines → step 3 still open
  │    ├─ …/spec.md and …/issues/*.md      both → step 4 done
  │    ├─ …/issues/*.md `**Status:** done` all → step 5 done
  │    └─ docs/design/roadmap.md           row reads `● closed` → step 6 done
  │
  ├─ report where it is              the step table above. Before any action.
  │
  ├─ ASK                             ← stops here by default. The principal decides.
  │
  └─ dispatch the step               one skill, by path, never by bare name
       ├─ 1 → map-slice
       ├─ 2 → design-slice
       ├─ 3 → the AFK kinds, by kind, and nothing else
       │        research → vendor/research      spike → vendor/prototype
       │        grilling → hand back            task  → hand back with the checklist
       ├─ 4 → plan-slice
       ├─ 5 → new-module · tdd · code-review, per ticket
       ├─ 6 → close-slice
       │
       ├─ render-slice                after every step. One call site.
       └─ the step report             after every dispatch. One emitter.
```

### Ownership, and why not somewhere else

| Step | Owner | Why not elsewhere |
|---|---|---|
| reading which step a slice is on | **the driver** | it is the only thing that needs it; a step skill already knows which step it is |
| deciding whether to proceed | **the principal** | HITL. The driver reports and asks; `auto` mode is the declared exception |
| doing the step | **the step skill, unchanged** | the six skills work. The driver adds a caller, not a rewrite |
| regenerating the page | **the driver** — decided at B1 | one call site instead of six restatements none of which was ever a command |
| the step report | **the driver** — decided at B3 | six emitters of one format is how it was improvised every time; and it is the only home deficit 26 was ever offered |
| dispatching the AFK kinds at step 3 | **the driver** — decided at B2 | `grilling` has no row in the table, so an agent cannot answer its own grilling question |

**The driver reads; it does not parse.** `scripts/slice.ts` was built twice as a markdown
parser and deleted twice — `68d2180` (*"a skill reads markdown, it does not need a parser"*)
and `00d9b09`. The seven signals above are file existence and one `grep` for a `Status:`
line. A skill looks at a file the way a person does. Anything that turns markdown into a
data structure is the thing that was rejected.

---

## Interfaces

Read off the caller above. Three surfaces, and no others.

### 1 · What the driver reads

| Signal | How | Answers |
|---|---|---|
| the slice exists | `ls docs/planning/<slice>/` | chart, or advance |
| step 1 done | `scope.md` exists | — |
| step 2 done | `design.md` exists, and has a `## Branch points` heading | its gate |
| step 3 done | `scope.md` § Open and § Fog are both empty | its gate |
| step 4 done | `spec.md` exists **and** `issues/` is non-empty | its gate |
| step 5 done | every `issues/*.md` has `**Status:** done` | its gate |
| step 6 done | the slice's row in `roadmap.md` reads `● closed` | its gate |

Each signal is that step's own gate as written in
[`slices.md`](../../rules/slices.md), read rather than re-invented. **If a gate changes, the
driver changes with it, and that is correct** — the driver has no opinion of its own about
when a step is finished.

### 2 · What the driver dispatches

Every dispatch names a skill **by repository path**, never by a bare name:

```
.agents/skills/map-slice/SKILL.md
.agents/skills/design-slice/SKILL.md
.agents/skills/plan-slice/SKILL.md
.agents/skills/new-module/SKILL.md
.agents/skills/close-slice/SKILL.md
.agents/skills/render-slice/SKILL.md
.agents/skills/code-review/SKILL.md
.agents/skills/vendor/tdd/SKILL.md
.agents/skills/vendor/research/SKILL.md
.agents/skills/vendor/grilling/SKILL.md
.agents/skills/vendor/prototype/SKILL.md
```

*Measured 2026-08-19: three of these are invoked by bare name in
[`walkthroughs/slice.md`](../../walkthroughs/slice.md) lines 91, 92 and 135 — `/prototype`,
`/grilling`, and `/new-module → /tdd → /code-review` — and 44 of the 124 entries in
`~/.claude/skills/` are dangling symlinks, so `/tdd` resolves to a plugin and `/code-review`
to a harness built-in. Instrument: `test -e` over every symlink in that directory.*

**Amended 2026-08-20, closing the slice.** `code-review` moved out of `vendor/` and into
`.agents/skills/code-review/`. Ticket 09 built ours: the vendored copy grades Standards against
a `CODING_STANDARDS.md` and Spec against an issue tracker, and neither exists here, so both of
its axes pointed at nothing. Ours reads [`docs/rules/`](../../rules/), the slice's `spec.md`,
and — a third axis the vendored copy has no equivalent of — `design.md` and `seams.md` for
Shape. The dispatch rule is unchanged and is the reason this line had to move rather than rot:
**by repository path, never by a bare name.**

### 3 · What a step skill owes the driver

Nothing new. Each already produces a file at a known path and already states its own gate.
**The driver requires no change to any of the six.** That is the property that makes this
cheap, and the one to check at step 6 row 10: if a step skill had to grow a flag for the
driver, the driver is in the wrong place.

---

## Alternatives

The two-clause bar in [`seams.md`](../../design/seams.md) — *written through by many callers
**and** hard to change later* — **is not met.** A skill is a markdown file; changing it is a
diff, and one caller types it. So this is sketched once, and the shape below is recorded
only because it is tempting and wrong.

### Shape C — the driver absorbs the steps

One skill containing map, design, plan and close, with the six deleted. Rejected: it is a
~600-line SKILL.md that must be read whole to do any one step, which is the opposite of the
progressive disclosure `AGENTS.md` is built on. It also throws away six files that work, to
fix a problem that is entirely about **what invokes them**.

---

## Seam delta

**None. DRIVER adds no module.**

This is the first slice to reach step 2 with an empty seam delta, and it exposes something:
`new-module` refuses a module with no `seams.md` row, and **ticket `00` in both IMPORT and
INGEST existed only to write those rows.** DRIVER will have no ticket `00`. If a later slice
also adds no module and someone writes one out of habit, that is the ceremony this proves
unnecessary.

The dependency graph in [`seams.md`](../../design/seams.md) is unchanged.

---

## Test seams and conformance

**A skill has no test seam, and pretending otherwise is how this document would become
theatre.** There is no `vp test` assertion that can observe a markdown file dispatching
another markdown file.

What *can* be observed, and what each observation costs:

| Claim | How it is checked | Runnable? |
|---|---|---|
| every dispatch path resolves to a real file | `vp run shape` cross-links, once the paths are links | **yes** — it already checks documents |
| the driver reports the right step | run it on the four slices whose state is known and compare | by hand, four cases |
| the driver changed no step skill | `git diff --stat .agents/skills/` shows only the new file | **yes** |
| a step ends with the page regenerated | the driver dispatches it, so the check is that the driver did — `<slice>.html` newer than the newest `.md` beside it | **yes**, once written |

**The conformance table is the honest version of this step's usual one:**

| Surface | Its caller | What observes it |
|---|---|---|
| `/slice <SLICE>` | the principal, typing | four by-hand cases against known slices |
| `/slice chart <NAME>` | the principal, typing | one by-hand case against KNOWLEDGE |
| every dispatch path | the driver | `vp run shape`, if written as links |
| the seven state signals | the driver | the four by-hand cases exercise five of seven |

Two of seven signals — step 5 all-tickets-done, step 6 roadmap-closed — are exercised by no
current slice at the right moment, because every slice that has them is already closed.

---

## State and failure sequence

**The driver writes nothing durable.** It reads, reports, asks, and dispatches. That removes
the whole class of crash question this section usually holds.

What it does not remove:

| Failure | What is left | What the next run observes |
|---|---|---|
| a dispatched step skill fails halfway | whatever that skill wrote — e.g. a `scope.md` with a Destination and no Open | the driver reads the file as it is, reports step 1 as unfinished, and offers `redo` |
| the principal answers `n` | nothing | the same state, reported the same way |
| two sessions drive the same slice | two agents editing one markdown file | **reported, not prevented** — the driver prints `mtime` and `git status` before acting, and the principal decides |

The `redo` path is the important one, and it is why the driver reports state before acting
rather than after: **a half-written artefact is the normal case, not an error.**

---

## Branch points — all five collapsed at step 3

**Empty. Every branch point below became a decision on 2026-08-19**, recorded in
[`scope.md`](./scope.md)'s Decided with what it beat. They are kept here as the shape each
answer chose, because a decision with no rejected alternative was not a decision.

| Was | Decided | What it beat |
|---|---|---|
| **B1** who calls `render-slice` | **the driver dispatches it**, and the five restatements are deleted | each skill keeping it in its own Finish — that is the convention deficit 10 names, kept; and "both", which writes 143 KB twice per step |
| **B2** step 3 has no skill | **no seventh skill.** The AFK kinds join the driver's dispatch table; `grilling` and `task` hand back | a `frontier-slice` skill, whose only distinctive job is the one thing `slices.md` forbids it to do; and handing back entirely, which leaves AFK dispatch manual — where R3 died once |
| **B3** who owns the step report | **the driver emits it**, and the template leaves `deficits.md` | six skills emitting their own, which is how it was improvised every time |
| **B4** which skills a model may start | **flag the driver now; observe the mechanism on one step skill before flagging six** | flagging all seven, which acts on an unobserved mechanism the driver depends on |
| **B5** two sessions, one slice | **report staleness from `mtime` and `git status`; write no lock** | a lock file, which would make the driver the one thing that writes durably and adds a stale-lock failure |

**The collapsed shape, checked against the two invariants:**

- **No public symbol without a production call site.** The driver has two —
  `/slice <SLICE>` and `/slice chart <NAME>` — and both are written above under
  § The caller. Nothing else is exported, because a skill exports nothing.
- **Only the composition root wires.** The driver *is* the composition root for the process,
  and it is the only thing that names another skill. No step skill gains a dispatch, a flag
  or a parameter — which is the property step 6 row 10 checks: if one had to, the driver is
  in the wrong place.

**One decision changed the shape after it was drawn**, and the trace above is corrected in
place rather than left saying the old thing: B2's answer turned step 3 from a row with no
target into a row that dispatches by kind. `grilling` having no target is the mechanism, not
an omission.


## What follows

Startable now: **B1, B2, B3 and B5 are all decidable from this document** — they carry their
candidates as sketches and none waits on a fact. B4 waits on a five-minute observation, not
on a decision.

Nothing here waits on either running agent.
