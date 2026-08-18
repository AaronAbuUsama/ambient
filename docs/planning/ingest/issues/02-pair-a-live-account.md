# 02 — `ambient pair <source>`

**Status:** done · **Blocks:** 03 · **Blocked by:** 00

**The first tracer bullet.** `main.ts → cli → home.source().store()/.media() → channel.pair →
whatsappd`. It forces `home`'s Source unit and `channel`'s entry into existence, and it is
demoable in one command.

## What to do

- `home` gains `source(name) → SourceHandle` with `store: Grant` and `media: Grant`, converged
  and planned like any other unit. The credential lives **inside `~/.ambient`** — `scope.md`
  Decided 24.
- `channel.pair(req)` opens `libsqlBackend` on that Place with `fileMediaStore`, runs
  `createWhatsAppRuntime`, and renders progress through a value the caller formats.
  **`whatsappd`'s own `fileStore()` is usable unchanged** — Decided 29.
- `cli` renders. It never learns what a batch is.

## What it must not do

- **Ambient writes nothing of its own inside the sync window.** That is the whole reason the
  runtime owns durability — `design.md` § Alternatives.
- Never exit on a guess. Stop on the protocol's own completion; if that never arrives, hold and
  print where it got to. An early exit is unrecoverable.

## Gate rows this carries

Spec row **1**.

## Done when

- Row 1 passes against a real pairing, and the database and credential are under the granted
  Place and nowhere else.
- `ambient doctor` reports on a Source directory like any other unit.

## Governed by

[`modules.md`](../../../rules/modules.md) · [`errors.md`](../../../rules/errors.md) ·
ADR 001's escrow rule — `channel` never builds a path · `new-module` · `tdd`

## Comments

**2026-08-18 — done.** `home` gained the Source unit — `source(name) → SourceHandle` with
`store` and `media` Grants, `plan` and `converge` — so `ambient doctor` reports on a Source
directory like any other unit, and `sources` joined `ROOT_ENTRIES`. Two sidecars are
declared beside the database (`whatsapp.db-wal`, `-shm`), because SQLite creates them the
moment WAL is entered and a healthy account would otherwise read as a mess.

`channel.pair` opens `libsqlBackend` + `fileMediaStore` on those Places and runs
`createWhatsAppRuntime`. **Ambient writes nothing inside the sync window** — the whole of
[ADR 005](../../../adr/005-channel-binds-to-the-durable-runtime.md), now written.

**The stopping rule, and it does not guess.** The run ends when the socket is up and no
batch has arrived for `quietMs` — generous by default, because a batch commits only after
every attachment in it is fetched one at a time, so `wa_messages` sits still while media
climbs. Whether the protocol flagged its last chunk is *reported*, never assumed:
`flagged: false` says so in the outcome and tells you re-running continues from what is
there. Reaching the deadline is **`SyncIncomplete` with its counts**, never a success.

**Tested with no credential.** `whatsappd/testing` drives a session that never opens a
socket; the runtime, the accept path, the projection and the libSQL file are all real. That
harness became [`channel/testing.ts`](../../../../src/modules/channel/testing.ts) once a
third test file needed it — see the ticket-04 note on the seventh slot.

Row 1 passes: everything written lands under the granted Source directory and nothing else
is created.
