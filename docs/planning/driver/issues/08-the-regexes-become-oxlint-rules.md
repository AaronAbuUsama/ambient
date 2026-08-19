# 08 — the four regexes become oxlint rules

**Status:** ready-for-agent · **Blocks:** 09 · **Blocked by:** nothing

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
