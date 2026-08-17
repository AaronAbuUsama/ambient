# docs

**Nothing lives at this root except this file.** Every document is in exactly one of six
directories, and which one it goes in is decided by *what kind of statement it makes* — not
by what it is about.

| Directory | Holds | Lifetime |
|---|---|---|
| [`rules/`](rules/) | **How we work.** One rule per file: the rule, its argument, the check that enforces it. Indexed by [AGENTS.md](../AGENTS.md). | permanent, amended |
| [`design/`](design/) | **What is true now.** The product model, the seam map, the roadmap, the definition of done. | permanent, edited in place |
| [`adr/`](adr/) | **What was decided, and what it beat.** Created lazily. A correction is an `## Amendments` entry, never a rewrite. | permanent, append-only within a file |
| [`planning/`](planning/) | **What is being built.** One directory per slice: `scope.md`, `spec.md`, `issues/`. | until the slice closes |
| [`walkthroughs/`](walkthroughs/) | **How to follow something end to end** — a command through the code, or the process through a slice. | updated when what they trace changes |
| [`history/`](history/) | **How we got here.** Superseded scope, research, grills, handoffs. **Defers to `design/`.** | frozen |

## Which one does this go in?

The test that decides it, in order:

1. Does it say **how to work**, and can it be checked? → `rules/`
2. Does it record a **choice between alternatives**? → `adr/`
3. Is it **true right now** about the system? → `design/`
4. Is it **work in flight**? → `planning/<slice>/`
5. Does it **trace something start to finish**? → `walkthroughs/`
6. Is it **superseded**, kept as evidence? → `history/`

If two answers fit, the earlier number wins. If none fit, the document probably restates
something that already has a home — [`language.md`](rules/language.md) has the table of one
statement, one home.

## Start here

| You are | Read |
|---|---|
| new to the codebase | [`walkthroughs/doctor.md`](walkthroughs/doctor.md) — one command, keypress to exit, through every file it touches |
| about to build something | [`walkthroughs/slice.md`](walkthroughs/slice.md) — what you type at each of the five steps, and how to tell it went well |
| about to write code | [`../AGENTS.md`](../AGENTS.md), then the one rule you are working under |
| looking for a word | [`../CONTEXT.md`](../CONTEXT.md) — the lexicon |
| wondering where we are | [`design/roadmap.md`](design/roadmap.md) — the only place that says |
