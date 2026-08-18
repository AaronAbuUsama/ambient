# `channel`

A Live account Reader, and the only module that knows `whatsappd` exists.

Read [`types.ts`](./types.ts). This file says why the shape is what it is.

## It reads. It writes no Ambient state.

No Blob, no Transcript line, no Cursor. `channel` produces values and
[`ingest`](../ingest/README.md) owns the order of the writes — the same split as
`archive` and `import`, and for the same reason: collapsing them makes the Reader
the composition owner, which is the 176-line defect this repository has already
paid for once.

## Two surfaces, and the caller killed one

`whatsappd` offers a raw session and a durable runtime. Writing from the session's
own handler was rejected in [ADR 005](../../../docs/adr/005-channel-binds-to-the-durable-runtime.md):
a handler's only channel for failure is a throw, a rejected handler is routed to
`failTerminal`, and the full-sync request rides the pairing registration node — so
**one refused Blob out of ~43,000 messages destroys the remainder of a sync that
can never be requested again.**

Binding to the runtime instead puts our mapper, our Blob store and every bug in
them *behind* a durable boundary, where a crash costs a re-read.

## The mirror, not the log

The mirror is current state. A `MessageRecord` already carries its reactions, its
receipts, its edit and its revoked arm, so there is no position to remember and no
backfill-versus-live distinction to model. `internal/mirror.ts` states the three
rules that makes it safe, each measured.

## The one-shot

`pair` is the only verb that opens a socket, and the window it opens cannot be
re-entered. Ambient writes nothing inside it. When the run ends without the
protocol flagging its last chunk, the report says so rather than implying it
finished — re-running is free and always continues from what is on disk.
