# 08 — the four regexes become oxlint rules

**Status:** done · **Blocks:** 09 · **Blocked by:** nothing

The principal, this slice: *"that regex looks weird, I don't like that at all… we should be
using oxlint custom rules."*

`scripts/shape.ts` decides four things with a line-level regex. `/\bthrow\b/` matches the
word inside a comment or a string — it is the wrong instrument for a rule about statements.

## Done when

- Four checks move out of `shape.ts` and into custom oxlint rules beside the anti-slop
  plugin: no `throw` outside tests, no `../..` in an import path, no cross-module
  `internal/` import, and the 250-line limit with its declared exception list.
- `shape.ts` retains only what no linter can see — the six slots, which is a filesystem
  question, and cross-link resolution, which reads many documents at once. **No line-level
  regex over source remains in it.**
- `vp check` catches every case the regexes caught, and at least one they could not: the
  word `throw` inside a comment must not fail.
- Spec gate row **15** passes.

## Governed by

- [errors.md](../../../rules/errors.md), [imports.md](../../../rules/imports.md),
  [legibility.md](../../../rules/legibility.md) — each rule's *check* section is updated to
  name its new home. A rule that says it is checked by something that no longer checks it is
  the failure `types.md:36` is committing right now.

## Coordination

Another session has been working in `src/` and in the lint configuration. Check `git log`
before starting, and do not begin while `vp check` is red for reasons that are not yours.

## Comments

**2026-08-19 — deferred by the principal, and METHOD closed without it.**

Not started, and not because it was hard. Its own Coordination clause forbids beginning while
another session is in `src/` and the lint configuration and `vp check` is red for reasons that
are not ours. Both conditions held for the whole run: that session committed `8fd2c9d`,
`5ef71c8` — which moved the anti-slop plugin this ticket must sit beside — and `94e4389`,
and left `parse.ts` uncommitted with 139 insertions.

**The evidence for the ticket got stronger while it waited.** `vp run shape` currently fails
on `src/modules/transcript/internal/parse.ts:151` for the word `throw` **inside a comment** —
which is the exact false positive this ticket exists to remove, caught in the wild rather than
argued for.

Principal's call: the driver works and is worth dogfooding now; this is a check-quality
improvement, not a blocker. It stays `ready-for-agent` and keeps its measurements. Pick it up
once that session's Effect migration has landed and `vp check` is green.

**2026-08-19 — built. The rules are ours, so they live where `vp check` can see them.**

The ticket said *beside the anti-slop plugin*. Since it was written, `5ef71c8` flattened that
plugin to `tools/`, and `vite.config.ts` ignores `tools/**` for both `fmt` and `lint` —
because anti-slop is upstream source we never edit and linting it with itself is circular.
Neither reason is ours. The four rules are in
[`scripts/lint/`](../../../../scripts/lint/index.ts), loaded as a second `jsPlugins` entry
named `contract`, and are formatted, linted and type-checked like everything else we author.
`tsconfig.json` already includes `scripts`, so this cost nothing.

`LONGER` lives in the lint rule and `shape.ts` imports it. The rule is told about one file at
a time and can honour a row without noticing that the file it names is gone, so the stale-row
check stayed in the walk of the tree — one declaration, two readers.

*Measured, with probe files under `src/` deleted after the run:* the three statement rules
fire (`no-throw` on a `throw`, `no-relative-escape` on `../..`, `no-foreign-internal` on
`~/modules/transcript/internal/…`), `contract/file-length` fires at `:251` on a 251-line
file, and `shape.ts` names a `LONGER` row whose file does not exist. The carve-outs hold:
`src/modules/channel/testing.ts` keeps its four real throws, `home.test.ts` at 307 lines
keeps its exception, and `~/modules/home/internal/disk.ts` imported from inside `home` is
silent.

**The case the regex could not catch.** A probe holding the word `throw` in a comment, in a
string and in a template literal — the `parse.ts:151` false positive that fired for real
while this ticket waited — passes clean. `../..` in a doc-comment link and in
`${import.meta.dirname}/../..` are likewise silent, and `import("../../x")` in *type*
position now fires, which the old regex never reached.
