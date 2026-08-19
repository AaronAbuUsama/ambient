# 01 — the skills resolve inside this repository

**Status:** done · **Blocks:** 02 · **Blocked by:** nothing

## Why this is first

The driver dispatches by repository path. If those paths do not resolve, everything after
this ticket dispatches into the dark.

*Measured 2026-08-19:* `~/.claude/skills/` holds 124 entries and **44 of them dangle**,
including all seven vendored upstream skills — they point into `~/.agents/skills/<name>`,
which was pruned when the `mattpocock-skills` plugin was installed. `.claude/skills/vendor`
is a directory of directories with no `SKILL.md`, so it registers nothing. `/code-review`
resolves to a harness built-in with the same name and a different job.
*Instrument: `test -e` over every symlink in that directory.*

The guarantee this breaks is stated in
[`vendor/README.md`](../../../../.agents/skills/vendor/README.md): *"a rule must not depend
on words that can change without a diff here."* It is not currently held for seven of nine.

## Done when

- Each of the seven vendored skills has its own symlink at `.claude/skills/<name>` →
  `../../.agents/skills/vendor/<name>`, so the project copy wins precedence.
- The three bare-name invocations in
  [`walkthroughs/slice.md`](../../../walkthroughs/slice.md) lines 91, 92 and 135, and the
  prose naming in [`slices.md`](../../../rules/slices.md):126, reference the skill **by
  repository path**, as `map-slice` already does.
- Spec gate rows **12** and **13** pass.

## Governed by

- [issues.md](../../../rules/issues.md) — this file is the ticket; there is no remote.
- Never edit anything under `.agents/skills/vendor/`. Symlinking to it is not editing.
- The principal's rule, this slice: **never symlink to `~/.claude`.** `.agents/` is the
  source of truth and `.claude/` symlinks into it, locally, so one update propagates.
