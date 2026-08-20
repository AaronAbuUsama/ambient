# Issues are files in this repo

## The rule

Specs and issues live under `docs/planning/`. **The remote carries the code and its review,
never the tickets.** `origin` is a GitHub repository and pull requests against it are where
review happens; `gh pr` is how you talk to it. Never run `gh issue`, `glab issue`, or any
other command that files a ticket somewhere this repository cannot read.

- One slice per directory: `docs/planning/<slice>/`, holding `scope.md`, `spec.md` and `issues/`.
- The spec is `docs/planning/<slice>/spec.md`; how it is reached is [slices.md](./slices.md).
- A ticket is one file: `docs/planning/<slice>/issues/NN-<slug>.md`, numbered in dependency
  order. Never a single combined tickets file. **`00` is reserved** for a ticket that writes
  no code and unblocks the rest — IMPORT's was the `seams.md` rows, without which
  `new-module` refuses to scaffold.
- State is a `Status:` line near the top of the ticket — `needs-triage`, `needs-info`,
  `ready-for-agent`, `ready-for-human`, `done`, `wontfix`, `retracted`.
- **`retracted` is built, reverted, and the reason recorded** — the reason as a `## Comments`
  entry saying why the work came out. Without that entry the ticket is not retracted, it is
  open again. `wontfix` is the ticket that was never built.
- **Three of the six are terminal: `done`, `wontfix`, `retracted`.** A ticket in any of them
  is finished with, and step 5 of [slices.md](./slices.md) is over when every ticket in the
  slice reads one of the three. Anything that tests only for `done` holds a slice open on a
  ticket nobody is going to build.
- Conversation appends to the bottom under a `## Comments` heading.

"Publish to the issue tracker" means write that file. "Fetch the ticket" means read it.

## Why

**The reason changed; the rule did not.** Until 2026-08-20 this rested on there being
nothing to talk to — `git remote -v` printed nothing, so `gh issue create` either failed or,
worse, when a global config supplied a default, filed the issue in somebody else's
repository. There is a remote now, and review moved onto its pull requests. The ban on
filing tickets there survives on the next paragraph's reason alone, which was always the
stronger of the two: it never depended on the remote being absent.

**A ticket in the repo travels with the branch that implements it.** It is greppable, it
diffs, it is reviewed alongside the code, and its history is the same history. A ticket
in a remote tracker is a second source of truth that has to be kept in sync by hand,
which is the drift this repo has already paid for once.

**One file per ticket, because a combined file merges badly.** Two agents editing two
tickets in one document conflict on every line; two files do not conflict at all. It is
also what makes `Status:` greppable across a feature.

**A clean revert takes the record back along with the work.** 318 lines were built and
reverted six minutes apart under `git revert`'s default message, and the register they came
out of then asserted the thing had never been attempted — true only by accident, and two
answers alive in two places. That is deficits 24 and 25 in
[method-deficits.md](../history/method-deficits.md). `retracted` is where the reason goes
instead, and it is worth the word: an attempt made once is worth strictly more than one never
made, because the next attempt starts from why the first came out.

## The check

`git remote -v` prints one line — `origin`, a GitHub repository. The rule no longer depends
on that being empty, and a check that asserts it is empty is now a check that fails.

`vp run shape` verifies that any document linking to a spec or ticket links to a file
that exists.

That no agent files a ticket on the remote is **not currently checked**, and neither is the `Status:`
vocabulary — that a `retracted` ticket carries its reason is read, in the `## Comments`
entry that is the evidence.
