# 00 — the seam rows, and the one new dependency

**Status:** ready-for-agent · **Blocks:** 02, 03, 04 · **Blocked by:** nothing

**Writes no code.** `00` is reserved for exactly this: the ticket that unblocks the rest.
[`new-module`](../../../../.agents/skills/new-module/SKILL.md) **refuses a module with no
`seams.md` row**, and IMPORT needed a ticket 00 purely because no step owned that.

## What to do

1. Add two rows to [`seams.md`](../../../design/seams.md), copied from
   [`design.md`](../design.md) § Seam delta — `channel` **amended**, `ingest` **new** — and
   update the dependency-direction block in the same edit.
2. Add `@libsql/client` to `package.json` `dependencies`. It is an **optional** peer dependency
   of `whatsappd`, dynamically imported, so Ambient must depend on it directly — `scope.md`
   Decided 51. **It is the only new runtime dependency this Slice adds.**
3. Add `whatsappd` itself to `dependencies`. Today's `package.json` has `yaml` and `yauzl` and
   nothing else — measured 2026-08-18.

## Done when

- `seams.md` holds both rows and the graph shows `ingest → channel, blobs, transcript, home`.
- `pnpm install` resolves, and `vp check` is pass·pass.
- Nothing under `src/` changed.

## Governed by

[`modules.md`](../../../rules/modules.md) · [`imports.md`](../../../rules/imports.md) ·
[`issues.md`](../../../rules/issues.md) · `new-module`'s seam-row precondition
