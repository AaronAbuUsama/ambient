# Walkthrough — `ambient import`

`ambient import <archive> --into <slug> [--zone <IANA>]`, from keypress to exit, through
every file it touches. The sibling of [walkthrough-doctor.md](walkthrough-doctor.md).

**Written after the fact, which is the wrong order** — [slices.md](rules/slices.md) now
requires the call graph before the code, and this is the artefact IMPORT never had. Drawing
it late is what exposed a 176-line handler; drawing it early is what
[definition-of-done.md](design/definition-of-done.md) row 10 exists to enforce.

---

## The call graph

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

**Ownership**, which is the half a diagram usually omits:

| Step | Owner | Why not somewhere else |
|---|---|---|
| argv → args | `cli` | the only module that has seen a command line |
| the outcome string | `import.summarise` | `cli`'s README forbids it building strings; the destination arrives as a label so `import` need not know what a slug is |
| the **order** of the writes | `import` | `archive` reads, `transcript` appends, `blobs` stores — none knows the others exist |
| every path | `home` | ADR 001's escrow rule; nothing else may join one |

## The order of the writes, and what a crash between them leaves

This is the part that has no home unless a module owns it.

| # | Write | A crash immediately after leaves | The next run |
|---|---|---|---|
| 1 | Blobs | orphan Blobs, content-addressed, harmless | re-hashes to the same names |
| 2 | Transcript | lines with no Receipt | skips them — the key is the Wall clock |
| 3 | `_chat.txt` | a primary source with no Receipt | `wx` refuses; it is byte-identical anyway |
| 4 | `receipt.json` | — | appends to `reruns` |

**The Receipt is last on purpose.** Its presence is the claim that everything above happened.
Written first, it would claim an import that never finished.

## What it produces

```
~/.ambient/
  blobs/<sha256>                       global, deduplicated, shared by every Chat
  chats/<slug>/
    transcript.jsonl                   one line per Message or Event
    imports/<sha256-of-archive>/
      _chat.txt                        the primary source, verbatim
      receipt.json                     provenance: what was read, what could not be
```

## Proven on the real Archive

```
$ ambient import .spike-private/exports/capxul-devs-with-media.zip \
    --into capxul-devs --zone Africa/Accra

Imported 13083 Messages and 51 Events (13134 Transcript lines) into capxul-devs
using Zone Africa/Accra; 1139 Markers resolved to 980 Blobs
```

306 MB in **5.6 s**. Run again:

```
Re-imported: 13134 lines already present, 0 written into capxul-devs …
```

and the Receipt still reads `linesWritten: 13134`, with `reruns: [{ written: 0, skipped:
13134 }]`. **That is the fix to a real defect:** the Receipt used to be rewritten by every
run, so a second identical import left `linesWritten: 0` beside a full Transcript — a
provenance record implying the lines came from somewhere else.

## The divergence this document was written to close

`cli/internal/commands/import.ts` was **176 lines** against 8, 8, 12 and 14 for its
siblings. It opened the Archive, stored the Blobs, wrote the Transcript, persisted the
Receipt and built the outcome string — so `cli` was the composition owner its own
[README](../src/modules/cli/README.md) says it is not, and `seams.md`'s *"only the
composition root wires"* was false.

It is now **73 lines**: parse, resolve two Places, one call, render. The operation lives in
[`import`](../src/modules/import/README.md), which owns the one thing no other module can —
the order above.

The earlier reasoning failed because the deletion test was run against a **guess** (four
lines of wiring) rather than against code. That is the argument for drawing the call graph
before writing it, not after.
