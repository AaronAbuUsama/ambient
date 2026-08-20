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

## The canvas and the column it is drawn into

The column is **944px at a 1280 viewport** — 1280 less the 248px rail and 44px of padding
either side — and 1072px at 1440. That is narrower than every canvas here, so `svg.d` is
`width: 100%` and **the shell forces no minimum**: the canvas is drawn to fit the column, and
every clearance in this file scales with it. A unit is 0.94px on a 1000 canvas at the narrowest
viewport the page is read at, and 0.91px on recipe B's 1040, which is why **8px is the floor for
type** — below it there is nothing left to give.

The shell used to force `min-width: 1040px`, recipe B's canvas. The other three were stretched
to it and then cut at the column's edge, and recipe A right-aligns each module's name at
`x + w - 8` — exactly where the cut fell, so three modules read `cl`, `blobs` and `tran`. Every
numeric check in this file passed.

## The rule that prevents the collision

```
canvasHeight = lowestBoxBottom + 112
legendRuleY  = canvasHeight - 68
legendTextY  = legendRuleY + 20
swatchY      = legendRuleY + 8      (12 × 12, rx 2)
swatchX      = 40, 280, 520, 760    (four slots, 200 wide; label at swatchX + 20)
```

**Check it before you emit.** `lowestBoxBottom` is `max(y + height)` over every node box, not
over the last box you happened to write. Clearance below 32px is a fail.

## One corridor per connector

Four connectors once shared the vertical at `x=356`, two of them overlapping in `y`. They
rendered as **one continuous line** and which question fed which gate row was untraceable — and
the checklist passed, because it asked only whether they shared an *attach point*. They did not.
They shared the whole run between the attach points.

**No two connectors occupy the same `x` over the same `y`.** Corridors sit **24px apart**, and
**the longest run takes the corridor nearest its target**, so shorter runs nest inside it and
nothing crosses. Recipe C's ladder is `316 · 340 · 364 · 388`. Recipe A's two elbows do share
`x=624` and are legal for the one reason that matters: their runs are 72px apart in `y` and
cannot touch.

## Text is measured against its slot

Two legend labels once overran their slot and collided with the next swatch, and every numeric
check passed — because nothing compared a string's width to the space it had. Measuring a string
against its neighbours is not measuring it against its slot.

`Geist Mono` 8px advances **4.8px a character**, measured off the embedded font:

A field line runs `x+8` to `x+w-8`, so its budget is `floor((w - 16) / 4.8)` and **it is per
box, not per file** — recipe A alone has three widths:

| Box | Slot | Budget |
|---|---|---|
| recipe A's caller and foundation, `w 224` | 208px | **43 characters** |
| recipe C's box, `w 240` | 224px | **46 characters** |
| recipe A's focal, `w 256` | 240px | **50 characters** |
| recipe A's callees, `w 304` | 288px | **60 characters** |
| a legend label, `swatchX+20` to the end of its slot | 180px | **37 characters** |

**46 is not the number.** It is one box's number, and the box that produced the rule; carrying
it to a 224-wide slot passes a string three characters over the edge.

**`Geist` sans is proportional and cannot be counted** — measure it, or keep it to a name. It is
used for node names and nothing that has to fit beside something else.

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
step it opens on the right. Four kinds exist, so the column is one to four boxes — the node
budget cannot be blown here.

The box is recipe A's two-section box at **240×64**, `x 40`: divider `y+32`, tag box
`48, y+8, 52×12 rx 2`, the count right-aligned at `272`, the field line's baseline `y+52`.
**It has one height**, because its content is a header band and one field line whatever the
count says. What varies is how many boxes the column holds, and that is solved below — every
count the recipe can produce, none of it freehand.

| Kinds | box y | gate y | terminal y | lowest edge | legend rule | canvas |
|---|---|---|---|---|---|---|
| 1 | 52 | 32 | 48 | 136 † | 172 | `0 0 1000 240` |
| 2 | 32, 128 | 60 | 76 | 192 | 228 | `0 0 1000 296` |
| 3 | 32, 128, 224 | 108 | 124 | 288 | 324 | `0 0 1000 392` |
| **4** | 32, 128, 224, 320 | 156 | 172 | 384 | 420 | `0 0 1000 488` |

Boxes step **96** — 64 and a 32 gutter — and the column is centred on the gate, which is why
the gate and the terminal move with the count. **†** at one kind the gate is the lowest thing
on the canvas, not the column: a 104-tall gate against a single 64-tall box, so the legend
clears `32 + 104` and not `52 + 64`. Every other row clears the bottom box. Gate `428, <gate y>, 204×104` (accent),
terminal `736, <terminal y>, 224×72`.

Each box leaves its right edge at `y+32` and takes **its own corridor** into its own attach
point on the gate's left edge:

```
1   M280,84  H428                                                  (level — plain line)

2   M280,64  H356 Q364,64  364,72  V84   Q364,92  372,92  H428
    M280,160 H332 Q340,160 340,152 V140  Q340,132 348,132 H428

3   M280,64  H356 Q364,64  364,72  V124  Q364,132 372,132 H428
    M280,160 H428                                                  (level)
    M280,256 H332 Q340,256 340,248 V196  Q340,188 348,188 H428

4   M280,64  H380 Q388,64  388,72  V164  Q388,172 396,172 H428
    M280,160 H356 Q364,160 364,168 V188  Q364,196 372,196 H428
    M280,256 H308 Q316,256 316,248 V228  Q316,220 324,220 H428
    M280,352 H332 Q340,352 340,344 V252  Q340,244 348,244 H428
```

The gate leaves level for the terminal — `M632,<gate y + 52> H736`.

**Kind decides the fill**, and this is the whole point of the diagram:

| Kind | Fill | Stroke | Tag |
|---|---|---|---|
| `grilling` | `#fff` | `ink` | `GRILLING` — HITL, only the principal |
| `research` · `spike` | `rgba(45,49,66,.05)` | `muted` | `RESEARCH` / `SPIKE` — AFK, dispatchable now |
| `task` | `rgba(79,93,117,.10)` | `soft` | `TASK` — either, HITL or AFK |
| the gate | `rgba(235,108,54,.06)` | `accent` | the one accent |

**A question does not fit in a node.** The field line's budget is one short label, and
compressing a question into it produced `T1  linked-device slots free` and `G2  § The caller` —
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
- [ ] No two connectors run in the same corridor over the same `y`, and the longest run is
      nearest its target
- [ ] Every string measured against **its own** slot — `floor((w - 16) / 4.8)` in a box `w`
      wide, 37 in a legend label. 46 is the 240 box only
- [ ] Accent on ≤2 elements
- [ ] Legend is a bottom strip and names every treatment used, and nothing else
- [ ] Node count within budget: 6 modules, 5 lifelines, 9 DAG nodes

**Then open the page and look at it.** Measuring the DOM is not looking. Every collision shipped
so far passed its own numeric check.
