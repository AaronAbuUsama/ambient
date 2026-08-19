# 19 — a deficit that was built and reverted can say so

**Status:** ready-for-agent · **Blocks:** nothing · **Blocked by:** nothing

*Converted from deficit 24, which DRIVER did not answer.*

`0c7eae3` at **09:55:49** closed deficit 10 — `scripts/slice.ts` (178 lines), a skill, its
symlink, a row in [AGENTS.md](../../../../AGENTS.md), six lines in `slices.md`. `00d9b09` at
**10:01:10** reverted all 318 lines with `git revert`'s default message, and **nothing
anywhere said why.**

**The revert was clean, which is the problem.** It took the record back along with the work,
so the register asserted the entry point had never been attempted — true only by accident. A
reader who found the file learned one thing; a reader who ran `git log` learned another.

**The status vocabulary is the concrete gap.** There is `closed` and there is open. There is
no `retracted`, so there is nowhere to put *built, reverted, and here is what we learned* —
and a deficit attempted once is worth strictly more than one never attempted, because the next
attempt starts from the reason the first came out.

## Done when

- The status vocabulary for a register entry carries `retracted`, meaning built, reverted, and
  the reason recorded.
- The vocabulary lives wherever ticket status now lives —
  [issues.md](../../../rules/issues.md) — since the register itself has become tickets.

## Governed by

- [decisions.md](../../../rules/decisions.md) — *"A silently corrected ADR reads as if the
  design were right first time."* This is that rule applied to the record of what is wrong.
- [issues.md](../../../rules/issues.md) — the `Status:` vocabulary is stated there.
