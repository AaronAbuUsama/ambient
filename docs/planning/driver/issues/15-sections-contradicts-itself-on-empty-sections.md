# 15 — `sections.md` stops contradicting itself on empty sections

**Status:** done · **Blocks:** nothing · **Blocked by:** nothing

*Converted from deficit 18, which DRIVER did not answer.*

> *"Build only the sections that have content."*

against

> *"Empty sections say which skill fills them and what will be in them. An empty section is
> information, not an apology."*

Resolved by judgement toward rendering stubs — the page's completeness can only *be* the
progress bar if the incomplete sections are on it — **but a rule conflict was resolved
silently by an agent**, which is the failure this register exists to prevent.

## Done when

- One of the two statements survives in
  [`sections.md`](../../../../.agents/skills/render-slice/references/sections.md), and the
  other is deleted rather than left to be re-resolved.
- The surviving statement is the one the pages already follow, or the pages change to match.

## Governed by

- [decisions.md](../../../rules/decisions.md) — the resolution is recorded, not just applied.
- **Shares a file with ticket 14.**

## Comments

**2026-08-20 — *"Build only the sections that have content"* is deleted.** The pages already
render the stubs: DRIVER's page of 2026-08-19 is twelve sections including ten stubs, approved
by the principal, and [`render-slice`](../../../../.agents/skills/render-slice/SKILL.md) tells
the renderer to draw every empty one as a line naming the skill that fills it. The bullet
survives unchanged.

One word went with it. The opening paragraph said a section is *missing* until its step runs,
which is the deleted claim said again — it now says *empty*, which is what the page shows and
what makes the completeness readable as a progress bar.
