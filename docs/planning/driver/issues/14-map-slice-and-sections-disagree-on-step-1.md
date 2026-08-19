# 14 — one file says what step 1 fills, and it is right

**Status:** ready-for-agent · **Blocks:** nothing · **Blocked by:** nothing

*Converted from deficit 17, which DRIVER did not answer.*

| Says | What |
|---|---|
| `map-slice` *Finish* | *"Regenerate the page — this fills sections **1, 2, 4 and 8**."* |
| [`sections.md`](../../../../.agents/skills/render-slice/references/sections.md) | *"A slice at step 1 has **three**."* |

Sections 4 and 8 are **Modules and interfaces** and **State and failure** — both in group
DESIGN, both impossible before step 2. One file had the count right and the identity wrong;
the other had both wrong. DRIVER filled three: **1, 2 and 11**.

**Half of this disagreement is already gone.** Ticket 04 deleted `map-slice`'s *Finish* item
entirely, because the instruction to regenerate the page moved to the driver. What survives is
`sections.md`'s claim of *three*, unreconciled against the three DRIVER actually filled.

## Done when

- `sections.md` says which sections a slice at step 1 has, by number, and the numbers are the
  ones a step-1 slice actually fills.
- No second file states a different answer.

## Governed by

- [language.md](../../../rules/language.md) — one statement, one home.
- **Shares a file with ticket 15.**
