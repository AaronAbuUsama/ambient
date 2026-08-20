# 19 — a deficit that was built and reverted can say so

**Status:** done · **Blocks:** nothing · **Blocked by:** nothing

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

## Comments

**2026-08-20 — done.** [`issues.md`](../../../rules/issues.md) § The rule carries `retracted`
in the `Status:` vocabulary, with the one line that makes it a state rather than a label:
built, reverted, and the reason recorded as a `## Comments` entry, without which the ticket is
open again rather than retracted. `wontfix` is named beside it as the ticket that was never
built, because those are the two that get confused.

**The argument lives in § Why, not in the bullet**, and it is the evidence rather than the
principle: 318 lines built and reverted six minutes apart under `git revert`'s default message,
which left the register asserting the entry point had never been attempted. The § Why paragraph
points at deficits 24 and 25 in
[method-deficits.md](../../../history/method-deficits.md) rather than retelling them.

**Nothing checks it, and § The check now says so** — the `Status:` vocabulary is unchecked, and
a retracted ticket's reason is read in the `## Comments` entry that is the evidence.
[legibility.md](../../../rules/legibility.md) rule 2 is why the sentence is there rather than
implied.

**`declined` was not added.** The register's amendment asks for two words —
`retracted` for work tried and pulled, `declined` for a deficit the principal does not accept —
and this ticket's *Done when* names only the first. `wontfix` already holds the second case for
a ticket; whether the register's `declined` needs a word of its own is not this ticket's to
decide.
