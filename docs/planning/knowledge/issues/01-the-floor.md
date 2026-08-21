# 01 — the floor: two Places, three schema fields

**Status:** done · **Blocks:** 02, 03, 04 · **Blocked by:** 00

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

## Comments

**2026-08-21 — built. Gate rows 2-7 pass, and `home/types.ts` earned a length exception.**

`home` grows three fields and nothing else. `knowledge` and `index` are plain `readonly
Place` properties beside `blobs` — not `Grant`s, because the root has no name to be wrong
(ADR 001 amendment 4). `internal/disk.ts` already computed the knowledge path for
scaffolding, so `Layout` was exposed rather than re-derived; `index` is one new row beside
it. `Source` gains `self_label?: string`, decoded by `Schema.optionalKey(Schema.String)` on
`SourceEntry` in [`internal/config.ts`](../../../../src/modules/home/internal/config.ts) —
ADR 006, not a hand-parse.

**Three judgement calls a reviewer should look at.**

1. **The index is `<home>/index.json`.** `design.md` § B2 settles that it lives outside the
   base and `spec.md` row 7 that `.gitignore` excludes it, but neither names the file. It is
   a root file beside `state.db`, so it is also a row in `ROOT_ENTRIES` — a `Index.JSON`
   beside it is now a near-miss `doctor` reports, which is what that list is for. Nothing
   converges it: the index is disposable and `knowledge` writes it, so `plan()` has no item
   for it and `doctor` stays silent when it is absent.
2. **`self_label` keeps its YAML spelling on the domain type.** `ModelProfile.baseUrl` is
   already the field named exactly as the key it decodes from, and the alternative was a
   rename map for one field with no reader yet. Its production caller arrives with ticket 04.
3. **`src/modules/home/types.ts` is now a declared exception in
   [`scripts/lint/legibility.ts`](../../../../scripts/lint/legibility.ts).** It sat at
   *exactly* 250 lines, so three new fields cross the cap — 253 even with no comments at all.
   The only split available is a seventh file at a module root, which is not one of the six
   slots, and half of THE interface in a file nobody knows to open is the failure
   [legibility.md](../../../rules/legibility.md)'s exception list exists to avoid. Reverse it
   by trimming prose in that file if you disagree; the row carries its reason either way.

**`~/.ambient` was not touched.** Every assertion runs against `fs.mkdtemp`, and the
end-to-end rows spawn `main.ts` with `AMBIENT_HOME` pointed at a temp root. `converge` never
overwrites authored content, so the real home keeps its current `schema.yaml`, `config.yaml`
and `.gitignore` until the principal edits them — the three template changes reach an
existing home only by hand.

**Where each row is asserted.** Rows 2, 5, 6 and 7 are four `it`s at the foot of
[`home.test.ts`](../../../../src/modules/home/home.test.ts), all `toStrictEqual`. Rows 3 and
4 are the tracer bullet and run through the real process in
[`cli.test.ts`](../../../../src/modules/cli/cli.test.ts) — `ambient init` on an empty root,
`knowledge/` read back as exactly `[.ok, .okignore]`, `doctor` at `0`, then `schema.yaml`
deleted and `doctor` at `1` printing `schema.yaml: missing`. That file is now 244 lines, so
the next thing added to it needs the same conversation `types.ts` just had.
