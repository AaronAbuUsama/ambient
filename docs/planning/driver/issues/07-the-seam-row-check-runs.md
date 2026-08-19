# 07 — the seam-row check runs

**Status:** ready-for-agent · **Blocks:** nothing · **Blocked by:** nothing

The fix already exists, was proven, and was reverted under a standing instruction that has
since been lifted. **This ticket revives it rather than re-deriving it.**

*Measured:* for the whole of INGEST's steps 1–4, `ingest` was a module in `design.md`, in the
call graph and in five tickets, owned **no row** in `seams.md`, and `vp run shape` printed
`clean` on every one of those days. Ticket `00` existed in both IMPORT and INGEST purely to
write those rows — *it is this missing check with a number on it.*

## Done when

- `scripts/shape.ts` gains a section: every module named in a
  `docs/planning/<slice>/design.md` § Seam delta, and every directory under `src/modules/`,
  must own a row in [`seams.md`](../../../design/seams.md).
- Run against the tree as it stood at `00d9b09` it reports the `ingest` row missing; run
  against the tree as it stands it passes.
- `new-module`'s prose precondition points at the check rather than restating it.
- Spec gate row **14** passes.

## Governed by

- [legibility.md](../../../rules/legibility.md) — but **only its code half.** This slice
  settled that a rule about how work happens is not required to be runnable; a rule about
  repository state is.
- [modules.md](../../../rules/modules.md) — the seam row is what makes a directory a module.
