# 03 — `ambient peers <source>`

**Status:** ready-for-agent · **Blocks:** 04 · **Blocked by:** 02

The read path, end to end, and the verb that makes the Slice usable: the account holds **1,506
chats** (measured 2026-08-17) and a Peer id cannot be pasted into a config that nobody can find.

**Positional, not `--source`.** A **Peer** is the Source's own identifier for one conversation
([CONTEXT.md](../../../../CONTEXT.md)); `chat` is Ambient's own noun and `ambient chat add`
already uses it. One word, one meaning.

## What to do

- `channel.openMirror(req)` → a handle over `backend.data.read(accountId, …)`. **No socket, no
  lease, no runtime** — measured: the full mirror in 88 ms from a second process while a writer
  held the lease, and the reader could not steal it (`scope.md` Decided 45–46).
- `channel.peersOf(mirror)` → one value per conversation: Peer id, subject, message count,
  newest Instant. Values only; `channel` writes nothing.
- `cli` renders the table.

## Gate rows this carries

Spec rows **2**, **3**, and **15** — the read succeeds with nothing paired and no runtime.

## Done when

- Rows 2, 3, 15 pass against a seeded temp database **and** against the real one.
- Running it twice leaves every file's mtime unchanged.

## Governed by

[`modules.md`](../../../rules/modules.md) · [`errors.md`](../../../rules/errors.md) ·
[`language.md`](../../../rules/language.md) — the verb is `peers` because the noun is Peer ·
`tdd`
