# 04 — `ambient ingest --into <slug>`

**Status:** done · **Blocks:** nothing · **Blocked by:** 01, 03

**The point of the Slice.** `main.ts → cli → home → ingest.runIngest → channel.messagesFor →
blobs.put → transcript.writeTranscript`. It is what finally originates a `from: "live"` line and
closes the one empty row in [IMPORT's conformance table](../../import/design.md).

## What to do

- `channel.messagesFor(mirror, peer)` pages that Peer to exhaustion and yields `MessageRecord`
  values; `channel.bytesOf(mirror, ref)` streams media out of `whatsappd`'s store.
- `ingest.runIngest(req)` owns **the order of the writes** — Blobs, then the Transcript — and
  what a crash between them leaves. It calls the Write path **once** per Chat: `S1` measured
  372,721 lines/s batched against 10 one at a time.
- Two refusals **before any I/O**: an empty `peer`, and a Peer absent from the Source's `allow`.
- `ingest.summarise` builds the outcome string. `cli` does not.

## Decide, and record it in the ADR amendment

Reactions arrive as an array **on the message record**, so no reaction line is ever written.
**`LiveReaction` therefore has no producer.** Either delete it or give it one — a public type
with no production call site is the exact defect this Slice exists to close, and shipping
another one would be the same mistake twice.

## Gate rows this carries

Spec rows **4, 5, 6, 7, 8, 9, 10, 14** — and **16**, the repository checks.

## Done when

- Every row above passes, including against the real `capxul-devs` Chat, which already holds
  **13,134 Archive lines** that must come through byte-identical.
- `design.md`'s call graph matches the code — definition-of-done row 10, read not run.

## Governed by

[`modules.md`](../../../rules/modules.md) · [`errors.md`](../../../rules/errors.md) ·
[`decisions.md`](../../../rules/decisions.md) — the `LiveReaction` decision is an amendment to
[ADR 004](../../../adr/004-transcript-line-is-a-union-on-provenance.md), never a rewrite ·
`new-module` · `tdd` · `code-review`

## Comments

**2026-08-18 — done.** `ingest.runIngest` owns the order: read the mirror, store every Blob,
then **one** `writeTranscript` call with every line. `internal/media.ts` holds what a line
says once its bytes are dealt with, which is where the interesting case lives — the Source
recorded a capture and the file is gone, so the line gets `NoHandle` rather than losing its
media or claiming a Blob that is not there.

**The `LiveReaction` decision: it got a producer, as state on its message.** Reactions arrive
as an array on the record, and the mirror is current state — a removal is filtered out, a
changed emoji replaces in place. So there is no event to write and no trail to append.
`TranscriptLine` is now `ArchiveLine | LiveMessage`, and `LiveReaction` is the shape of an
entry in `LiveMessage.reactions`. Recorded as
[ADR 004 amendment 1](../../../adr/004-transcript-line-is-a-union-on-provenance.md#amendments),
which is the amendment that ADR's own falsifier 3 predicted.

**Still unproduced, and named rather than quietly shipped:** `LiveMedia`'s `Expired` arm.
Nothing yet distinguishes an expiry from a failure.

**Against the real data.** A copy of the real 11 MB store and the real `capxul-devs`
Transcript, into a scratch home — the live `~/.ambient` was never written to:

```
peer 208345256456219@lid        911 messages
ingested                        911 lines of 911 read, at revision 40, in 1.7s
media                           71 attachments → 67 Blobs; 43 the Source no longer holds
transcript                      14,045 lines = 13,134 archive + 911 live
row 14  archive prefix          2,900,784 bytes, byte-for-byte IDENTICAL
row 11  second ingest           0 written, byte-identical, inode unchanged
msgKinds                        text 787 · image 93 · document 15 · unsupported 9 · video 6 · contacts 1
media states                    Stored 71 · Failed 43 — never absent
one Stored line                 51,098 bytes on disk, sha256 matches the line's hash
doctor                          exit 0, with a Source directory present
```

**The seventh slot.** `channel/testing.ts` exists because four test files needed one seeded
mirror and the alternatives were an illegal reach into another module's `internal/` — which
`vp run shape` caught — and the same forty lines written four times, which `fallow dupes`
would have. It is the slot `whatsappd/testing` occupies one layer down. `shape.ts` and
`home.test.ts`'s no-throw scan both count it as test code, in the same commit.

Rows 4, 5, 6, 7, 8, 9, 10, 14 and 16 pass.
