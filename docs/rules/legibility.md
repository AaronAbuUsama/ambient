# Legibility

## The rule

1. **No source file under `src/` is longer than 250 lines**, unless it is in the
   exception list at the top of
   [`scripts/lint/legibility.ts`](../../scripts/lint/legibility.ts), where each row
   carries the reason it is one thing rather than two.
2. **A rule that cannot be run is not a rule.** Before stating a convention, write its
   check. If nothing checks it, say so in the rule's *check* section rather than
   implying something does.
3. **No top-level implementation nested inside a closure.** If a function is the
   module's work, it is a named top-level function in a file, not a nested arrow inside
   the entry point.

There are two declared exceptions today, both gates: `src/modules/home/home.test.ts`, which
is SKELETON's gate plus the `home` interface resolutions later slices add, and
`src/modules/transcript/transcript.test.ts`, which is gate rows 11-13 and the roundtrip
rows that extend them. Splitting either for length would put part of one gate in a file
nobody knows to open.

## Why

**250 lines is where a file stops being readable in one sitting** — by a human scrolling
and by an agent holding it in context. The previous attempt's `index.ts` was 696 lines
and had to be broken into a 212-line `types.ts` and an 86-line `service.ts` before
anyone could say what `home` was. The limit is not craft for its own sake: it is what
keeps `types.ts` answerable in one read.

**An exception with a reason is a decision; an exception without one is decay.** The
list is code, in the checker, so adding a row is a diff someone reviews.

**Every line of apologetic prompt prose is a missing check.** Documentation that asks
politely for a property is the weakest possible enforcement, and it rots silently — this
file's own rule was claimed against `doctor`, which checks a *home directory* and has
never looked at this repository at all. That is the failure mode the rule is written
against.

## The check

- `vp check` — `contract/file-length`, an oxlint rule in
  [`scripts/lint/legibility.ts`](../../scripts/lint/legibility.ts): file length against the
  limit and the exception list, naming the file and the line it crosses.
- `vp run shape` — a stale row in the exception list is itself an offence. The lint rule is
  told about one file at a time and so can honour a row without noticing that the file it
  names is gone; only a walk of the tree can say so.
- Rule 3 is **not currently checked**.

**And the checkers are checked.** Rule 2 applies to itself: a check nobody can run a
case against is a rule that has only ever been tried on whatever the repository
happened to contain. `vp test` — [`scripts/shape/checks.test.ts`](../../scripts/shape/checks.test.ts)
covers all six checks `vp run shape` runs, each as a function of its inputs, including
the boundaries no real file has reached: a roadmap exactly on its cap, one line over,
with and without its terminating newline, one declaring no cap at all, and a diagram
recipe clearing its legend rule by exactly the floor and by one less. That last set
is why the file exists — the cap check counted the empty string after the terminating
newline, was one over on every Prettier-formatted file, and would have rejected a
conforming roadmap at exactly the number it is allowed to be. Review caught it.

The four oxlint rules under [`scripts/lint/`](../../scripts/lint/index.ts) are **not unit
tested**: `@oxlint/plugins` ships no rule tester, so an in-process test would have to
fake the `context` and the traversal, and a fixture-driven one would need deliberately
non-conforming files that `vp check` must then be told to ignore. They are instead run
over every file this repository authors on every `vp check`, which the shape checks —
which run over one tree, once, in one shape — are not.
