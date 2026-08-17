# Vendored skills

**Upstream, unchanged. Do not edit anything in this directory.**

| | |
|---|---|
| Source | `mattpocock-skills` |
| Version | `1.2.3` |
| Vendored | 2026-08-17 |
| Contents | 35 skills, copied whole — `SKILL.md` plus every supporting file |

## Why they are here rather than resolved at runtime

**A skill our rules cite by name must not be able to change under us.**
[`modules.md`](../../../docs/rules/modules.md) requires the `codebase-design` vocabulary
*"exactly — module, interface, implementation, depth, seam, adapter, leverage, locality"*.
If that skill is resolved from a global cache, the words a rule depends on can change
without a diff in this repository.

The second reason is reproducibility: global `.claude/skills` links are per-machine and
several were found missing or broken. A session that cannot resolve `new-module` scaffolds
a module the wrong way and nothing notices.

## The rule

- **Never edit a file here.** A change we want is a change upstream, or a repo-owned skill
  in the parent directory that wraps this one.
- **Bump by replacing the directory whole**, and update the version above in the same
  commit.
- Excluded from `fmt` and `lint` in `vite.config.ts` — we format and lint what we author.
  This is the same treatment `install-anti-slop` already has, and for the same reason.

## What dispatches to what

The four kinds in [`slices.md`](../../../docs/rules/slices.md) dispatch here:

| Kind | Vendored skill |
|---|---|
| `research` | `engineering/research` |
| `spike` | `engineering/prototype` — our word for it is **Spike**, see [`CONTEXT.md`](../../../CONTEXT.md) |
| `grilling` | `productivity/grilling` + `engineering/domain-modeling` |
| `task` | none — a human does a thing |

Repo-owned skills that build on these: `map-slice`, `plan-slice`, `new-module`,
`close-slice`.

**`wayfinder` is vendored but not used.** Its four ticket kinds and its fog test are adopted
in `slices.md`; its map-as-issue, child tickets and Decisions-so-far index are deliberately
not — that index is a second copy of every decision, which
[`decisions.md`](../../../docs/rules/decisions.md) forbids. It stays here so the borrowing is
checkable against the source.
