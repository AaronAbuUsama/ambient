# 13 — recipe C carries solved geometry for the case it tells you to use

**Status:** done · **Blocks:** nothing · **Blocked by:** 18

*Converted from deficit 16, which DRIVER did not answer.*

Recipe C says: *"Above 6 questions, group the homogeneous ones into a single box listing them
as field lines."* Every solved coordinate in that recipe is for a **240×48** box. A box with
three field lines is **96 tall**.

INGEST opened nine questions, so the grouping instruction fired **immediately**, and the
geometry had to be solved freehand — **the exact thing the file exists to prevent**: *"Do not
invent coordinates. Freehand placement is what produces collisions."*

**Blocked by ticket 18**, which decides what recipe C's box carries. Geometry cannot be
solved for a box whose contents are still being decided.

## Done when

- Recipe C carries solved coordinates for the grouped box in the shape ticket 18 settles,
  at every height it can take.
- No case the recipe instructs requires freehand placement.

## Governed by

- [artefacts.md](../../../rules/artefacts.md).
- **Shares a file with tickets 12 and 18.**

## Comments

**2026-08-20 — done.** The box is **240×64** and has exactly one height, because ticket 18
fixed its content at a header band and one field line whatever the count says. What varies is
the column — one box per kind, so one to four — and the table now carries every one of them:
box `y`, gate `y`, terminal `y`, lowest box, legend rule and canvas. The gate and the terminal
move with the count because the column is centred on the gate; holding them still would open a
196px margin above a single box and leave the canvas carrying nothing.

**Every edge is written out — ten paths — rather than a template with a `± 8` in it.** The
template is what made four connectors share one corridor: it said where a run started and left
where it travelled to the person drawing it. Each box now takes its own corridor of the four
at `316 · 340 · 364 · 388`, and the longest run takes the one nearest the gate so the shorter
runs nest inside it.

**Drawn and looked at, all four cases, at a 1280 viewport** — the file's own step 3. No
corridor shared, no run crossed, the legend clear of the lowest box in each. The clipped
right-hand edge in that render is ticket 20's, and it is fixed there.
