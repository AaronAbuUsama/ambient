# `transcript`

The one Write path from every Reader to one ordered Transcript per Chat. Read
[`types.ts`](./types.ts) first; it is the whole interface.

## What it owns

Transcript line shapes, the NUL-separated dedup key, append/re-Zone behavior,
and reading through a torn trailing line. Blob bytes remain global in `blobs`.

## Invariants

1. Archive and Live account facts are distinct variants; unknowable fields do
   not exist on the Archive variant.
2. The Archive key is `(wall, sender, text)`, NUL-separated. Equal-key
   multiplicity is preserved on first import and matched on later imports.
3. A repeated Archive under a new Zone updates `at` and `zone` without adding a
   line. A repeated identical Archive does not touch the file.
4. A hard kill may leave one torn trailing line; reads ignore it and the next
   write replaces it.
5. Events are their own line kind. Archive media is either `Stored` or a
   reasoned `NoHandle`; it is never an untyped gap.
6. Every failure is a value from `types.ts`; nothing throws.

## How to test it

`vp test src/modules/transcript` uses a real temporary directory and a Place
granted by `home`.

## Inside

| File | What it knows |
|---|---|
| `types.ts` | line variants, entry signatures, failure vocabulary |
| `service.ts` | append/read assembly and problem rendering |
| `internal/key.ts` | the source-specific dedup keys |
| `internal/store.ts` | JSONL decoding and filesystem behavior |
| `transcript.test.ts` | the interface gate against a real filesystem |
