# 03 — `ambient peers <source>`

**Status:** done · **Blocks:** 04 · **Blocked by:** 02

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

## Comments

**2026-08-18 — done.** `channel.openMirror(account) → Mirror`, with `peers · read · bytes ·
close`. Each read is **one** `backend.data.read` transaction, so a page and the snapshot it
came from cannot disagree; `bytes` sits outside it, because media is files and a file read
cannot tear.

**A fifth failure was needed, and the design did not have it.** `libsqlBackend` *creates*
the file it is pointed at. Without a check, `ambient peers` against an unpaired Source
succeeds, reports zero conversations, and leaves an empty database behind that looks exactly
like a paired account with nothing in it. `Unpaired` is its own value because its remedy is
its own. **That is gate row 3**, and it would have passed vacuously otherwise.

**Against the real account** — `ambient peers ambient`, 2026-08-18:

```
85 conversations, newest first. Group subjects from the chat record, 1:1 names resolved
through contactAliases → contacts. Store mtime unchanged: no socket, no lease, no runtime.
```

Rows 2, 3 and 15 pass, on a seeded temp database and on the real one.
