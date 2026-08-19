# 02 — `/slice <SLICE>` advances a slice

**Status:** done · **Blocks:** 03, 04, 05, 06 · **Blocked by:** 01

The tracer bullet. One narrow complete path: read state → report → ask → dispatch one step.

## Done when

- `.agents/skills/slice/SKILL.md` exists, symlinked into `.claude/skills/`, carrying
  `disable-model-invocation: true`.
- It reads the **seven state signals** in [`design.md`](../design.md) § Interfaces, by `ls`
  and `grep` only. **Nothing is parsed into a data structure** — that was built twice and
  deleted twice, at `68d2180` and `00d9b09`.
- It reports the step table **before** acting, asks **before** dispatching, and dispatches
  one step skill by repository path.
- It reports staleness from `mtime` and `git status` and **writes no lock file**.
- **First act of this ticket, before the skill is written:** set
  `disable-model-invocation: true` on exactly one step skill, dispatch it from another
  skill, and record what happened with its instrument. If the flag blocks skill-to-skill
  dispatch, the driver cannot dispatch a flagged step skill and this ticket's shape changes.
- Spec gate rows **1, 2, 3, 4, 5, 6, 8, 16, 17** pass.

## Governed by

- [slices.md](../../../rules/slices.md) — the six steps and each step's gate. The driver has
  no opinion of its own about when a step is done; it reads that step's stated gate.
- [design.md](../design.md) § The caller — the transcripts are the specification of the
  output, including every failure branch.
- `new-module` does **not** apply: this adds no module, and there is no `00`.
