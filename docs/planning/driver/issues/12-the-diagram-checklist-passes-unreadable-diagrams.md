# 12 — the diagram checklist stops passing unreadable diagrams

**Status:** ready-for-agent · **Blocks:** nothing · **Blocked by:** nothing

*Converted from deficit 15, which DRIVER did not answer.*

Two defects, both obvious in one second of looking, both invisible to every numeric check in
[`diagrams.md`](../../../../.agents/skills/render-slice/references/diagrams.md):

- **Four connectors shared one vertical corridor** at `x=356`, two overlapping in `y`. They
  rendered as one continuous line, and which question fed which gate row was untraceable.
- **Two legend strings overran their slot** and collided with the next swatch.

The checklist says *"No two connectors share an attach point; shared edges fanned ≥12px."*
They did not share an attach point — they shared the whole corridor — so the rule never
fired. There is **no rule at all** about text width against available slot width.

**The third recorded instance of the standing lesson**, and the first where the lesson was
already written at the foot of the file being followed: *"Then open the page and look at it.
Measuring the DOM is not looking."*

## Done when

- `diagrams.md` gains a corridor rule: one corridor per connector, ordered so runs nest and
  nothing crosses.
- It gains a text-width rule: a string is measured against the slot it must fit, not only
  against its neighbours.
- Both are stated so they can fire on the case that produced them.

## Governed by

- [artefacts.md](../../../rules/artefacts.md) — diagrams are drawn with `diagram-design`,
  never defaulted.
- **Shares a file with tickets 13 and 18.** All three edit
  `.agents/skills/render-slice/references/diagrams.md`; this one touches the checklist,
  not recipe C.
