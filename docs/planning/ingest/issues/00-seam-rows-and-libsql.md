# 00 — the seam rows, and the one new dependency

**Status:** done · **Blocks:** 02, 03, 04 · **Blocked by:** nothing

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

## Comments

**2026-08-18 — done.** Both rows are in [`seams.md`](../../../design/seams.md); the graph now
reads `ingest ─> channel, blobs, transcript, home (a Place)`, `channel ─> home (a Place),
transcript (types only)`, and `cli ─> home, import, channel, ingest`. `archive` loses the
shared bracket it used to sit in with `channel`, and the rule underneath it becomes *"both
Readers produce Message values; the operation writes"* — [`design.md`](../design.md)'s own
sentence, because the old one said the composition root did the feeding and `import` has
owned that since it shipped.

**`whatsappd` came from the registry, pinned.** `0.4.0-alpha.3` — the `alpha` dist-tag, and
the same version the working tree at `~/projects/whatsappd` holds. A `link:` to that path was
not taken: it would make `pnpm install` here depend on a directory outside this repository.
`@libsql/client` is `^0.15.15`, the version `whatsappd` itself develops against, inside its
`^0.15.0` peer range.

**Two build scripts had to be answered, and they were not in the ticket.** `pnpm` refuses to
install while `baileys@7.0.0-rc14` and `protobufjs@7.6.5` sit unanswered, so `vp check` failed
on `ERR_PNPM_IGNORED_BUILDS` before it reached a single file. Both are `false` in
`pnpm-workspace.yaml`, which is what `whatsappd`'s own workspace sets. Checked rather than
copied: `baileys` only declares `prepare` — a from-source build that never runs for a
published tarball — and `protobufjs`'s `postinstall` reads its own `versionScheme` field and
prints a warning, nothing else. `pnpm add` also wrote `minimumReleaseAgeExclude:
whatsappd@0.4.0-alpha.3`, which is the age gate, not a build script.

**Verified.** All five symbols [`design.md`](../design.md) names resolve at runtime —
`createSession`, `qrAuth`, `createWhatsAppRuntime`, `libsqlBackend`, `fileMediaStore` — plus
`whatsappd/testing`'s `createTestWhatsAppSession`, which is the test seam every `channel` row
of the conformance table hangs off, and `@libsql/client`'s `createClient`.

```
vp check       pass · pass      55 formatted, 47 files, no warnings
vp run shape   clean            44 source files, 6 modules
vp test        53 passed        7 files
git status -- src/              (empty)
```
