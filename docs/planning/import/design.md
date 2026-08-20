# IMPORT — design

**Written after the fact.** [`slices.md`](../../rules/slices.md) now puts Design at step 2, before
the frontier is worked; IMPORT ran under the old five-step rule and designed its interface five
hours *after* the code. This file is what step 2 would have produced, reconstructed from the code
that exists — and it exists so `import.html` can be regenerated from markdown
rather than from one session's memory.

Its worked-example twin is [`walkthroughs/import.md`](../../walkthroughs/import.md), which traces
the same call graph for a reader who is new to the codebase. This file is the design; that one is
the tour.

## Production call sites

The caller, as it stands in `cli/internal/commands/import.ts`. Every interface below was read
back off it.

```ts
const chat = home.chats().find((found) => found.slug === args.slug);
if (chat === undefined) {
  return message(false, `Chat "${args.slug}" does not exist; run \`ambient chat add\` first`);
}

const transcript = chat.transcript();          // Place | HomeProblem
if ("problems" in transcript) return message(false, describe(transcript));
const imports = chat.imports();                // Place | HomeProblem
if ("problems" in imports) return message(false, describe(imports));

const report = await runImport({               // ImportReport | ImportFailure
  file: args.input, transcript, imports,
  blobs: home.blobs, zone: args.zone, zoneGiven: args.given,
});
return "problems" in report
  ? message(false, report.problems.map(describeImport).join("; "))
  : message(true, summarise(report, args.slug));
```

**73 lines: parse, resolve two Places, one call, render.** It reached 176 before `import` was
extracted, which had quietly made `cli` the composition owner its own README says it is not.

## Call graph

```
src/main.ts                          resolves $AMBIENT_HOME, prints, exits. The only file
  │                                  that reads the environment.
  └─ cli.run(argv, root, zone)
       └─ cli.importArchive          argv → args. Renders the outcome. NOTHING ELSE.
            ├─ home.chats()          find the Chat, or refuse and name `chat add`
            ├─ chat.transcript()     a Place. `cli` never builds a path.
            ├─ chat.imports()        a Place.
            └─ import.runImport      ← THE OPERATION. Owns the order of the writes.
                 ├─ archive.openArchive       the file → Messages + media entries
                 ├─ blobs.put              ×N  only Markers the Transcript references
                 ├─ archive.resolveMedia      Markers → Blob hashes
                 ├─ transcript.writeTranscript  the one Write path, idempotent
                 └─ internal/receipt.persist    _chat.txt, then receipt.json
```

| Step | Owner | Why not somewhere else |
|---|---|---|
| argv → args | `cli` | the only module that has ever seen a command line |
| every path | `home` | ADR 001's escrow rule. A `Place` is branded, so none can be fabricated |
| **the order of the writes** | `import` | `archive` reads, `transcript` appends, `blobs` stores — none knows the others exist |
| the outcome string | `import.summarise` | `cli`'s README forbids it building strings; the destination arrives as a label so `import` need not know what a slug is |

## Interfaces

Read back off the caller, never invented ahead of it.

| Module | Public interface |
|---|---|
| `cli` | `run(argv, root, zone) → Outcome` — `report` · `message` · `misuse` |
| `home` | `chat(slug).transcript() → Place` · `chat(slug).imports() → Place` · `blobs` · `describe(problem)`. Every failure is a `ProblemDetail`. |
| `import` | `runImport(req) → ImportReport \| ImportFailure` · `summarise(report, into) → string` · `describe(problem) → string` |
| `archive` | `openArchive(file, zone) → OpenedArchive \| ArchiveProblem` · `readArchive(text, zone)` · `resolveMedia(read, hashes) → ArchiveRead` |
| `transcript` | `writeTranscript(Place, lines) → Write \| Problem` · `keyOf(line) → dedup key` |
| `blobs` | `openBlobs(root: Place) → Blobs` · `put(bytes)` · `get(hash)` · `exists(hash)` |

**`ImportProblem` has four arms**, each a distinct remedy so each is its own value:
`Unreadable` · `BlobRefused` · `TranscriptRefused` · `ReceiptUnwritable`.

## Seam delta

Four rows added to [`seams.md`](../../design/seams.md), before any module was scaffolded.

| Module | Owns | Depends on |
|---|---|---|
| `archive` | Archive text or ZIP → Transcript values. No home, no network. | `transcript` (types only) |
| `transcript` | the one Write path for both Readers | `home` |
| `blobs` | content-addressed bytes, stored once by SHA-256 | `home` |
| `import` | **the order of the writes**, and what a crash between them leaves | `archive`, `blobs`, `transcript` |

## Test seams and conformance

| Public symbol | Production caller | Test seam |
|---|---|---|
| `runImport` | `cli/…/commands/import.ts` | `import.test.ts` — a temp home, real files |
| `summarise` · `describe` | the same handler | `import.test.ts` — the rendered string |
| `openArchive` | `import/service.ts` | `archive.test.ts` — a string in, values out |
| `resolveMedia` | `import/service.ts` | `archive.test.ts` |
| `openBlobs` · `put` | `import/service.ts` | `blobs.test.ts` — bytes and hashes |
| `writeTranscript` | `import/service.ts` | `transcript.test.ts` — the file after the write |
| `chat.transcript()` · `chat.imports()` | the CLI handler | `home.test.ts` |
| **`transcript`'s `from: "live"` variants** | **none** | `transcript.test.ts` | 

**The last row is the one that failed.** Only `transcript`'s own deserialiser ever rebuilds a Live
line, because `channel` does not exist. Every test passed. Nothing in the pipeline reads this
column, which is why it is a table and not a check — and why it is named at the foot of
[`slices.md`](../../rules/slices.md) as the automation most worth having.

## State and failure sequence

Four durable writes, in this order.

| # | Write | A crash immediately after leaves | The next run |
|---|---|---|---|
| 1 | Blobs | orphan Blobs, content-addressed, harmless | re-hashes to the same names |
| 2 | Transcript | lines with no Receipt | skips them; the key is the Wall clock |
| 3 | `_chat.txt` | a primary source with no Receipt | `wx` refuses, and it is byte-identical anyway |
| 4 | `receipt.json` | nothing outstanding | appends to `reruns` |

**The Receipt is last on purpose.** Its presence is the claim that everything above happened;
written first, it would claim an import that never finished.

The defect this closed: the Receipt used to be rewritten by every run, so a second identical
import left `linesWritten: 0` beside a full Transcript — a provenance record implying the lines
came from somewhere else.

## Alternatives, and branch points

`import` itself was the alternative that won: the first call left the operation inside `cli`, and
ran the deletion test against a **guess** — four lines of wiring — rather than against code.
Against the code it is ~100 lines of ordered, failure-prone writes plus four dependencies, in a
module specified to hold none.

Branch points: **none open.** The slice is closed.

## The frontier this design would have gated

Six questions, all `Decided` before `spec.md` was written. Under the six-step rule the three
`grilling` ones would each have named a block of this file.

| id | kind | question | answer |
|---|---|---|---|
| G1 | `grilling` | Command, or configured Source? | a command with a Receipt |
| G2 | `grilling` | Which Zone, across 19 months? | Wall clock is the key; the Zone is recorded, not relied on |
| G3 | `grilling` | Dedup — merge, or cut? | a cut, never a merge |
| S1 | `spike` | Does the parser hold? | 0 unreadable of 19,577 |
| R1 | `research` | What does the ZIP actually hold? | 1,140 entries; 1,139 media, all Markers matching filenames exactly |
| G4 | `grilling` | Is a Chat folder an identity? | a label — renaming is `mv` |
