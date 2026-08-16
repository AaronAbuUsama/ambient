# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files under `docs/planning/`.

No git remote exists for this repo — there is no GitHub or GitLab tracker to call. Never
run `gh issue create`, `glab issue create`, or any remote tracker command. Everything is
files in this repo.

## Conventions

- One feature per directory: `docs/planning/<feature-slug>/`
- The spec is `docs/planning/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at
  `docs/planning/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` — never a single
  combined tickets file
- Triage state is recorded as a `Status:` line near the top of each issue file (see
  `triage-labels.md` for the role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments`
  heading

`docs/planning/` is where work in flight lives. It is a sibling of `docs/grills/`
(stress-tested decisions) and `docs/research/` (evidence) — see [README.md](../../README.md)
for the full doc map.

## When a skill says "publish to the issue tracker"

Create a new file under `docs/planning/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue
number directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `docs/planning/<effort>/map.md` — the Notes / Decisions-so-far / Fog body.
- **Child ticket**: `docs/planning/<effort>/issues/NN-<slug>.md`, numbered from `01`, with
  the question in the body. A `Type:` line records the ticket type
  (`research`/`prototype`/`grilling`/`task`); a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every
  file it lists is `resolved`.
- **Frontier**: scan `docs/planning/<effort>/issues/` for files that are open, unblocked,
  and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then
  append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.

## PRs as a request surface

Off. There is no remote, so there are no pull requests to triage.
