# 20 — the diagram canvases and the container agree on one width

**Status:** ready-for-agent · **Blocks:** nothing · **Blocked by:** nothing

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
