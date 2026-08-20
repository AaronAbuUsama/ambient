# 09 — our own code-review skill, with Shape

**Status:** done · **Blocks:** nothing · **Blocked by:** 08

*Measured 2026-08-19:* the vendored skill's Standards axis looks for `CODING_STANDARDS.md`
or `CONTRIBUTING.md`; its Spec axis fetches issues via `docs/agents/issue-tracker.md`.
**All three are absent**, and `git remote -v` prints nothing. *Instrument: `test -e` on each
path; `git remote -v | wc -l` → 0.* Both axes point at nothing here.

And the reviewer's job has a size: **oxlint touches one of the twelve rules, `shape.ts`
touches four. Seven rules have no mechanical check on any clause.** That is what the
decision *agent rules are enforced by the reviewer* actually handed over.
*Instrument: [findings/01](../findings/01-code-review-inputs.md).*

## Done when

- A repo-owned code-review skill exists. **Standards** reads [`docs/rules/`](../../../rules/);
  **Spec** reads `docs/planning/<slice>/spec.md`.
- A third axis, **Shape**, reads `design.md` and `seams.md`: did the diff put behaviour where
  the design said, does every new public symbol have a production caller, did a handler drift
  toward being the composition root. It is disjoint from Spec by rule —
  [`slices.md`](../../../rules/slices.md) says the spec *"does not restate the design."*
- It carries the concrete list of what tooling already enforces, so *"skip anything tooling
  enforces"* stops being a guess.
- **Record** is deliberately not built. Its stronger half belongs to `close-slice` under
  definition-of-done row 9. Recorded so it is not rediscovered.
- Spec gate row **18** passes.

## Governed by

- [findings/01](../findings/01-code-review-inputs.md) — read it before designing the axes; it
  quotes what the vendored skill consumes, line by line.
- Row 9 of [definition-of-done.md](../../../design/definition-of-done.md) **splits**, and row
  10 is not one row. Both corrections come from that findings file and land here.

## Comments

**2026-08-19 — deferred by the principal.** Blocked by 08, which was deferred rather than
built; see that ticket. The vendored code-review skill still points both its axes at files
this repo does not have — `CODING_STANDARDS.md`, `CONTRIBUTING.md`, and an issue tracker that
does not exist — so nothing regressed by waiting. It stays `ready-for-agent` with its
measurements intact.

**2026-08-20 — built. Three axes, and the subtraction is a list.**

[`.agents/skills/code-review/`](../../../../.agents/skills/code-review/SKILL.md). **Standards**
is handed the paths under [`docs/rules/`](../../../rules/) rather than their contents —
[AGENTS.md](../../../../AGENTS.md) is written for progressive disclosure and *"read the rule
you are about to work under"* is the instruction, not *read all twelve*. **Spec** reads
`spec.md` and the ticket, because the ticket's **Done when** is what the diff was for.
**Shape** reads `design.md` and [`seams.md`](../../../design/seams.md), and is disjoint from
Spec because [`slices.md`](../../../rules/slices.md) says the spec does not restate the
design. The vendored smell baseline is kept, by path, not copied.

*"Skip anything tooling enforces"* is now a list: 21 oxlint rules at `error` named one by
one, tsc's six flags, `shape.ts`'s four assertions, and gate 16 and 18. *Instruments:*
`grep -cE '^\s+"[a-z-]+/[a-z-]+": "error"' vite.config.ts` → 21;
[`scripts/shape.ts`](../../../../scripts/shape.ts) read top to bottom. The skill says the
list is measured rather than remembered, and that a change to a check corrects it in the same
commit — which is the failure `types.md:36` committed and 08 fixed.

**Record is not built, and the skill says why.** Its stronger half is owned twice already —
[decisions.md](../../../rules/decisions.md) requires the contradiction said in the change
that causes it, and definition-of-done row 9 asserts at close that every one was written up.
A fourth axis would be a second authority over one statement.

**The two corrections from [findings/01](../findings/01-code-review-inputs.md) landed in
[definition-of-done.md](../../../design/definition-of-done.md).** Row 9 is two acts and only
the sweep is the row's. Row 10 is three questions: *does the graph match* needs the finished
program and stays; *does every public symbol have a production caller* and *did a handler
become the composition root* are diff-local, are Shape's, and the second is visible **only**
in a diff — by close time `import`'s handler is simply 176 lines and looks like a file.

**Four documents named the vendored copy and now name ours**, because `.claude/skills/code-review`
was repointed to `../../.agents/skills/code-review`, following the pattern every repo-owned
skill already uses: the driver's step-5 dispatch row, [`slices.md`](../../../rules/slices.md)
step 5, [`walkthroughs/slice.md`](../../../walkthroughs/slice.md) step 5, and **gate row 13**,
which listed `/code-review` among the seven that resolve to `.agents/skills/vendor/`. That row
was written before this ticket's shape was decided; row 18 gives the name to ours, and the
vendored copy stays reachable by path as `tdd`'s declared dependency, so
[`vendor/README.md`](../../../../.agents/skills/vendor/README.md)'s closure still holds and
nothing under `vendor/` was edited.
