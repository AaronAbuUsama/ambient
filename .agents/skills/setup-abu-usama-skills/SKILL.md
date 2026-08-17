---
name: setup-abu-usama-skills
description: How this repo is configured for the skills — where issues live, the Status vocabulary, and where the domain language and decisions are kept. Read when a skill asks for the issue tracker or triage labels, when `docs/agents/issue-tracker.md` is referenced and missing, or before running the engineering skills here for the first time.
---

# Setup — Abu Usama's skills

**This repo is already configured. Nothing to run.** The upstream setup skill asks three
questions and writes `docs/agents/*.md`; every answer here is already settled in
[`docs/rules/`](../../../docs/rules/), which is the authority. This file exists so a skill
looking for that configuration finds the answers rather than a missing file.

Replaces the vendored `setup-matt-pocock-skills`, which is not carried:
[`vendor/README.md`](../vendor/README.md) records why.

## Issue tracker — files in this repo

**There is no remote.** `git remote -v` prints nothing. **Never run `gh`, `glab`, or any
other remote tracker command** — they will fail, or worse, a global default will file the
issue in somebody else's repository.

```
docs/planning/<slice>/scope.md            what is true, and what is still open
docs/planning/<slice>/spec.md             what will be built, incl. Program design
docs/planning/<slice>/issues/NN-<slug>.md one ticket per file, numbered in dependency order
```

`00` is reserved for a ticket that writes no code and unblocks the rest. Blocking edges are
text — a **Blocked by:** line. The full rule is [`issues.md`](../../../docs/rules/issues.md).

*"Publish to the issue tracker"* means write that file. *"Fetch the ticket"* means read it.

## Status vocabulary

A `**Status:**` line near the top of every ticket, one of:

```
needs-triage · needs-info · ready-for-agent · ready-for-human · done · wontfix
```

`ready-for-agent` is the one `plan-slice` writes. `done` is terminal.

## Domain language and decisions

**Single context.** One lexicon at the repo root, one ADR directory.

| | |
|---|---|
| Lexicon | [`CONTEXT.md`](../../../CONTEXT.md) — every domain noun, one meaning, plus the words not to use. Governed by [`language.md`](../../../docs/rules/language.md) |
| Decisions | [`docs/adr/`](../../../docs/adr/), created lazily. A correction is an **amendment**, never a rewrite — [`decisions.md`](../../../docs/rules/decisions.md) |
| Product model | [`docs/design/product.md`](../../../docs/design/product.md) — what each noun *owns*. **Not** the lexicon |

`CONTEXT.md` follows the `CONTEXT-FORMAT.md` in the vendored
[`domain-modeling`](../vendor/domain-modeling/SKILL.md) skill.

## The pipeline these plug into

Work here moves through five steps with a gate each —
[`slices.md`](../../../docs/rules/slices.md), and
[`walkthroughs/slice.md`](../../../docs/walkthroughs/slice.md) is the operator's page:

```
map-slice → work the frontier → plan-slice → new-module · tdd · code-review → close-slice
```

## If a vendored skill disagrees with this file

**This file wins, and so does anything under `docs/rules/`.** The vendored skills were
written for repos with GitHub issues and a `.scratch/` convention. Where one says to run
`gh`, or to write under `.scratch/`, or to create `docs/agents/`, it is describing a repo
that is not this one.
