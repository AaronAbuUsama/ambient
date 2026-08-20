# A slice, and how one is built

## The rule

A **Slice** is one named unit of roadmap work — SKELETON, IMPORT, INGEST. It is not a
module and does not map one-to-one onto modules: SKELETON was one Slice and produced two
modules. Slices have names, not numbers.

**Planning is per slice. The roadmap is the half that is not.** What the slices *are* —
their names, their order, and what breaks if you go backwards — is not derivable one slice
at a time, so it is planned once, up front, and lives in
[roadmap.md](../design/roadmap.md). Everything *inside* a slice is planned just-in-time and
step by step — `scope.md` when the slice becomes active, then `design.md`, then `spec.md` and
its tickets, each written by the step that needs it and not before. The roadmap is not an
exception to this rule; it is the planning this rule does not cover.

Every Slice goes through the same six steps, in order, and each step has one gate. **Do not
start a step until its gate passes.**

| # | Step | Produces | Gate — move on when |
|---|---|---|---|
| 1 | **Map** | `docs/planning/<slice>/scope.md` | **the principal agreed the destination, what is out of scope, and the shape of the questions before anything was measured or dispatched**, the destination is named, and every open question is either kinded or in the fog |
| 2 | **Design** | `design.md` | every public symbol in it has a call site in it, the seam delta is written, and **every `grilling` question names a block of it** |
| 3 | **Work the frontier** | answers, appended to **Decided** | **Open and Fog are both empty.** That is the way being clear |
| 4 | **Plan** | `spec.md` + the build tickets | every build ticket exists and declares its blockers |
| 5 | **Build** | code | every build ticket is `done` |
| 6 | **Close** | the roadmap moved on | every row of [definition-of-done.md](../design/definition-of-done.md) passes |

**Every step ends by regenerating the slice's one page.** A step that did not update the
page did not finish. **How** it is regenerated is not this rule's business and never was:
[`.agents/skills/slice/SKILL.md`](../../.agents/skills/slice/SKILL.md) dispatches it after
every step it dispatches. A step run outside the driver does not regenerate the page —
running a step bare is what the driver exists to stop.

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

**And it is agreed before anything is spent.** Draft the destination, the questions you
think are open with their kinds, and the fog you think is there — then **stop and get
agreement**. Nothing is measured and nothing is dispatched before it, including a `research`
subagent. Alignment produces agreement, not an artefact, which is why this is still six
steps and not seven.

*Measured on DRIVER:* two of the three questions its own map classified as `research` the
principal answered from memory in one sentence, and a subagent dispatched for a third died
after 600 seconds having read nothing.

**The fog test is whether you can state the question precisely now — not whether you can
answer it.** Sharp enough to phrase goes in Open; anything coarser stays in Fog and
graduates when the frontier reaches it. Do not pre-cut fog into question-sized pieces.

**Out of scope is a scoping act, not a step on the route.** Scope, not sharpness, lands
something there, and it never graduates — which is why it is **agreed at the alignment gate
above, never asserted by the map**. Deleting scope permanently is a decision, and decisions
are the principal's. A `scope.md` that rules something out the principal did not agree to has
failed step 1's gate; it is not a difference of style.

**A question about the *shape* is not the map's to ask.** The map asks about the
destination — what is in this slice, what it must not get wrong. *Which module owns this,
what does the caller look like, where does composition live* are answered by building the
shape at step 2, not by asking before one exists.

**Every open question carries an id and what it waits on**, so the frontier is a graph and
not a list:

```
R1  research   now                      — <the question>
G1  grilling   after design.md § Cursor — <the question>
T1  task       after R1                 — <the question>
```

`now` means **dispatchable this minute**. Every `research` and most `spike` questions are
`now`, they are AFK, and nothing serialises them.

### 2 · Design — the shape, before the questions about the shape

`design.md`, and **it is brainstorming, not interrogation.** Put two shapes up, write the
caller, and let the caller kill one. That is what SKELETON did and nobody wrote it down.

| Part | What it is |
|---|---|
| **Production call sites** | the caller's code, written first, failure branches included |
| **Call graph** | the trace from `main.ts` outward, with the module that owns each step |
| **Interfaces** | read back **off** the caller, never invented ahead of it |
| **Seam delta** | the rows added to [seams.md](../design/seams.md), before any module is scaffolded |
| **Test seams + conformance** | public symbol → its production caller → its test seam |
| **Alternatives** | where [seams.md](../design/seams.md)'s two-clause bar is met: two shapes, graded, and an ADR |
| **Branch points** | every place the shape depends on something unanswered. **This is the frontier**, and each one carries the code that raises it |
| *conditional:* **state and failure sequence** | per durable step: what is written, what a crash leaves, what a retry observes |

Three invariants govern it:

1. **Design the caller before the callee.**
2. **No implemented public symbol without a current production call site.**
3. **A design may be built with questions still open** — it designs against what is settled
   and marks the rest as branch points. Waiting for certainty is what step 3 is for.

**The gate is the branch points.** A `grilling` question that cannot name a block of
`design.md` is either not a shape question — move it to the map — or the design stopped
early. This is what makes step 3 answerable: the principal is looking at code, never at a
paraphrase of it.

### 3 · Work the frontier — every open question carries a kind

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

**An answer is recorded when it lands, whatever step is running.** Questions do not wait for
step 3 to be asked or answered — INGEST's three `research` answers all arrived while its map
was still being written, and DRIVER's did the same. The answer goes to `scope.md` under
**Decided**, one line pointing at whatever holds the detail, the moment it arrives. Step 3 is
where the frontier is *worked*, not where an answer is first permitted to exist.

**One decision per session, except `research`,** which parallelises because nobody is
waiting on it.

### 4 · Plan

`spec.md` says what the slice is for and what its gate is. **It does not restate the
design** — `design.md` holds that, and [decisions.md](./decisions.md) forbids one statement
having two homes. The spec links to it; the branch points are now answers, so the design is
re-read and corrected in the same step.

Build tickets are files: `docs/planning/<slice>/issues/NN-<slug>.md`, per
[issues.md](./issues.md). **Ticket blockers come from symbols, call sites and owned files —
never narrative order**, and `design.md` is where all three are already written down.

### 5 · Build

`new-module` scaffolds; [`tdd`](../../.agents/skills/vendor/tdd/SKILL.md) — the vendored
copy — builds one red-green step at a time;
[`code-review`](../../.agents/skills/code-review/SKILL.md) — ours, because the vendored one
grades against files this repository does not have — closes. Each is named by path because a
plugin and a harness built-in answer to those words too. One ticket per session.

### 6 · Close

`close-slice` runs [definition-of-done.md](../design/definition-of-done.md) and reports
before writing anything.

## Why

**We codified the artefacts and not the method, and the method degraded the moment nobody
was watching it.** Eleven other rules in this directory say what a *file* must look like and
`vp run shape` enforces every one. Nothing said how a decision becomes a file, so IMPORT
fell back to generic skills that do not know this repository. Three things followed:

- **The call graph was never designed.** [README.md](../../README.md) calls
  [walkthrough-doctor.md](../walkthroughs/doctor.md) *"the shortest path to owning this
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

**Why Design is a step and not a section.** The first version of this rule had none: the
Program design was a heading inside `spec.md`, produced at the Plan step, and the Plan step
was gated on the frontier being empty. So the rule required every question answered before
anything could be designed, while its own first invariant said *design the caller before the
callee*. **A circular dependency, in two rows of one table.**

It fired once, on INGEST, and produced exactly what the shape predicts: ten open questions,
no code, and **four of the five `grilling` questions asking whether something is in the slice
** — *is the pairing screen in scope, do `contact` events land here, is this a long-running
process*. Those are size questions, and you cannot size work you have not designed. The fifth
asked where composition lives for a long-running verb, which
[import.md](../walkthroughs/import.md) already answers; it read as open only because nobody
drew the caller next to it.

The dates say the same thing. **SKELETON wrote `seams.md` at 11:32 and its spec at 15:22 —
design four hours before.** IMPORT wrote its spec at 11:48, code at 12:19 and the interface
ADR at 16:37 — **five hours after**. The rule was written from IMPORT, which is the slice
that went wrong.

## Seeing it

**One page draws the whole slice**, regenerated at the end of every step by the driver.
Its twelve sections are not a matter of taste — they are these six steps projected, grouped
**Plan · Design · Record**, so what is missing from the page names the step that has not run. One
artefact per slice and no others: [artefacts.md](./artefacts.md).

## The check

- `vp run shape` — every cross-link in `scope.md`, `design.md` and `spec.md` resolves. A
  `grilling` question that names a block of `design.md` is checked here for *resolving*;
  nothing checks that it is the right block.
- [definition-of-done.md](../design/definition-of-done.md) row 10, **read not run**: the call
  graph in `design.md` matches the code, or the divergence is recorded as an amendment. It
  joins rows 7–9, which are also read rather than run.

**Not currently checked**, and each is a candidate once two Slices have used this rule:

- that `scope.md` exists before `design.md`, and `design.md` before `spec.md`
- that Open and Fog were empty when `spec.md` was written
- that every `grilling` line in `scope.md` carries a `design.md` anchor
- that every CLI verb has a walkthrough
- that every public symbol has a production caller — the one most worth automating, because
  `transcript` shipped live variants no caller originates
