# `import`

The History Import operation: an Archive becomes a Transcript, Blobs and a Receipt.

Read [`types.ts`](./types.ts) first. One entry point, one report, four ways to fail.

## What it owns

**The order of the writes, and what a crash between them leaves behind.** Nothing else can
own that: `archive` reads, `transcript` appends, `blobs` stores, and none of them knows the
other exists.

```
1  Blobs           content-addressed, so a crash here costs a re-hash and nothing else
2  Transcript      idempotent on the Wall clock key, so a crash here costs a re-append
3  primary source  _chat.txt, written once, `wx` so a second run cannot tear it
4  Receipt         last, because it is the claim that everything above happened
```

**The Receipt is written last on purpose.** A Receipt present means the import completed; a
Receipt absent after a crash means re-run it, and steps 1–3 will no-op. The reverse order
would let a Receipt claim an import that never finished.

## Invariants

1. **It never builds a path.** Every location arrives as a `Place` from `home`.
2. **Nothing throws.** Every failure is an `ImportProblem` in `types.ts`.
3. **Re-running is a no-op that reports itself** — `written: 0`, `rerun: true`.
4. **The Receipt describes the import, not the last run.** The run that wrote the lines keeps
   its numbers; later runs append to `reruns`. An earlier version rewrote it every time, so a
   second identical import left `linesWritten: 0` beside a 13,134-line Transcript.
5. **It stores only Markers the Transcript references.** An Archive may carry files no
   message names.
6. **It knows nothing about Chats or slugs.** `summarise` takes a destination label from the
   caller; naming things is `cli`'s job.

## Why it exists — a correction, recorded

This operation first lived in `cli`'s handler, which reached **176 lines against 8, 8, 12 and
14** for its siblings. That made `cli` the composition owner its own
[README](../cli/README.md) says it is not.

The deletion test had been run against a guess — four lines of wiring — rather than against
code that did not exist yet. Run against the code: deleting this module returns ~100 lines of
ordered, failure-prone writes to a module specified to hold none, and gives `cli` four new
dependencies. It earns its keep; the earlier reasoning did not.

Caught by [definition-of-done.md](../../../docs/design/definition-of-done.md) row 10, which
exists because every other row was green while this was true.

## What each file knows

| File | Knows |
|---|---|
| [`types.ts`](./types.ts) | the interface: one request, one report, four problems |
| [`service.ts`](./service.ts) | the order of the writes, and how to render a problem |
| [`internal/receipt.ts`](./internal/receipt.ts) | the Receipt's shape, atomic writes, and re-run merging |

## How to test it

Through `runImport` only, against a real temp directory — rename atomicity and `wx` refusal
are exactly what this module is for, and a memfs stand-in models both as fiction. The CLI
path is covered separately in [`cli/import.test.ts`](../cli/import.test.ts).
