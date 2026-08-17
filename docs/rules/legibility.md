# Legibility

## The rule

1. **No source file under `src/` is longer than 250 lines**, unless it is in the
   exception list at the top of [`scripts/shape.ts`](../../scripts/shape.ts), where each
   row carries the reason it is one thing rather than two.
2. **A rule that cannot be run is not a rule.** Before stating a convention, write its
   check. If nothing checks it, say so in the rule's *check* section rather than
   implying something does.
3. **No top-level implementation nested inside a closure.** If a function is the
   module's work, it is a named top-level function in a file, not a nested arrow inside
   the entry point.

There is exactly one declared exception today: `src/modules/home/home.test.ts` at 307
lines, SKELETON's gate plus the `home` interface resolutions later areas add. Splitting it
for length would put part of the one interface gate in a file nobody knows to open.

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

- `vp run shape` — file length against the limit and the exception list, naming the file
  and the line it crosses; and a stale row in the exception list is itself an offence.
- Rule 3 is **not currently checked**.
