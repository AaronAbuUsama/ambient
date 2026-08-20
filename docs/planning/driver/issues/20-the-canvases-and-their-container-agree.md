# 20 — the diagram canvases and the container agree on one width

**Status:** done · **Blocks:** nothing · **Blocked by:** nothing

*Converted from deficit 27, **sharpened by DRIVER**: the register's stated instrument is
wrong, and the corrected one is below.*

`assets/shell.html` sets `.scroll svg.d { min-width: 1040px }`. That is recipe **B**'s canvas.
Recipes **A**, **C** and **D** are `0 0 1000 …`, and every one is wrapped in `.scroll`.

A 1000-wide diagram is stretched to 1040 and clipped. Recipe A right-aligns each module's name
at `x + w - 8` — for the right-hand column, **exactly the clip line** — so three modules
rendered as `cl`, `blobs` and `tran`.

**The register's instrument is wrong and would wrongly close this.** It says *"on a 1440px
display"* and quotes the 1280-viewport numbers. *Measured on DRIVER, 2026-08-19:* **at a 1440
viewport the diagram does not clip; at 1280 it hides 96px and cuts the terminal box in half.**
Display is not viewport. Re-check at **1280**.

**Every numeric check in `diagrams.md` passed** — legend clearance, the 4px grid, the node
budget, the fan spacing. What found it was the skill's own step 3: *open the page and look.*

## Done when

- Either the shell stops forcing a width the recipes do not produce, or the recipes move to
  1040. **One of the two, not both.**
- Re-checked at a **1280** viewport, not 1440.
- Horizontally clipped content is signalled rather than silently cut — a cut box currently
  reads as a box that ends.

## Governed by

- [artefacts.md](../../../rules/artefacts.md) — one HTML artefact per slice.
- **Shares files with tickets 12, 13 and 18** — the recipes; this one also owns
  `assets/shell.html`.

## Comments

**2026-08-20 — done. The shell stops forcing a width; no recipe coordinate moved.** Of the two
fixes, only this one can work: at a **1280** viewport the column is **944px** — 1280 less the
248px rail and 44px of padding either side — which is narrower than *both* canvases. Moving A,
C and D to 1040 would hide 96px instead of 56 and cut the same right-hand column harder, while
re-solving three recipes. `svg.d` is already `width: 100%`, the geometry is in viewBox units,
and so deleting `min-width: 1040px` costs nothing and makes the canvas fit whatever column it
is given. Recipe B stays at 1040. What a unit is now worth, and that 8px is therefore the floor
for type, is stated in
[`diagrams.md`](../../../../.agents/skills/render-slice/references/diagrams.md).

**Measured at 1280, before and after**, on a page spliced from the shell with the four recipe C
canvases in it:

| | column | canvas drawn at | hidden |
|---|---|---|---|
| before | 944 | 1040 | 96px — the terminal box read `4 · Plan t` |
| after | 944 | 944 | none |

**The cut is signalled where a cut is still possible.** `.scroll` holds more than diagrams, and
macOS overlay scrollbars are invisible until dragged, so a 1600px block inside it read as a
block that ends. `.scroll::-webkit-scrollbar` gives it a 6px bar that takes layout space —
`offsetHeight` 46 against `clientHeight` 40 — so it is painted whenever, and only when, there is
more to the right. `scrollbar-color` was tried first and left the bar an overlay in the browser
this page is read in; it is not in the file for that reason.
