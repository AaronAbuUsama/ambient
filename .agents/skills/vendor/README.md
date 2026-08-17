# Vendored skills

**Upstream, unchanged. Do not edit anything in this directory.**

Vendored 2026-08-17. **Nine skills**, each here because something in this repo names it — not
because it exists. Seven from `mattpocock-skills` **1.2.3**, plus `diagram-design` and
`install-anti-slop`.

| Skill | Who needs it | Depends on |
|---|---|---|
| `codebase-design` | [`modules.md`](../../../docs/rules/modules.md) requires its vocabulary **exactly** — module, interface, implementation, depth, seam, adapter, leverage, locality | — |
| `domain-modeling` | the discipline behind [`CONTEXT.md`](../../../CONTEXT.md); its `CONTEXT-FORMAT.md` is the format we follow | — |
| `grilling` | the `grilling` kind in [`slices.md`](../../../docs/rules/slices.md) | — |
| `research` | the `research` kind; dispatched as a subagent by `map-slice` | — |
| `prototype` | the `spike` kind. **Our word is Spike** — see [`CONTEXT.md`](../../../CONTEXT.md) | — |
| `tdd` | step 4, build | `code-review`, `codebase-design` |
| `code-review` | step 4, closing a ticket | *`setup-matt-pocock-skills`, deliberately not vendored* |
| `diagram-design` | the design step's two diagrams — call stack and modules — per [`artefacts.md`](../../../docs/rules/artefacts.md) | — |
| `install-anti-slop` | the Oxlint plugin this repo installs | — |

**Two skills `artefacts.md` used to name are NOT here, on purpose.** `impeccable` was vendored
and removed: the only page this repo generates is a slice's own documentation, and
`render-slice` owns that. `dataviz` cannot be vendored at all — it ships with the harness, so
there is nothing on disk to copy. If INGEST's pairing screen lands, it is a product UI rather
than a document and `impeccable` becomes worth vendoring again — that is a decision for that
slice, recorded here so it is not rediscovered.

The set is closed under its own dependencies. `tdd` names `code-review` and
`codebase-design`; both are here.

## The one declared patch

`code-review/SKILL.md` line 13 pointed at `/setup-matt-pocock-skills`, which asks three
questions this repo has already answered and writes a `docs/agents/` that no longer exists.
It now points at [`setup-abu-usama-skills`](../setup-abu-usama-skills/SKILL.md), which
**declares** those answers instead: issues are files, there is no remote, `gh` and `glab`
are never run, and the Status vocabulary is the six strings in
[`issues.md`](../../../docs/rules/issues.md).

The patched line carries `<!-- PATCHED: see ../README.md -->` so nobody mistakes it for
upstream. A declared patch with a reason is a decision; an undeclared one is decay — the same
argument as the file-length exception list in `scripts/shape.ts`. On the next version bump,
re-apply it.

**The only other legitimate edit** is `diagram-design/references/style-guide.md`, when Ambient
finally has a palette: its first-run gate is answered in
[`setup-abu-usama-skills`](../setup-abu-usama-skills/SKILL.md), and branding it means writing
a `## Custom tokens` section there and saying so in the same commit. Nothing else in this tree
is editable.

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
