# ADR 006 — Effect's `Schema` is the parse boundary, and `effect` enters at the RC

**Status:** accepted for `home`, proposed for `transcript`, 2026-08-19 · **Slice:** DRIVER
· **Amends:** [effect.md](../rules/effect.md) · **Supersedes:** nothing

## Context

Ambient parses external data in three places, and each one narrows `unknown` by hand.

| Place | Reads | Hand-written | anti-slop errors |
|---|---|---|---|
| `home/internal/yaml.ts` | a Config file | ~130 lines | 20 |
| `transcript/internal/parse.ts` | a Transcript on disk | ~200 lines | 34, plus 16 conditional spreads |
| `channel/internal/line.ts` | a Mirror record | ~90 lines | 2, plus 12 conditional spreads |

*Instrument: `vp check` at `940c5d7` with anti-slop installed, 2026-08-19, before any fix
landed.*

`home/internal/yaml.ts` is a schema library. It exports `record`, `text`, `textList`,
`textMap`, `oneOf`, `need`, `unknownKeys` and `done` — eight combinators that pass `unknown`
between them and push into a shared problem list. It exists for a real reason, stated at the
top of the file: *"a caller collects every problem in a file rather than stopping at the
first, and never needs a type assertion to proceed."* `ambient doctor` must report every
problem in a Config file at one time.

**`transcript` is a two-way translation and nobody wrote it as one.** `parse.ts` decodes JSONL
from disk. `internal/store.ts:49` encodes with `JSON.stringify`. `channel/internal/line.ts`
builds the same type from a Live account. Then `service.ts:44` compares two of those results
with a hand-written key-sorting replacer — because when it did not, a field-ordering
difference alone rewrote **638 of 1,000 lines**, recorded in that file's own comment as defect
D1 and covered by gate row 11.

Three hand-written translations of one type, plus a comparison function that exists because
two of them can disagree about shape.

**And nothing protects it.** `transcript.test.ts` uses `toEqual` 15 times and `toStrictEqual`
**zero** times. `toEqual` treats `{ text: undefined }` and `{}` as equal, so the suite cannot
observe a change in key presence — which is exactly the class of change that produced D1.

*Instrument: `grep -c` over `src/modules/transcript/transcript.test.ts`, 2026-08-19.*

## Decision

**External data is decoded at the boundary by an Effect `Schema`, which returns a domain type
or a typed error. Nothing downstream of that decode sees `unknown`.**

The dependency is **`effect@4.0.0-rc.110`**. The `rc` tag is ahead of the `beta`
(`4.0.0-beta.107`); the Principal chose the release candidate.

`Schema` is a **top-level, stable module** in v4 — `dist/Schema.js`, beside `SchemaAST`,
`SchemaGetter`, `SchemaIssue`, `SchemaParser`, `SchemaTransformation`. The `unstable/schema`
subpath is a different thing: it holds `Model` and `VariantSchema`, which we do not use.

*Instrument: `pnpm add effect@4.0.0-rc.110` into a scratch directory, then `ls dist/`,
2026-08-19.*

The four capabilities this decision rests on were each verified in that installed package:

| Needed for | API | Verified |
|---|---|---|
| a codec with no Effect runtime | `decodeResult` · `encodeResult` | ✅ in `dist/Schema.d.ts` |
| key **presence**, not just an undefined value | `optionalKey`, distinct from `optional` | ✅ |
| every problem, not the first | `errors?: "first" \| "all"` | ✅ in `dist/SchemaAST.d.ts` |
| one canonical wire form | `encodeSync` · `encodeResult` | ✅ |

**We keep the `yaml` package and `JSON.parse`.** Effect ships no YAML lexer and does not need
to. Turning text into data stays their job; checking that the data has the right shape becomes
Schema's.

**Two things stay ours.** `show()` renders what a person reads — *"a mapping"*, *"a list"* —
which is presentation. And `ProblemDetail` is Ambient's own problem shape, which `doctor`
prints. Mapping a Schema issue into a `ProblemDetail` is one function, not 130 lines.

## What this amends

[effect.md](../rules/effect.md) states: *"CLI, home, config, **validation** — **no** —
`Effect.gen` to read a YAML file is tax."*

**The rule's reason is about the effect runtime, and it does not reach `Schema`.**
`decodeResult` returns a `Result`. No `Effect.gen`, no `yield*`, no runtime, and no reader
needs the runtime's vocabulary to follow a Config parse. The rule was written before this
problem existed and against a different cost.

The same file requires that adoption be *"a change at one seam rather than a rewrite"*. A
codec at one boundary is one seam. This ADR is nonetheless a contradiction of a written rule
and is recorded as an amendment to it, per [decisions.md](../rules/decisions.md), rather than
as a quiet edit.

## The alternatives, and why they lost

| Alternative | Why it lost |
|---|---|
| **Keep the hand-written narrowers; turn three anti-slop rules off** | Three `"off"` lines is where a rule goes to die, and it keeps three copies of one job. It also leaves defect D1's cause in place. |
| **Add `zod` or another validator** | It decodes only. `transcript` needs **encode**, and encode is what removes the hand-written key sorter and D1's whole class. |
| **Write our own codec properly** | `yaml.ts` already is one. A second is the previous attempt's failure — the same shape written four times until no two agreed. |
| **Effect v3 (`3.22.1`)** | `Schema` is core there too, so it would work. The Principal chose v4; v4 is where this codebase is going, and adopting the version we will leave is a migration we would pay for twice. |

## Consequences

- **One new runtime dependency.** Ambient has four today. `effect@4.0.0-rc.110` brings
  `msgpackr`, `fast-check` and `@standard-schema/spec`.
- **`pnpm install` will fail on `ERR_PNPM_IGNORED_BUILDS`** until `msgpackr-extract` is
  answered in `pnpm-workspace.yaml`. This is the same failure ticket 00 of INGEST hit with
  `baileys` and `protobufjs`; it is a known, one-line answer.
  *Instrument: the scratch install above produced exactly that error.*
- **A release candidate is a moving target.** `rc.110` is the third rc in a visible series.
  Pin it exactly; do not float.
- **Reader cost.** Every person who reads `parse.ts` afterwards must know `Schema`. That is
  the real price, and it is the same price `effect.md` was written to avoid — at a lower dose.

## Order of work, and it is not negotiable

1. **Write the strict roundtrip test first.** It is needed whichever way this goes, and today
   nothing protects the path behind D1.
2. **Try Schema on `home/internal/yaml.ts`.** It is the small case, and no bytes on disk
   depend on the result, so falsifier 1 gets an answer for the cost of one file.
3. **Only then decide about `transcript`.** That file holds the format of 14,045 lines already
   written.

## Falsifiers

1. **Schema cannot produce `ProblemDetail`'s shape for less code than it removes.** Measured
   on `yaml.ts`: if the issue-to-`ProblemDetail` mapping plus the declarations exceed ~130
   lines, the hand-written library was the cheaper answer.
2. **`optionalKey` does not encode to the bytes already on disk.** 14,045 Transcript lines
   exist and 2,900,784 archive bytes are asserted byte-identical. An encode that changes one
   byte fails this ADR for `transcript`, whatever it does for `home`.
3. **The reader cost is higher than argued.** If a person cannot follow `home/internal/`
   after step 2, `effect.md`'s tax argument was right and this ADR is wrong at `home` as well.
4. **The rc does not stabilise.** If `4.0.0` does not ship, or ships with a changed `Schema`
   surface, this is a dependency on a moving target and step 3 must not have happened yet.
