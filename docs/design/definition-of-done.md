# Definition of done

What "closed" means for a slice. Every row is a command you can run or a state you can
look at — nothing aspirational, nothing that depends on how it felt. A slice is closed
when all ten pass, in order.

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
| 9 | ADR **Amendments** | Every statement in an ADR that did not survive contact is corrected in that ADR's `## Amendments` section, with the reason. Never a silent rewrite of the body. This row is the sweep, not the saying — see below. |
| 10 | The **call graph**, read not run | `docs/planning/<slice>/design.md` matches the code: the trace from `main.ts` owns each step where the design said it would, every public symbol has a production caller, and no module became the composition root by accident. A divergence is resolved out loud — move the code, or amend `design.md` — never left standing in both. Three questions, and two of them were already asked per ticket — see below. |

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

Rows 1–5 are the ones that fail. Rows 7–10 are the ones that get skipped when the work is
done and the writing-up is not — and skipping them is how a roadmap becomes a
2000-line ledger nobody reads, and how an ADR quietly becomes a lie about what was
built.

Row 9 is the sharpest. Four statements in [ADR 001](../adr/001-home-interface.md) were
wrong on contact with the implementation; a fifth followed. They are in that document's
Amendments section, and the decision they support is still legible because the record of
being wrong is next to it.

**Row 9 is two acts, and only the second is this list's.** Saying that the implementation
contradicts an ADR happens in the change that contradicts it —
[decisions.md](../rules/decisions.md) requires it there, at the moment it is still obvious
why. This row is the sweep afterwards: that every one of them reached an `## Amendments`
section and none of them reached a body. A slice can pass this row and still have been
written the wrong way round, which is why the rule and not the row is where the discipline
lives.

**Row 10 exists because IMPORT passed rows 1–9 while its topology was wrong.** Its CLI
handler reached 176 lines against 8, 8, 12 and 14 for its siblings — making `cli` the
composition owner its own spec said it was not — and `transcript` shipped `from: "live"`
variants nothing originates, since only its own deserialiser ever rebuilds one. Every test
passed, every check was green, and no row looked at the shape of the program. It is **read,
not run**, like rows 7–9, because the designed graph is prose today. Making it runnable is named as a candidate at the foot of
[slices.md](../rules/slices.md), once two slices have produced the artefact in a stable
shape.

**And row 10 is three questions, not one.** *Does the graph match?* needs the finished
program, and belongs here. *Does every public symbol have a production caller?* and *did a
handler become the composition root by accident?* are decidable from a diff — the second
**only** from one: by close time `import`'s handler is simply 176 lines and looks like a
file, while in the diff that grew it from 14 the growth is the finding. Both are the Shape
axis of [code-review](../../.agents/skills/code-review/SKILL.md), asked per ticket at step 5.
This row is where they are answered last rather than first, and a slice that reaches it with
either one unasked has already paid for the answer.

**The graph it reads is `design.md`, not the spec.** That moved when Design became step 2 of
[slices.md](../rules/slices.md): the design is now written before the frontier is worked
rather than inside the spec afterwards, so this row reads the file that step produces.
