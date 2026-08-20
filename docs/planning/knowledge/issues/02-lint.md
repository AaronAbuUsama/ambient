# 02 — `ambient ontology lint`

**Status:** todo · **Blocks:** 03, 04 · **Blocked by:** 00, 01

The first complete path: `cli → knowledge → disk → back`. It is the ticket that creates the
`knowledge` module, so it carries the read layer every later verb uses.

**Blocked by 01 for a symbol, not for narrative order:** `knowledge.open` takes
`home.knowledge`, which does not exist until 01.

## What to do

1. `new-module knowledge` — six slots. Its `seams.md` row exists, so it will be accepted.
2. `open(place) → Base`. Builds no path, reads nothing.
3. `base.all() → Document[] | Problems`. Decodes frontmatter through an Effect `Schema`
   ([ADR 006](../../../adr/006-schema-is-the-parse-boundary.md)) so nothing downstream sees
   `unknown`. Collects **every** problem in the base rather than stopping at the first —
   the same reason `home`'s config reader does.
4. `lint(schema, docs) → Violation[]`. **Pure.** Consumes the `Schema` value `home.read()`
   already returns; it does not re-parse `schema.yaml`.
5. `cli.ontology` wires and renders. **No logic** — `cli`'s README forbids it building
   strings, so rendering a `Violation` lives with `failure`.

## Done when

Gate rows **8, 9** of [`spec.md`](../spec.md) pass, plus **1**.

A violation names **the file, the key and the expected form**. `additionalProperties` not
naming the offending key is one of the four gaps measured in OpenKnowledge's own `lint`
([`findings/01`](../findings/01-ok-mcp-read-surface.md)); ours does not get to have it.

## Governed by

[`modules.md`](../../../rules/modules.md) · [`errors.md`](../../../rules/errors.md) — a
failure is a declared value, nothing throws · [`types.md`](../../../rules/types.md) —
external data is `unknown`, narrowed at the boundary · [`legibility.md`](../../../rules/legibility.md)
