# Types

## The rule

**No `any`** — not explicit, not `Record<string, any>`, not `as any`. Data from outside
the process enters as `unknown` and is narrowed at the boundary, one key at a time.

**Discriminated unions over boolean flags and optional-field state machines.** Make
illegal states hard to represent: if two fields must agree, model the pair.

## Why

**`any` is not a type, it is a hole in the check you are paying for.** One `any` at a
boundary silently disables inference for everything downstream of it, and the failure
surfaces as a runtime `undefined` far from the cast. `unknown` costs one narrowing at
the edge and pays for it everywhere after.

**Fail-closed parsing is the same argument in the small.** `internal/yaml.ts` turns YAML
into `unknown` and narrows it one key at a time, pushing a named problem for anything
that does not fit — so an unknown key is reported rather than dropped, and no step needs
a type assertion to proceed. A `as Config` in that position would have been three
characters and would have turned every config typo into a runtime surprise.

**Unions make the compiler do the auditing.** `Place` is branded so no caller can
fabricate one from a string; `ProblemDetail` is a closed union so adding a failure mode
breaks every renderer that has not handled it. A boolean pair — `{ ok: boolean;
problems?: Problem[] }` — expresses two states the code must never see, and someone
eventually writes them.

## The check

`vp check` — `typescript/no-explicit-any` is on (`vite.config.ts`), plus `strict`,
`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` and
`verbatimModuleSyntax` from `tsconfig.json`, with type-aware lint over the same files.

Assertions are **not currently checked** — `as` is still legal and is expected to stay
rare and documented at a proven boundary.
