# 12 — the diagram checklist stops passing unreadable diagrams

**Status:** done · **Blocks:** nothing · **Blocked by:** nothing

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

## Comments

**2026-08-20 — done.** Two rules, each stated next to the case it fires on, and each with a
checklist row so it runs.

**One corridor per connector.** The old row asked about *attach points*, and four connectors
sharing `x=356` did not share one. The new row asks about the run: no two connectors occupy the
same `x` over the same `y`, corridors 24px apart, the longest run nearest its target so shorter
runs nest inside it. It is stated as *same `x` over the same `y`* rather than *one `x` each*
because recipe A's two elbows already share `x=624` legally — their runs are 72px apart and
cannot touch — and a rule its own file breaks on the day it is written is not a rule.

**Text against its slot.** Nothing fired because there was no legend slot to measure against:
the geometry block gave `swatchY` and never `swatchX`. It now gives both — `40, 280, 520, 760`,
four slots 200 wide — and the budgets are read off a measured advance. **`Geist Mono` 8px is
4.8px a character**, measured with `canvas.measureText` against the embedded font on the
rendered page, 2026-08-20: 22 characters returned 105.6px. So a 224px field line is 46
characters and a 180px legend label is 37. Sans is proportional and is stated as uncountable
rather than given a wrong constant.
