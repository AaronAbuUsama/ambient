# A slice, and how one is built

## The rule

A **Slice** is one named unit of roadmap work — SKELETON, IMPORT, INGEST. It is not a
module and does not map one-to-one onto modules: SKELETON was one Slice and produced two
modules. Slices have names, not numbers.

Every Slice goes through the same five steps, in order, and each step has one gate. **Do not
start a step until its gate passes.**

| # | Step | Produces | Gate — move on when |
|---|---|---|---|
| 1 | **Map** | `docs/planning/<slice>/scope.md` | the destination is named, and every open question is either kinded or in the fog |
| 2 | **Work the frontier** | answers, appended to **Decided** | **Open and Fog are both empty.** That is the way being clear |
| 3 | **Plan** | `spec.md`, including **Program design** | every build ticket exists and declares its blockers |
| 4 | **Build** | code | every build ticket is `done` |
| 5 | **Close** | the roadmap moved on | every row of [definition-of-done.md](../design/definition-of-done.md) passes |

### 1 · Map

`scope.md` has five headings and no others:

```markdown
## Destination     one or two lines. What reaching the end of this Slice looks like.
## Decided         one line per answer, pointing at whatever holds the detail.
## Open            questions sharp enough to state now. Each carries a kind.
## Fog             real, in scope, not yet sharp enough to phrase.
## Out of scope    ruled beyond the destination. Never graduates.
```

**The destination is named first**, because it fixes the scope and everything else is judged
against it.

**The fog test is whether you can state the question precisely now — not whether you can
answer it.** Sharp enough to phrase goes in Open; anything coarser stays in Fog and
graduates when the frontier reaches it. Do not pre-cut fog into question-sized pieces.

**Out of scope is a scoping act, not a step on the route.** Scope, not sharpness, lands
something there, and it never graduates.

### 2 · Work the frontier — every open question carries a kind

The kind says who does the work and what comes back. It is the only classification a
question gets.

| Kind | Mode | Who does it | What comes back |
|---|---|---|---|
| `research` | AFK | a `research` subagent | one findings file, cited to primary sources |
| `spike` | AFK | throwaway code | evidence kept, plus one paragraph of what it settled |
| `grilling` | **HITL** | the principal and the agent, live | a decision — and an ADR **only** if it is hard to reverse |
| `task` | either | a human does a thing | a fact. The one kind that *does* rather than decides, and it earns its place by unblocking a decision |

**HITL means the human speaks for themselves. An agent that answers its own grilling
questions has broken this.** Facts are the agent's job; decisions are the principal's.

**An open question is a line in `scope.md`, not a file.** It becomes a file only when it
must outlive the session or run AFK in parallel — a long research pass, a spike to return
to. That is the exception, not the shape.

**One decision per session, except `research`,** which parallelises because nobody is
waiting on it.

### 3 · Plan

`spec.md` carries a **`## Program design`** section. Five parts, and a sixth only when
durable writes exist:

| Part | What it is |
|---|---|
| **Production call sites** | the caller's code, written first, failure branches included |
| **Call graph** | the trace from `main.ts` outward, with the module that owns each step |
| **Test seams** | the highest useful seam per arrow, and what each test observes |
| **Conformance table** | public symbol → its production caller → its test seam |
| **Seam delta** | the rows added to [seams.md](../design/seams.md), before any module is scaffolded |
| *conditional:* **state and failure sequence** | per durable step: what is written, what a crash leaves, what a retry observes |

Three invariants govern it:

1. **Design the caller before the callee.**
2. **No implemented public symbol without a current production call site.**
3. **Ticket blockers come from symbols, call sites and owned files — never narrative order.**

Build tickets are files: `docs/planning/<slice>/issues/NN-<slug>.md`, per
[issues.md](./issues.md).

### 4 · Build

`new-module` scaffolds; `tdd` builds one red-green step at a time; `code-review` closes.
One ticket per session.

### 5 · Close

`close-slice` runs [definition-of-done.md](../design/definition-of-done.md) and reports
before writing anything.

## Why

**We codified the artefacts and not the method, and the method degraded the moment nobody
was watching it.** Eleven other rules in this directory say what a *file* must look like and
`vp run shape` enforces every one. Nothing said how a decision becomes a file, so IMPORT
fell back to generic skills that do not know this repository. Three things followed:

- **The call graph was never designed.** [README.md](../../README.md) calls
  [walkthrough-doctor.md](../walkthrough-doctor.md) *"the shortest path to owning this
  codebase"* — a trace of one command through every file it touches. There is no
  walkthrough for `import`, and its handler is **176 lines against 8, 8, 12 and 14** for its
  siblings, which makes `cli` the composition owner while its own spec says the handler
  *"wires and does nothing else"*.
- **An interface that met the design-it-twice bar did not get it.**
  [seams.md](../design/seams.md) reserves it for interfaces *"written through by many callers
  **and** hard to change later"*. `transcript` has two readers plus KNOWLEDGE and its line
  format is on 13,134 lines on disk. One design, no ADR, no alternative considered.
- **The pipeline did not know its own preconditions.** `new-module` refuses a module with no
  `seams.md` row; the skill that ran before it did not know `new-module` existed. Ticket 00
  existed because no step knew the pipeline.

**Everything was green while the topology was wrong.** That is the argument for a gate that
reads the call graph rather than only the tests.

**Why the kinds, and why no tickets before the spec.** The kinds are the one thing that
genuinely varies — a fact you can read, a shape you must build to see, a decision only the
principal can make, and a job someone has to go and do. Ticketing them was tried on paper and
rejected: IMPORT's whole pre-spec phase fit in one session, so tickets would have been files
that lived for a day. Build tickets stay because they are proven — six files, blocking edges,
one context window each, executed end to end.

**Why `spike` and not `prototype`.** This repository already says spike everywhere —
`.spike-private/`, *"the spike reported"*, `spike.ts` — and also contains
`prototype-archive-reader`. Two words for one thing, in one path. One word, one meaning:
[language.md](./language.md).

## The check

- `vp run shape` — every cross-link in `scope.md` and `spec.md` resolves.
- [definition-of-done.md](../design/definition-of-done.md) row 10, **read not run**: the call
  graph in the spec's Program design matches the code, or the divergence is recorded as an
  amendment. It joins rows 7–9, which are also read rather than run.

**Not currently checked**, and each is a candidate once two Slices have used this rule:

- that `scope.md` exists before `spec.md`, and that Open and Fog were empty when it did
- that every CLI verb has a walkthrough
- that every public symbol has a production caller — the one most worth automating, because
  `transcript` shipped live variants no caller originates
