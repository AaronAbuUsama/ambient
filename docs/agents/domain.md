# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring
the codebase.

This repo is **single-context**: one `CONTEXT.md` at the root, one `docs/adr/`. There is no
`CONTEXT-MAP.md` and no per-context ADR directories.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root — the glossary.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't
suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs`
and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually
get resolved.

## File structure

```
/
├── AGENTS.md                          ← the engineering contract, read first
├── CONTEXT.md                         ← the glossary (created lazily)
├── README.md                          ← the doc map
├── docs/
│   ├── adr/                           ← architecture decisions (created lazily)
│   ├── agents/                        ← this file, plus tracker + label config
│   ├── grills/                        ← stress-tested decisions
│   ├── planning/                      ← specs and issues in flight
│   ├── research/                      ← evidence
│   └── *.md                           ← thesis, product, seams, roadmap, kernel
└── src/
```

`CONTEXT.md` stays at the repo root even though the rest of the docs live under `docs/` —
that's where every skill looks for it.

## The design docs are not optional context

`docs/thesis.md`, `docs/product.md`, `docs/knowledge-flow.md` and `docs/seams.md` are the
current truth for this project; `docs/kernel.md` is history and defers to them. Read the
ones relevant to the area you're touching before proposing a change. See
[README.md](../../README.md) for the intended reading order.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a
hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms
the glossary explicitly avoids.

`AGENTS.md` already pins the module vocabulary — **module, interface, implementation, depth,
seam, adapter, leverage, locality**. Not "component", "service", "API", "boundary". That
binding holds regardless of what `CONTEXT.md` says.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing
language the project doesn't use (reconsider) or there's a real gap (note it for
`/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently
overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_

The same applies to the **Decided — do not re-litigate** list in `AGENTS.md`.
