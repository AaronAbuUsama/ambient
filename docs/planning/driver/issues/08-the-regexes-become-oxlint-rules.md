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
