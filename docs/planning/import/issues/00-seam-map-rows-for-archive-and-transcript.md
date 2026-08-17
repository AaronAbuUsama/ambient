# 00 — Seam-map rows for `archive` and `transcript`

**What to build:** the two new modules IMPORT needs must exist in the seam map before any
code is written. Today [`seams.md`](../../../design/seams.md) has rows for eleven modules and
neither `archive` nor `transcript` is among them — and the
[`new-module`](../../../../.claude/skills/new-module/SKILL.md) skill refuses to scaffold a
module that does not own a row: *"A module with no row is not a module yet."* So this ticket
unblocks every other one, and it writes no code.

It also corrects `channel`'s row, which currently claims the history job that
[ADR 003](../../../adr/003-history-import-is-an-archive.md) moved to an archive.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

## What changes

- **`seams.md` modules table** gains two rows, each stating what the module owns, what its
  interface is about, and whether Effect lands there (it does not, for either):
  - `archive` — a file → messages. Knows nothing of WhatsApp, the network, or the home.
  - `transcript` — the one write path. Line format, dedup key, append, read.
- **`channel`'s row** loses history import and keeps the live account and `send`.
- **The dependency-direction graph** gains `archive`, `transcript` and the fact that both
  Readers write through `transcript`, and that `transcript` depends on `blobs`.
- **The "Provisional / uncertain" section** is revisited: the note that `blobs` *"may collapse
  into `channel`"* is now wrong in that form, because `transcript` is the caller and there are
  two Readers. Say so there rather than leaving it.
- **[`CONTEXT.md`](../../../../CONTEXT.md)** — check every noun this area introduces is
  already defined. It should be: *Archive, Reader, Write path, Transcript, Marker,
  Placeholder, Wall clock, Instant, Zone, Provenance, Blob* are all present. Add any that a
  ticket later invents, in the same change that invents it
  ([`language.md`](../../../rules/language.md)).

## Acceptance criteria

- [ ] `seams.md` has one row each for `archive` and `transcript`, in the same shape as the
      existing eleven.
- [ ] `channel`'s row no longer claims history import.
- [ ] The dependency graph shows both Readers writing through `transcript`, and `transcript`
      depending on `blobs`.
- [ ] The stale `blobs`-may-collapse note is corrected rather than left standing.
- [ ] No file under `src/` changes.
- [ ] `vp run shape` clean — every cross-link in the edited documents still resolves.

## Governed by

- [`seams.md`](../../../design/seams.md) — one line per interface; this is a seam map, not an
  interface design. Do not design the interfaces here; ticket 01 does that in `types.ts`.
- [`modules.md`](../../../rules/modules.md) — the deletion test and *"one adapter is a
  hypothetical seam; two adapters is a real one"* are the justification each row must carry.
- [`language.md`](../../../rules/language.md) — use the lexicon's nouns exactly.
