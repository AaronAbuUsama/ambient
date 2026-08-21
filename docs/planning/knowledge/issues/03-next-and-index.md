# 03 — the work queue and the derived index

**Status:** ready-for-agent · **Blocks:** nothing · **Blocked by:** 00, 01, 02

Two verbs, one ticket, because both are pure functions over the list `base.all()` already
returns and neither is a complete path on its own.

**The work queue is a frontmatter status and nothing more.** That is what lets a quiet day be
cheap: nothing unreviewed, nothing printed, nothing spent.

## What to do

1. `next(docs, { type, limit }) → Document[]`. **Pure.** Filters `status: unreviewed`.
2. `index(docs) → Index`. **Pure.** The derived read model — frontmatter is truth, this is
   disposable, and deleting it must reproduce it exactly.
3. `base.writeIndex(index)` — writes to `home.index`, **outside** the knowledge base, as a
   single `rename`.
4. `cli.ontology` grows two subcommands and no logic.

## Done when

Gate rows **10, 11** of [`spec.md`](../spec.md) pass.

Row 11 is the one with teeth: delete the index, re-run, and the bytes must be identical. An
index that is not reproducible is not derived, and the whole argument for it being disposable
collapses.

## Governed by

[`modules.md`](../../../rules/modules.md) · [`errors.md`](../../../rules/errors.md) ·
[`legibility.md`](../../../rules/legibility.md)
