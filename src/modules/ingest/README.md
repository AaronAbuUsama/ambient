# `ingest`

The Continuous Ingestion operation: a Live account's mirror becomes Blobs and
Transcript lines, in that order.

Read [`types.ts`](./types.ts).

## What it owns that nothing else can

**The order of the writes, and what a crash between them leaves.**

```
channel.read(peer)          values. no writes.
  ↓
blobs.put            ×N     content-addressed, idempotent by hash
  ↓
transcript.write            ONE call, idempotent by message id
```

Blobs first. A Blob written with no line referencing it is unreferenced bytes,
which the store already tolerates — the same hash next run finds them present and
stores nothing. A line written before its bytes would name a Blob that is not
there, and nothing later would go back for it.

There is **no Cursor**. The mirror is current state, so re-running reads whatever
is there now and the Transcript's own dedup makes the second pass free. A position
to remember would be a durable write with a crash story, bought for nothing.

## One call, not one per line

`writeTranscript` is called once with every line: 372,721 lines/s batched against
10 one at a time, measured. At account scale that is one array of ~43,000 values in
memory — fine at this size, and named here so nobody discovers it later.

## The two refusals happen before any I/O

A Chat with no `peer`, and a Peer absent from its Source's `allow` list. Both are
opt-in failures rather than errors, and reading a conversation nobody opted into is
the one mistake this module must never make.
