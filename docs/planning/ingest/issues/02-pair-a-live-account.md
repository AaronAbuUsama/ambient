# 02 — `ambient pair <source>`

**Status:** ready-for-agent · **Blocks:** 03 · **Blocked by:** 00

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
