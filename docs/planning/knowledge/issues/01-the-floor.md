# 01 — the floor: two Places, three schema fields

**Status:** todo · **Blocks:** 02, 03, 04 · **Blocked by:** 00

The tracer bullet is `ambient init` and `ambient doctor` on a home that has everything
KNOWLEDGE needs and no module yet. It cuts `cli → home → disk` end to end.

**All three schema changes carry a decision** and none is a preference —
[`spec.md`](../spec.md) § Implementation Decisions 7.

## What to do

1. **`home` grows two `Place` properties**, matching `blobs` exactly — a property, not a
   `Grant`, because the root has no name to be wrong:
   ```ts
   readonly knowledge: Place
   readonly index: Place
   ```
   `internal/disk.ts:51` already computes the knowledge path for scaffolding and merely does
   not export it. The index is **outside** the knowledge base — [`design.md`](../design.md)
   § Alternatives B2.
2. **The home's `.gitignore` gains the index.** It already excludes `blobs/` and `state.db`.
3. **`schema.yaml`'s template**: `Media.kind` gains a `sticker` arm, and
   `Commitment.source_message` becomes `source_window`.
4. **`config.yaml`'s Source gains `self_label`** — an optional string, decoded in
   `home/internal/config.ts` through its Effect `Schema`, per
   [ADR 006](../../../adr/006-schema-is-the-parse-boundary.md).
5. **Do not touch `~/.ambient`.** `converge` never overwrites authored content, so the real
   home keeps its current `schema.yaml` until the principal edits it. Say so in the ticket
   comment when closing.

## Done when

Gate rows **2, 3, 4, 5, 6, 7** of [`spec.md`](../spec.md) pass.

## Governed by

[`modules.md`](../../../rules/modules.md) · [`types.md`](../../../rules/types.md) ·
[ADR 001](../../../adr/001-home-interface.md) — the escrow rule, and why `home` takes no
ports · [ADR 006](../../../adr/006-schema-is-the-parse-boundary.md)
