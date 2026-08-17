# Issues are files in this repo

## The rule

Specs and issues live under `docs/planning/`. **There is no git remote.** Never run `gh`,
`glab`, or any other remote tracker command — there is nothing for them to talk to.

- One slice per directory: `docs/planning/<slice>/`, holding `scope.md`, `spec.md` and `issues/`.
- The spec is `docs/planning/<slice>/spec.md`; how it is reached is [slices.md](./slices.md).
- A ticket is one file: `docs/planning/<slice>/issues/NN-<slug>.md`, numbered in dependency
  order. Never a single combined tickets file. **`00` is reserved** for a ticket that writes
  no code and unblocks the rest — IMPORT's was the `seams.md` rows, without which
  `new-module` refuses to scaffold.
- State is a `Status:` line near the top of the ticket — `needs-triage`, `needs-info`,
  `ready-for-agent`, `ready-for-human`, `done`, `wontfix`.
- Conversation appends to the bottom under a `## Comments` heading.

"Publish to the issue tracker" means write that file. "Fetch the ticket" means read it.

## Why

**There is no remote to publish to.** `git remote -v` prints nothing. A skill that
reaches for `gh issue create` here either fails, or — worse, when a global config
supplies a default — files the issue in somebody else's repository.

**A ticket in the repo travels with the branch that implements it.** It is greppable, it
diffs, it is reviewed alongside the code, and its history is the same history. A ticket
in a remote tracker is a second source of truth that has to be kept in sync by hand,
which is the drift this repo has already paid for once.

**One file per ticket, because a combined file merges badly.** Two agents editing two
tickets in one document conflict on every line; two files do not conflict at all. It is
also what makes `Status:` greppable across a feature.

## The check

`git remote -v` prints nothing — the state the rule depends on.

`vp run shape` verifies that any document linking to a spec or ticket links to a file
that exists.

That no agent types `gh` is **not currently checked**.
