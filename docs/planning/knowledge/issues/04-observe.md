# 04 — `ambient observe --from <slug>`

**Status:** todo · **Blocks:** nothing · **Blocked by:** 00, 01, 02

**The tracer bullet that makes the knowledge base stop being empty.** It cuts
`cli → observe → transcript → knowledge → disk`, and it is demoable on 13,134 real lines.

**Blocked by 02 for a symbol:** `observe.unseen` compares against `base.all()`.

## What to do

1. `new-module observe` — its `seams.md` row exists.
2. `from(lines) → Observation[]`. **Pure. No model, no clock.** Writes only what a script
   cannot be wrong about. Two facts it *may* have, both established by measurement rather
   than assumed:
   - a sticker is identifiable by its header — 512×512 WebP, **207** of 980 blobs;
   - which label is the exporter is identifiable by `grep`, but that fact goes to
     `config.yaml`, **not** into a document — [`design.md`](../design.md) § Alternatives B3.
3. `unseen(found, held) → Observation[]`. **Pure.** Identity is `(type, name)`, **never a
   path** — refusing by filename silently duplicates.
4. `base.write(schema, observations) → WriteReport`. Validates and **refuses**; `Refusal` is
   a value, never a throw. Each accepted write lands as a single `rename`.
5. A type does not give you its folder — `Person` → `person/`. Declared, not derived.

## Done when

Gate rows **12, 13, 14, 15, 16, 17, 18** of [`spec.md`](../spec.md) pass.

Row 18 is ADR 007's falsifier 1 and is the only place in this repository where running `ok`
is legitimate — it is a **test** of the format trade, not the product using the tool.

Row 15 is the one that protects the principal's hand edits: correct a page by hand, re-run,
and the file must be byte-identical.

## Governed by

[`modules.md`](../../../rules/modules.md) · [`errors.md`](../../../rules/errors.md) ·
[`knowledge.md`](../../../rules/knowledge.md) — **as amended by**
[ADR 007](../../../adr/007-knowledge-is-files-not-a-client.md) · [`tdd`](../../../../.agents/skills/vendor/tdd/SKILL.md)
