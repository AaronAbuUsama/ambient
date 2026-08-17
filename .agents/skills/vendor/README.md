# Vendored skills

**Upstream, unchanged. Do not edit anything in this directory.**

Source: `mattpocock-skills` **1.2.3**, vendored 2026-08-17. **Seven skills**, chosen because
something here names them — not because they exist.

| Skill | Who needs it | Depends on |
|---|---|---|
| `codebase-design` | [`modules.md`](../../../docs/rules/modules.md) requires its vocabulary **exactly** — module, interface, implementation, depth, seam, adapter, leverage, locality | — |
| `domain-modeling` | the discipline behind [`CONTEXT.md`](../../../CONTEXT.md); its `CONTEXT-FORMAT.md` is the format we follow | — |
| `grilling` | the `grilling` kind in [`slices.md`](../../../docs/rules/slices.md) | — |
| `research` | the `research` kind; dispatched as a subagent by `map-slice` | — |
| `prototype` | the `spike` kind. **Our word is Spike** — see [`CONTEXT.md`](../../../CONTEXT.md) | — |
| `tdd` | step 4, build | `code-review`, `codebase-design` |
| `code-review` | step 4, closing a ticket | *`setup-matt-pocock-skills`, deliberately not vendored* |

The set is closed under its own dependencies. `tdd` names `code-review` and
`codebase-design`; both are here. `code-review` names `setup-matt-pocock-skills` to configure
an issue tracker — **we override that**: [`issues.md`](../../../docs/rules/issues.md) says
issues are files in this repo and there is no remote.

## What was deliberately dropped

Twenty-eight skills were vendored in a first pass and removed. The ones worth naming, so
nobody re-adds them by accident:

| Dropped | Why |
|---|---|
| `wayfinder` | its four kinds and fog test are **already adopted** into `slices.md`; its map-as-issue, child tickets and Decisions-so-far index are a second copy of every decision, which [`decisions.md`](../../../docs/rules/decisions.md) forbids |
| `grill-with-docs` | a wrapper that runs `grilling` + `domain-modeling` then routes to `to-spec` → `to-tickets`. We keep the behaviour and reject the routing: ours is `map-slice` → grill → `plan-slice` |
| `to-spec`, `to-tickets` | `plan-slice` **is** these, and knows this repo's preconditions |
| `implement` | step 4 is `new-module` → `tdd` → `code-review`; a fourth wrapper adds nothing |
| `improve-codebase-architecture`, `resolving-merge-conflicts`, `diagnosing-bugs`, `wizard`, `teach`, `handoff`, `triage` | never named by any rule or skill here |
| `setup-matt-pocock-skills` | configures a tracker we do not have |
| everything under `in-progress/` and `misc/` | unfinished upstream, or unrelated tooling |

## The rule

- **Never edit a file here.** A change we want is a change upstream, or a repo-owned skill in
  the parent directory that wraps this one.
- **Bump by replacing a directory whole**, and update the version above in the same commit.
- **Adding one is a decision.** It needs a row in the table above naming what requires it.
- Excluded from `fmt` and `lint` in `vite.config.ts` — we format and lint what we author.
