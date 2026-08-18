# 04 — `ambient ingest --into <slug>`

**Status:** ready-for-agent · **Blocks:** nothing · **Blocked by:** 01, 03

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
