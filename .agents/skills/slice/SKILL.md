---
name: slice
description: Advance one slice of work in the ambient repo by exactly one step — read which step it is on from the files themselves, report the six-step table, ask, then dispatch that step's skill by repository path. Use when the user types "/slice DRIVER", asks where a slice is, what is next on it, or how to start one that does not exist yet.
disable-model-invocation: true
---

# Drive a slice

**The one thing the principal types.** It reads where a slice is, reports it, asks, and
dispatches one step. It is the caller for the six steps of
[`slices.md`](../../../docs/rules/slices.md), and it adds nothing to any of them.

Two invocations, and they are the whole surface:

| Typed | Means |
|---|---|
| `/slice <SLICE>` | advance this slice by one step |
| `/slice chart <NAME>` | start a slice that has no directory yet |

**This skill writes nothing durable.** It reads, reports, asks, dispatches. No lock file,
no state of its own, no cache. If it wrote something, the next run would have to trust it.

---

## 1 · Read the state

Seven signals. **All of them are `ls` and `grep`.** Run them before saying anything.

| # | Signal | Command | Answers |
|---|---|---|---|
| 1 | the slice exists | `ls docs/planning/<slice>/` | chart, or advance |
| 2 | step 1 done | `ls docs/planning/<slice>/scope.md` | — |
| 3 | step 2 done | `ls docs/planning/<slice>/design.md` then `grep -c '^## Branch points' docs/planning/<slice>/design.md` | its gate |
| 4 | step 3 done | `grep -A 8 '^## Open' docs/planning/<slice>/scope.md` and the same for `'^## Fog'` — **both empty** | its gate |
| 5 | step 4 done | `ls docs/planning/<slice>/spec.md` and `ls docs/planning/<slice>/issues/` | its gate |
| 6 | step 5 done | `grep -L -e '^\*\*Status:\*\* done' -e '^\*\*Status:\*\* wontfix' -e '^\*\*Status:\*\* retracted' docs/planning/<slice>/issues/*.md` — **prints nothing** | its gate |
| 7 | step 6 done | `grep '^| \*\*<SLICE>\*\*' docs/design/roadmap.md` reads `● closed` | its gate |

**Signal 6 repeats itself rather than alternating, because it lives in a table.** Three
`-e` patterns and not one `-E '(done|wontfix|retracted)'`: a `|` inside a table cell ends the
cell, and escaping it as `\|` is worse than useless — ERE reads `\|` as a literal pipe, so the
escaped form matches nothing and reports every ticket as unfinished. An agent reads this file
raw, not rendered. A command that only works after a markdown renderer has touched it is not
a command.

**Each signal is that step's own gate, read rather than re-invented.** If a gate in
[`slices.md`](../../../docs/rules/slices.md) changes, this skill changes with it. The driver
has no opinion of its own about when a step is finished.

### Read. Do not parse.

`grep -A` prints lines for you to **look at**. Decide by reading them, the way a person
reads a file. **Never turn a document into a data structure** — no field extraction, no
section objects, no `scripts/slice.ts`. That was built twice as a markdown parser and
deleted twice, at `68d2180` — *"a skill reads markdown, it does not need a parser"* — and at
`00d9b09`. Building it a third time is the failure this line exists to prevent.

### Staleness, before anything else

```bash
command ls -lt docs/planning/<slice>/      # newest first — read the timestamps
git status --short docs/planning/<slice>/  # uncommitted edits, if any
```

`command ls`, not `ls`: this machine aliases `ls` to `lsd`, whose columns differ. Do not
reach for `find -newermt` — `find` here is `bfs`, which rejects relative timestamps.

If the newest file was touched in the last half hour, or `git status` prints anything,
**say so in the report** — which files, and how recently. Then
carry on and let the principal decide. Two sessions on one slice is **reported, not
prevented**: a lock file would make this the one thing that writes durably, and would add a
stale-lock failure of its own.

---

## 2 · Report before you act

Always. Before the ask, before any dispatch, and even when the answer is obvious.

```
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

One line per step, the evidence that decided it in the right-hand column. The staleness
line goes above the ask, or is omitted when both commands printed nothing.

---

## 3 · Ask

**Stop here by default.** The principal decides whether the step runs.

- `y` → dispatch.
- `n` → stop. Nothing was written, so there is nothing to undo.
- anything else → answer it and ask again.

A dispatch with no `y` in front of it is this skill failing. The exception is a declared
`auto` mode, which the principal turns on out loud, per run.

---

## 4 · Dispatch one step

**By repository path, never by a bare name.** A bare name resolves to whatever the harness
or a plugin has under it — for one of these it resolves to a harness built-in with a
different job.

| Step | Dispatch |
|---|---|
| 1 · Map | `.agents/skills/map-slice/SKILL.md` |
| 2 · Design | `.agents/skills/design-slice/SKILL.md` |
| 3 · Frontier | by kind — see below |
| 4 · Plan | `.agents/skills/plan-slice/SKILL.md` |
| 5 · Build | per ticket: `.agents/skills/new-module/SKILL.md`, then `.agents/skills/vendor/tdd/SKILL.md`, then `.agents/skills/vendor/code-review/SKILL.md` |
| 6 · Close | `.agents/skills/close-slice/SKILL.md` |

**One step per run.** Advance by one, report, and stop. The principal types it again.

### Step 3, by kind

Step 3 is the only one of the six with no skill of its own. It does not need one: it needs
two rows.

| Kind | Dispatch | How |
|---|---|---|
| `research` | `.agents/skills/vendor/research/SKILL.md` | a background subagent, AFK and parallel — nobody waits on it |
| `spike` | `.agents/skills/vendor/prototype/SKILL.md` | throwaway code, run to find out |
| `task` | **hand back** | with its checklist: what to look up, and where |

**Three kinds. There is no fourth row, and the missing one is `grilling` — that absence is
the mechanism.** There is nothing to dispatch a grilling question to, so an agent cannot
answer one. It goes to the principal and only the
principal, and *"an agent that answers its own grilling questions has broken this"* stops
being prose an agent might obey and becomes a table with nowhere to route it.

Do not add a row for it. Do not route it to a subagent, to a vendored skill, or to your own
reasoning. If a grilling question is blocking, say so and hand back.

**`spike` is our word; `prototype` is theirs.** The kind keeps our name — see
[`CONTEXT.md`](../../../CONTEXT.md) — and the path is the vendored skill's.

### Then regenerate the page

**After every step this skill dispatches**, dispatch
`.agents/skills/render-slice/SKILL.md` for the same slice. It knows which of its twelve
sections the step just filled; this skill does not need to, and must not restate it.

One call site. The instruction *"regenerate the page"* used to sit in four step skills and
twice in [`slices.md`](../../../docs/rules/slices.md) — **six restatements, and never once a
command.** The rule stays where it was; only the instruction moved here.

**The cost, accepted:** a step skill run *without* this driver no longer regenerates the
page. That is correct. Running a step bare is what this skill exists to stop.

---

## 5 · Emit the step report

**After every dispatch, without exception.** Its shape is
[`docs/design/step-report.md`](../../../docs/design/step-report.md) — follow that file; do
not improvise a format here, and do not restate the template in this skill.

**This skill is the only emitter.** No step skill writes one. Six emitters of one format is
how it was improvised every time, and improvising it is what produced the deficits the
template answers.

Three things the template requires that are easiest to drop, so check them by name before
handing back:

- **What closed, not only what is open.** An answered question is reported with the answer.
- **Every answer arrives with its question**, written as a sentence ending in a question mark.
- **No bare id in a heading or a lead sentence.** Expand it the first time it appears.

A decision made *during* the step — a shape the ticket did not settle, a correction to the
design — goes under *What this step decided*. That is its one home.

---

## `/slice chart <NAME>` — start a slice

Charting is the **front of the whole process**, and it is where alignment happens.

Read the slice's row and its dependency edges in `docs/design/roadmap.md`, and
`docs/design/product.md` for what it owns. Then **draft, and stop**:

```
KNOWLEDGE is `○ next` on the roadmap, and depends on IMPORT ● and INGEST ●, both closed.
MEDIA is `○ off-path` and the roadmap says trusting KNOWLEDGE waits on it.

Before anything is spent — here is what I think this slice is, and what I think is open.
React to it; nothing is dispatched until you do.

  Destination   <two lines, drafted from roadmap.md and product.md>
  Probably open <n questions, drafted, each with a kind>
  Probably fog  <n patches>
  Out of scope  <what this deliberately does not reach>

  Of those, 3 are `research` and would go out to background agents now.
  2 are yours and nobody else can answer them.

Agreed? [y / amend / not yet]
```

**Nothing is dispatched before that `y` — including a `research` subagent.** Dispatching one
is spending. Only after agreement does `.agents/skills/map-slice/SKILL.md` run, and it
carries the same gate so alignment happens whether or not this skill was the caller.

**Create no directory here.** Charting produces agreement, not an artefact. `scope.md` is
written by the map, at step 1, after the gate.

---

## Failure branches

Each is a value the reader sees, not an exception.

**The slice has no directory, but it is on the roadmap** — offer to chart it, and
**do not create anything**:

```
KNOWLEDGE has no directory under docs/planning/. It is `○ next` on the roadmap.
Start it?  →  /slice chart KNOWLEDGE
```

**The name is not on the roadmap** — list the names and stop. Read them from
`docs/design/roadmap.md`'s status board:

```
No slice named DRVIER. On the roadmap: SKELETON · IMPORT · METHOD · INGEST ·
KNOWLEDGE · HARNESS · LOOPS · CAPABILITIES · MOUTH · MEDIA · EVALS.
```

A slice may have a directory without a roadmap row — DRIVER is work inside METHOD. **Signal
1 decides**: if the directory is there, advance it.

**The step's artefact exists but fails that step's gate** — name the clause that failed and
offer `redo`:

```
DRIVER · step 2, and design.md exists but has no ## Branch points.
Step 2's gate is the branch points. Finish it, or say `redo` to start the step again.
```

**A half-written artefact is the normal case, not an error.** A dispatched skill that fails
halfway leaves a real file behind. Report it as it is, and offer `redo`.

---

## What this skill never does

| Never | Because |
|---|---|
| dispatch before a `y` | the principal decides; this reports and asks |
| name a skill by its bare name | it resolves to a plugin or a harness built-in |
| parse a document into a data structure | built twice, deleted twice — `68d2180`, `00d9b09` |
| write a lock file | staleness is reported from `mtime` and `git status` |
| change a step skill | if one needed a flag for the driver, the driver is in the wrong place |
| run more than one step | advance by one, report, stop |
