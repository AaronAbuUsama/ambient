# Definition of done

What "closed" means for a slice. Every row is a command you can run or a state you can
look at — nothing aspirational, nothing that depends on how it felt. A slice is closed
when all nine pass, in order.

Run from the repository root. The skill [`close-slice`](../../.claude/skills/close-slice/SKILL.md)
runs this list and reports it row by row.

| # | Check | Passes when |
|---|---|---|
| 1 | `vp test` | Every assertion in the slice's gate passes, and the gate is the spec's §4 made executable — for SKELETON, the eighteen numbered `it`s in `src/modules/home/home.test.ts`. |
| 2 | `vp check` | `pass:` on both lines — formatting, lint and types, repo-wide. Not "in the files I touched". |
| 3 | `vp test` | `Test Files … passed`, no skipped test, no `.only`. |
| 4 | `vp run shape` | `shape: … clean`, exit `0`. File lengths, the six slots, imports, no `throw`, and every document cross-link resolving. |
| 5 | `pnpm dlx fallow dupes` | The reported figure is **no worse than 0 lines (0.0%)** — the baseline below. |
| 6 | Cross-links resolve | Covered by row 4; `vp run shape` names any `](…)` in a document that points at a file which does not exist. |
| 7 | `docs/design/roadmap.md` status board | The slice's row reads `● closed`, and **You are here** names the next slice. |
| 8 | `docs/design/roadmap.md` ledger | A dated entry, newest first, two lines: what shipped and what was learned. The slice's **Active** detail is deleted in the same commit — the ledger line is what survives. |
| 9 | ADR **Amendments** | Every statement in an ADR that did not survive contact is corrected in that ADR's `## Amendments` section, with the reason. Never a silent rewrite of the body. |

## The duplication baseline

```
$ pnpm dlx fallow dupes
✓ No code duplication found          →  0 lines, 0.0%
```

Measured on 2026-08-16, after the two clone groups in `home/internal/config.ts` — 30
lines, 1.7% — were extracted into `section` and `open`. **A closing slice must not exceed
0 lines.**

Raising the baseline is a decision, not a side effect: if a slice genuinely needs to
leave duplication behind, change the number in this file in the same commit, and say why
in the roadmap ledger entry. An unexplained rise is the check failing.

## Why these and not more

Rows 1–5 are the ones that fail. Rows 7–9 are the ones that get skipped when the work is
done and the writing-up is not — and skipping them is how a roadmap becomes a
2000-line ledger nobody reads, and how an ADR quietly becomes a lie about what was
built.

Row 9 is the sharpest. Four statements in [ADR 001](../adr/001-home-interface.md) were
wrong on contact with the implementation; a fifth followed. They are in that document's
Amendments section, and the decision they support is still legible because the record of
being wrong is next to it.
