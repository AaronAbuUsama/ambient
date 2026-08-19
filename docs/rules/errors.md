# Errors are values

## The rule

A failure is a value. Every way a module can fail is a variant of a tagged union
declared in its `types.ts`, and every fallible function returns it:
`openHome(path): Home | HomeProblem`. Narrow with `"problems" in result`.

`throw` is reserved for a genuine invariant violation — a bug, not a condition. There
are none under `src/` today. No error classes, no `instanceof` ladders, no rethrow to be
rescued by a `catch` two layers up.

## Why

**An interface that throws lies about how it fails.** A signature returning `Home` says
"this works"; the throw is discovered at 3am. A signature returning `Home | HomeProblem`
says what can go wrong, and the compiler makes the caller answer for it. It is also
exactly the `E` channel [Effect](./effect.md) will want at the loop layer — written
before it is needed, so adoption is a change at one seam rather than a rewrite.

**Why not error classes.** A class is discovered by catching it: nothing in the type
system tells a caller which errors it must handle, so the set drifts as implementations
change, and every consumer grows an `instanceof` chain that is right only until someone
adds a subclass. A closed union is exhaustively switchable — the `never` arm in
`internal/problem.ts` fails to compile the day a variant is added — and one renderer
handles every arm, which is why `cli` can print a problem without knowing what problems
exist.

**The evidence, from this repo.** ADR 001 amendment 5: `writeNew` rethrew an `fs` error
after clearing its temp file, and the convergence loop rescued it with `.catch()` and
turned it into `Unreadable`. The caller already treated it as a condition while the
implementation called it a bug — so the throw was pure ceremony, and the `catch` was
load-bearing error handling hidden inside a rescue. The same pass found the mirror
failure: `list` swallowed a failed `readdir` into `undefined`, so a directory `home`
could not read was reported as *empty and healthy*. Both are now `ProblemDetail`s, and
`doctor` says `chats/: unreadable — EACCES …`.

**Prefer discriminated unions generally**, not only for failure — over boolean flags and
optional-field state machines, so illegal states are hard to represent. See
[types.md](./types.md).

## The check

- `vp check` — `contract/no-throw`, an oxlint rule in
  [`scripts/lint/errors.ts`](../../scripts/lint/errors.ts). It reports a `throw`
  *statement*, by file and line, in every file but a `*.test.ts` or a `testing.ts`. The
  word in a comment or a string is prose and does not fire — the line-level regex it
  replaced could not tell the two apart, and failed the repository on 2026-08-19 over a
  comment reading "the honest fallback rather than a throw".
- `vp test` — gate assertion 18 asserts the same rule from inside the suite, because it
  is one of the invariants SKELETON's spec §4 is written in. It is still a regex over the
  file's text, so it reads the bare verb only.
- `vp check` — `noFallthroughCasesInSwitch` plus the `never` arm makes a union
  non-exhaustive at compile time.
