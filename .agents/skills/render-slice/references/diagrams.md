# The four diagram recipes

**Do not invent coordinates.** Every layout below is solved, on the 4px grid, with its legend
already clear of the lowest box. Pick the row that matches your node count and fill it. Freehand
placement is what produces collisions — a legend was once drawn straight through a row of nodes
because its `y` was copied from a shorter canvas.

Drawn with the vendored [`diagram-design`](../../vendor/diagram-design/SKILL.md) skill, default
skin, branding gate already answered in
[`setup-abu-usama-skills`](../../setup-abu-usama-skills/SKILL.md). **Load its
`references/type-*.md` before drawing** — this file gives you the geometry, that one gives you
the grammar.

## The rule that prevents the collision

```
canvasHeight = lowestBoxBottom + 112
legendRuleY  = canvasHeight - 68
legendTextY  = legendRuleY + 20
swatchY      = legendRuleY + 8      (12 × 12, rx 2)
```

**Check it before you emit.** `lowestBoxBottom` is `max(y + height)` over every node box, not
over the last box you happened to write. Clearance below 32px is a fail.

## Palette — literal hex, never `var()`

`paper #f5f5f5` · `ink #2d3142` · `muted #4f5d75` · `soft #7a8399` · `accent #eb6c36`
· rule `rgba(45,49,66,.2)` · legend rule `rgba(45,49,66,.1)`

Type tags and all signature text are `Geist Mono` 8px; node names are `Geist` sans 12px 600.
**Accent on 1–2 elements per diagram, never more.**

---

## Recipe A — Modules and interfaces

Type: **ER** (`type-er.md`). Entity = module; fields = its public interface. Two-section box:
header band with a stereotype tag and the name right-aligned, a divider, then `+ signature`
lines and one muted footnote.

Canvas `0 0 1000 480` for up to 6 modules. Lowest box bottom **376**, legend rule **412**.

| Slot | x | y | w | h | Use for |
|---|---|---|---|---|---|
| caller | 40 | 160 | 224 | 88 | the module that calls in |
| **focal** | 328 | 152 | 256 | 104 | the module this slice adds — the one accent |
| foundation | 40 | 280 | 224 | 88 | `home`, or whatever everything binds to |
| callee 1 | 648 | 32 | 304 | 88 | widest slots; interfaces are long |
| callee 2 | 648 | 160 | 304 | 88 | |
| callee 3 | 648 | 288 | 304 | 88 | |

Header divider at `y + 32`. Tag box `x+8, y+8, 52×12, rx 2`. Name right-aligned at `x+w-8`.
Signatures start at `y + 52`, then every **16px**. Footnote at the last line in `rgba(79,93,117,.7)`.

**Edges.** Focal's right edge carries three, fanned at `y+26`, `y+52`, `y+78` (26px apart, above
the 12px floor). Elbow to callee 1 and 3, straight line to callee 2:

```
M584,176 H616 Q624,176 624,168 V84 Q624,76 632,76 H648     (up)
M584,204 H648                                               (level — same y, plain line)
M584,232 H616 Q624,232 624,240 V324 Q624,332 632,332 H648   (down)
```

Stereotype tags in use: `MODULE` · `READER` · `WRITE PATH` · `STORE` · `EXISTS`.

**Seven or more modules is two diagrams.** Above 6 the right column runs out and the budget is
blown; split into an overview and a detail.

---

## Recipe B — Call graph

Type: **sequence** (`type-sequence.md`). Canvas `0 0 1040 720` for 5 lifelines. Lowest element
**596**, legend rule **644**.

| Lifelines | x centres | Actor box |
|---|---|---|
| 3 | 160, 520, 880 | `cx-68, 44, 136×48` |
| 4 | 140, 400, 660, 920 | same |
| **5** | 120, 320, 520, 720, 920 | same |

Lifelines `y 92 → 612`, `rgba(45,49,66,.2)`, `stroke-dasharray="3,3"`. Activation bar
`cx-4, top, 8 × h`, fill `rgba(45,49,66,.06)`, stroke `muted 0.8`.

Messages start at `y=144` and step **32px**; a return sits 36px below its call. Label mask
`fill="#f5f5f5"`, 12px tall, baseline **11px above** the line — that is the mandatory 6–10px gap.

- Call: solid muted, filled marker.
- **Return: dashed `5,4`, filled marker, never solid.** Its label is the return *type*, including
  the failure arm — `OpenedArchive | Problem`.
- Self-message: `M cx+4,y H cx+52 Q cx+60,y cx+60,y+8 V y+16 Q cx+60,y+24 cx+52,y+24 H cx+8`.
- Accent on **one** headline return, plus the self-message if it is the durable claim. Two max.

**One combined fragment.** Frame inset ≥12px outside the outermost participating lifeline, tab
`48×16` top-left with the operator in mono, guard `[…]` 24px under the tab.

---

## Recipe C — Question DAG

Type: **architecture** grammar. **One box per kind** on the left, the gate in the middle, the
step it opens on the right. Canvas `0 0 1000 560`. Lowest box **448**, legend rule **492**.

| Questions | y positions (x 40, 240×48) |
|---|---|
| 3 | 96, 224, 352 |
| 4 | 72, 184, 296, 408 |
| **5** | 48, 136, 224, 312, 400 |
| 6 | 40, 120, 200, 280, 360, 440 → canvas 600, legend 532 |

Gate box `428, 196, 204×104` (accent). Terminal box `736, 212, 224×72`.

Edges leave each box's right edge at its vertical centre and elbow into the gate's left edge:

```
M280,<qy+24> H420 Q428,<qy+24> 428,<gate_y ± 8> V196      (approach from above)
M280,<qy+24> H428                                          (level — plain line)
```

**Kind decides the fill**, and this is the whole point of the diagram:

| Kind | Fill | Stroke | Tag |
|---|---|---|---|
| `grilling` | `#fff` | `ink` | `GRILLING` — HITL, only the principal |
| `research` · `spike` | `rgba(45,49,66,.05)` | `muted` | `RESEARCH` / `SPIKE` — AFK, dispatchable now |
| `task` | `rgba(79,93,117,.10)` | `soft` | `TASK` — either, HITL or AFK |
| the gate | `rgba(235,108,54,.06)` | `accent` | the one accent |

**A question does not fit in a node.** A 240-wide box at 8px mono is 46 characters, and
compressing a question into one produced `T1  linked-device slots free` and `G2  § The caller` —
labels for something the reader was expected to already know. So the box carries **the kind and
the count**: the tag in the header band, `n open` right-aligned beside it, and one field line
carrying the mode — the words after the tag in the table above. **The questions themselves are
the table beside the diagram, in full.** What the diagram shows is the shape — who answers, and
what the step waits on — and no string in it needs a second document to read.

Legend must name HITL, AFK and the gate.

---

## Recipe D — Ticket DAG

Type: **architecture** grammar, left to right by blocking order. Canvas `0 0 1000 400` for six
tickets. Lowest box **296**, legend rule **332**.

Box `176×48`. Columns at x `40, 272, 504, 736`. Rows at y `20, 96, 172, 248`.

A ticket that writes no code but unblocks everything (a seam-map ticket) is the accent. Each box
carries the ticket number and title in Geist sans, and **one measured fact** in mono above it —
`51 Events measured`, `1,139 markers` — because a ticket with no number in it is not sized.

Edge is `blocks`, pointing from blocker to blocked. Fan a shared right edge at `y+8` and `y+40`.

---

## Before you emit any diagram

- [ ] `legendRuleY == canvasHeight - 68`, and `lowestBoxBottom + 32 <= legendRuleY`
- [ ] Every `x`, `y`, `width`, `height` divisible by 4
- [ ] No diagonal connector — every off-axis link is a rounded elbow, `r=8`
- [ ] Every arrow label has an opaque `#f5f5f5` mask with a 6–10px gap above the stroke
- [ ] No two connectors share an attach point; shared edges fanned ≥12px
- [ ] Accent on ≤2 elements
- [ ] Legend is a bottom strip and names every treatment used, and nothing else
- [ ] Node count within budget: 6 modules, 5 lifelines, 9 DAG nodes

**Then open the page and look at it.** Measuring the DOM is not looking. Every collision shipped
so far passed its own numeric check.
