# 09 — our own code-review skill, with Shape

**Status:** ready-for-agent · **Blocks:** nothing · **Blocked by:** 08

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
