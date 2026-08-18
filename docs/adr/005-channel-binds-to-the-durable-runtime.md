# ADR 005 — `channel` binds to `whatsappd`'s durable runtime, not to a raw session

**Status:** accepted, 2026-08-18 · **Slice:** INGEST · **Supersedes:** nothing

## Context

`whatsappd` offers two surfaces, and `channel` had to pick one. The choice is hard to
reverse — it puts a second durable store on disk and a peer dependency in
`package.json` — and it is written through by every later Live-account slice, so it
meets [seams.md](../design/seams.md)'s two-clause bar for designing twice.

The fact that decides it is not about elegance. **A full history sync is one-shot per
credential**: the request rides the pairing registration node, so a reconnect cannot
re-ask. One account's history is spendable exactly once, and it has already been spent
badly once — 43,334 messages, on 2026-08-17, by pairing through a store that persists
`wa_auth` and no messages.

Three measurements bound the problem, each in
[`docs/planning/ingest/findings/`](../planning/ingest/findings/):

- A handler rejection is **not** swallowed or logged. It is routed around the reconnect
  branch to `failTerminal`: the batch is dropped and the session dies (`findings/02`).
- The queue holding the un-accepted remainder is unbounded and in memory, and its depth
  is set by serial CDN round-trips (`findings/01`).
- The mirror can be read exhaustively from a second process with **no socket, no lease
  and no runtime** — 88 ms for a whole account, while a writer held the lease
  (`findings/07`).

## Decision

**`channel` binds to `createWhatsAppRuntime` over `libsqlBackend`.** `whatsappd` owns
durability; Ambient reads the mirror it writes.

**Ambient writes nothing of its own inside the sync window.** No Blob, no Transcript
line, no receipt. `pair` starts the runtime, watches, and stops.

Reading is `backend.data.read(accountId, fn)`, one transaction per answer, using only the
`view` handed to the callback. `@libsql/client` is a direct dependency of Ambient because
it is an *optional* peer of `whatsappd`, dynamically imported.

## The alternatives, and why they lost

Three shapes were written as callers before any was chosen. Only the caller
distinguishes them, which is why the design step writes it first.

| Axis | A · write from the handler | **B · the durable runtime** | C · our own backend |
|---|---|---|---|
| Floor-first | ❌ ships a loss | ✅ ships it | ⚠️ ships it plus three reimplementations |
| Reversibility | ❌ a lost sync is not reversible | ✅ delete a file, re-run | ⚠️ our store's format becomes load-bearing |
| Blast radius | one module, catastrophic failure | one module + a peer dep | `channel` **and** a store we now own |
| Correctness | ❌ needs `throw` for control flow | ✅ failures stay values | ⚠️ the media contract demands a `throw` |
| Fit | ✗ fights the library | ✅ the seam its author built for us | ✗ bypasses that seam and rebuilds behind it |
| Risk | — | the shipped, tested path | no third-party backend has ever been built |

**A — write from the `conversationSync` handler.** Fatal on two counts. A handler's only
channel for failure is a throw, which breaks [errors.md](../rules/errors.md) outright; and
because a rejection is terminal, **one refused Blob out of ~43,000 messages destroys the
remainder of a sync that can never be requested again.**

**C — supply our own `WhatsAppBackend`, so there is no second database.** The better
instinct, and it is only wrong because of a fact nobody had before `findings/07`: the
mirror is not overhead, it *is* the dedup, the out-of-order buffer and the paging anchor.
Deleting it means writing all three, plus a fencing/seq/revision triple. And `accept()` is
called by the runtime, so our mapper goes back inside the fragile window — which was A's
whole defect.

The deciding detail: `accepted(accountId, afterSeq)` has **zero production call sites** in
`whatsappd`, and its own ADR-0014 calls that method *"the Ambient Brain boundary"*. The
seam we were about to bypass was built for us.

## Consequences

- One libSQL file and one media tree per Source, under `~/.ambient/sources/<name>/`. It
  holds the credential, so it is inside the home and inside a backup.
- **The database file must be writable.** `PRAGMA journal_mode = WAL` runs before
  anything is read, so a read-only copy fails before the first `SELECT`.
- A bug in our mapper costs a re-read. That is the whole of what this buys, and it is the
  reason to pay a peer dependency for it.
- `channel` hides `whatsappd` entirely: nothing above it names `libsqlBackend`,
  `createWhatsAppRuntime` or a `MessageRecord`.

## Falsifiers

- **A sync that never goes quiet.** The run reports `SyncIncomplete` with its counts
  rather than a success. If real accounts routinely reach the deadline, the stopping rule
  is wrong, not the binding.
- **Scale.** Every read measurement was on a database of 11 messages. Holding one
  transaction open across a 100k-message dump is unmeasured; if the WAL grows unboundedly
  under a long reader, `read()` per Peer stops being the right granularity.
- **A published conformance suite.** If `whatsappd` ever ships one, C becomes testable and
  worth revisiting — but only if INGEST also turns out never to page back, which is what
  removes two of C's three costs.
