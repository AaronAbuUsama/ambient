# `observe`

The mechanical pass: Transcript Lines to Observations, minus what the knowledge
base already holds. **No model, no clock.**

Read [`types.ts`](./types.ts) first. Two pure functions, and no third.

## What it owns

| Thing | What `observe` says about it |
|---|---|
| Lines → Observations | `from` reads a `who.label` off every Archive line and proposes one `Person` per distinct label. Nothing else — `schema.yaml` has six types and a script can be right about a display label and nothing else on any of the other five |
| what is already known | `unseen` drops any Observation whose `(type, name)` a held `Document` already carries. **Never `at`** — refusing by filename silently duplicates, and a filename is exactly what would let a hand-edit get overwritten on a second run |

It depends on `transcript` — for `TranscriptLine` and nothing else, it never
reads one — and on `knowledge`, for `Observation` and `Document`. It does not
depend on `home`: it never builds a path and never touches disk.

```
cli.observe:  transcript.readTranscript(place)  →  observe.from(lines)  →  observe.unseen(found, held)  →  base.write(schema, fresh)
```

## Invariants

1. **Both functions are pure.** A list in, a list out — no I/O, no clock, no
   model. Naming a person, merging two labels, or resolving a relative date is
   a reasoning pass's job and none of it happens here.
2. **`from` only reads Archive lines.** A Live line's `who` carries an `id`
   and an optional `pushName`, never a `label` — and every line a real home
   holds today is `from: "archive"` regardless.
3. **`from` writes only what a script cannot be wrong about.** `aliases` and
   `numbers` are `Person`'s other required fields; both are empty lists,
   because an Archive line has nothing to put in either. `status:
   "unreviewed"` and `source: "history"` are the two facts this pass is sure
   of and nothing more.
4. **Identity is `(type, name)`, never a path.** `unseen`'s whole job is this
   one comparison — a failing assertion in the step-3 spike found that
   refusing by filename silently duplicates.
5. **There is no `observe.run`.** `cli.observe` owns the order of the three
   calls above; see [`types.ts`](./types.ts) for why a wrapper here would be
   a second place that order could drift from the one that actually runs it.

## How to test it

```
vp test src/modules/observe
```

[`observe.test.ts`](./observe.test.ts) drives `from` and `unseen` directly —
a list in, a value out, no fixtures and no temp directory, because both
functions are pure. Gate rows 12-15 of
[`docs/planning/knowledge/spec.md`](../../../docs/planning/knowledge/spec.md)
are about the whole pass landing on disk, so they live in
[`../cli/observe.test.ts`](../cli/observe.test.ts), which drives
`ambient observe --from <slug>` through `run()` against a real temp home.

## Inside

| File | What it knows |
|---|---|
| `types.ts` | the interface: `From`, `Unseen`, and why there is no third symbol |
| `service.ts` | binds `from` to `internal/person.ts`, and `unseen` to the identity comparison |
| `internal/person.ts` | a `who.label` to a `Person` Observation, and the distinct-label walk |
