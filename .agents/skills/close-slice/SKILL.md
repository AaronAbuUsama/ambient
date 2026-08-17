---
name: close-slice
description: Close a roadmap slice in the ambient repo — run every row of docs/design/definition-of-done.md, report pass/fail per row, then update the roadmap status board, You-are-here and ledger. Use when the user says a slice is done, asks to close SKELETON/INTAKE/any slice, or asks whether a slice can be closed.
---

# Close a slice

Run [`docs/design/definition-of-done.md`](../../../docs/design/definition-of-done.md) and
report it. Do not update the roadmap until every row passes.

## 1 · Run the rows

From the repository root, in this order. Report each as `pass` or `fail` with the output
that decided it — one line each, no commentary.

```bash
vp check                  # rows 2
vp test                   # rows 1 and 3 — name the gate file and its assertion count
vp run shape              # rows 4 and 6
pnpm dlx fallow dupes     # row 5 — compare against the baseline in the DoD
```

Then read, do not run:

- **row 7** — `docs/design/roadmap.md` status board and **You are here**
- **row 8** — the ledger entry, and whether the slice's **Active** section is still there
- **row 9** — any ADR statement the implementation contradicted
- **row 10 — the call graph.** Compare the spec's **Program design** against the code that
  now exists. Three questions, each with an answer you can point at:
  1. **Does the graph match?** Walk the trace from `main.ts` and name any step whose owner
     differs from the design.
  2. **Does every public symbol have a production caller?** A symbol nothing constructs is
     design that got implemented — the conformance table is where to check.
  3. **Did any module become the composition root by accident?** A handler far larger than
     its siblings is the signal. `import`'s reached 176 lines against 8, 8, 12 and 14 while
     its spec said it *"wires and does nothing else"*, and every other row was green.

  **A divergence is not automatically a failure.** The code may be right and the design
  wrong. But it must be resolved out loud: either move the code, or amend the spec's Program
  design saying what changed and why. Silently keeping both is the failure.

## 2 · Report before writing

A table: row, check, pass/fail, evidence. If anything fails, stop there and say what
fails. A failing row is the answer to "can we close it" — do not fix it as part of
closing unless asked.

## 3 · Update the roadmap

Only after every row passes, in one commit:

1. **Status board** — the slice's row becomes `● closed`. The next slice becomes `◐ active`.
2. **You are here** — one sentence: what closed, with the numbers (gate count, what is
   green), and what is now active.
3. **Ledger** — a dated entry at the top, newest first. Two lines: what shipped, and what
   was learned or overturned. Name anything that was wrong on contact.
4. **Delete the closed slice's Active detail.** The ledger line is what survives. The
   roadmap has a hard cap of 200 lines and the last attempt's hit 2000.
5. **Amendments** — if an ADR statement did not survive, correct it in that ADR's
   `## Amendments` section, never in its body.

Then re-run `vp run shape`: the roadmap edit may have broken a cross-link.
