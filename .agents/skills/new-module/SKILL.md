---
name: new-module
description: Scaffold a new module in the ambient repo with all six slots — README.md, types.ts, service.ts, internal/, <name>.test.ts. Use when adding a module under src/modules/, or when the user says "new module", "start the channel module", or names a module from docs/design/seams.md that does not exist yet.
---

# New module

The six slots are a rule ([`docs/rules/modules.md`](../../../docs/rules/modules.md))
checked by `vp run shape`. Scaffold them together so the module is never briefly wrong.

**Before scaffolding:** the module must already own something in
[`docs/design/seams.md`](../../../docs/design/seams.md) — one row, what it owns, which
way its dependencies flow. A module with no row is not a module yet. And do not scaffold
ahead of behaviour: create it when the first real work lands in it, not to reserve the
name.

## The five files

Replace `<name>` throughout. Nothing else is created — no `index.ts`, no barrel, no
empty subdirectories under `internal/`.

```
src/modules/<name>/
  README.md
  types.ts
  service.ts
  internal/<first-real-file>.ts
  <name>.test.ts
```

**`types.ts`** — THE interface, and the file a reader opens first. A file-level comment
saying what the module owns in one sentence, the domain types, the entry signature, and
every way it can fail as a tagged union ([`errors.md`](../../../docs/rules/errors.md)).
No Drizzle, Pi, `whatsappd` or provider types. If it cannot be understood alone, the
module is the wrong shape.

**`service.ts`** — the entry point's implementation, and assembly only. Every check,
read, template and write lives in `internal/`.

**`internal/`** — must contain a real file. An empty directory passes the shape check
and means nothing; if there is nothing to hide yet, the module is premature.

**`README.md`** — one page: what it owns, its invariants numbered, how to test it,
and a table of what each file inside knows. Follow
[`src/modules/home/README.md`](../../../src/modules/home/README.md).

**`<name>.test.ts`** — through the interface only. Import from `./service.ts` and
`./types.ts`, never from `./internal/`.

## Wiring

Cross-module imports use `~/modules/<name>/…`
([`imports.md`](../../../docs/rules/imports.md)). Only `src/main.ts` wires the module to
anything else.

## Finish

`vp run shape` — it names any missing slot by path. Then `vp check` and `vp test`.
