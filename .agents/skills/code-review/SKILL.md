---
name: code-review
description: Review a diff against this repository's own contract on three axes — Standards (docs/rules/), Spec (the slice's spec.md and the ticket) and Shape (design.md and seams.md). Three parallel sub-agents, three headings, no reranking. Use when closing a build ticket, reviewing a branch or work in progress, or asked to review the changes since a fixed point.
---

# Review a diff, on three axes

What closes a build ticket at step 5 of [`slices.md`](../../../docs/rules/slices.md), after
`tdd`. It reads a diff plus one list of files per axis, and it writes nothing.

**Ours rather than [the vendored copy](../vendor/code-review/SKILL.md)**, which looks for
standards in `CODING_STANDARDS.md` or `CONTRIBUTING.md` and for the spec in issue references
fetched through a tracker. Neither file exists here, the remote is a GitHub repository and
not a tracker — [`issues.md`](../../../docs/rules/issues.md) — and neither of its two axes
reads a design.

| Axis | Reads, beside the diff | Asks |
|---|---|---|
| **Standards** | [`docs/rules/`](../../../docs/rules/) | does the diff hold the rule it is working under |
| **Spec** | `docs/planning/<slice>/spec.md`, and the ticket | is this what was asked for, and only that |
| **Shape** | `docs/planning/<slice>/design.md`, [`seams.md`](../../../docs/design/seams.md) | is the behaviour where the design put it, and did the topology drift |

**Shape is disjoint from Spec by rule.** The spec *"does not restate the design"*
([`slices.md`](../../../docs/rules/slices.md)) — the two artefacts are written to be
different, so the two axes are given different files and never the same question.

## 1 · Pin the fixed point

Whatever the user said — a SHA, a branch, a tag, `HEAD~5`. If they did not say, ask.

```bash
git rev-parse <fixed-point>                 # it resolves, or stop here
git diff <fixed-point>...HEAD               # three-dot: against the merge-base
git log <fixed-point>..HEAD --oneline       # the commit list
```

A bad ref or an empty diff fails here, not inside three sub-agents.

## 2 · Find the three axes' inputs

The slice is named by the ticket the commits reference, or by the branch, or by **You are
here** in [`roadmap.md`](../../../docs/design/roadmap.md). Then:

- **Standards** — the rule files under [`docs/rules/`](../../../docs/rules/), by path.
  Hand the sub-agent the paths, not the contents: [`AGENTS.md`](../../../AGENTS.md) is
  written for progressive disclosure, and *"read the rule you are about to work under"* is
  the instruction, not *read all twelve*.
- **Spec** — `docs/planning/<slice>/spec.md`, plus the ticket file under `issues/`. The
  ticket's **Done when** is what this diff was for; the spec's gate is what the slice was for.
- **Shape** — `docs/planning/<slice>/design.md`: its call graph, its interfaces and its
  conformance table. Plus [`seams.md`](../../../docs/design/seams.md).

**A missing input is reported, never guessed.** Skip that axis, and say in the report which
file was absent.

## 3 · Subtract what tooling already enforces

Paste this list into all three briefs. Every line of it is already printed by a command, so
a finding that repeats one spends the review's words on what `vp check` says for free.

**`vp check` — 21 oxlint rules at `error`** ([`vite.config.ts`](../../../vite.config.ts)):

- `typescript/no-explicit-any` — no `any`, anywhere.
- `contract/file-length` — 250 lines, against the declared exception list.
- `contract/no-throw` — a `throw` **statement** outside `*.test.ts` and `testing.ts`. The
  word in a comment or a string is prose and does not fire.
- `contract/no-relative-escape` — `../..` in an import specifier.
- `contract/no-foreign-internal` — another module's `internal/`, from outside it.
- `vite-plus/prefer-vite-plus-imports`.
- 15 anti-slop rules: `no-chained-type-assertions`, `no-conditional-empty-object-spread`,
  `no-known-value-widening`, `no-module-mocking`, `no-object-parameters`, `no-reflect-apply`,
  `no-reflect-get`, `no-runtime-typeof`, `no-shape-in-symbol-names`, `no-unknown-parameters`,
  `no-unknown-returns`, `no-unknown-type-aliases`, `no-unsafe-dictionary-type`,
  `no-widen-then-assert`, `require-safety-comment-for-type-assertion`.

**`vp check` — tsc** ([`tsconfig.json`](../../../tsconfig.json)): `strict`, `noUnusedLocals`,
`noUnusedParameters`, `noFallthroughCasesInSwitch`, `erasableSyntaxOnly`,
`verbatimModuleSyntax`, and type-aware lint over the same files.

**`vp run shape`** ([`scripts/shape.ts`](../../../scripts/shape.ts)) — four assertions:

- a length-exception row naming a source file that no longer exists;
- every module under `src/modules/` has all six slots;
- every module — a directory under `src/modules/`, or a name in a `design.md` § Seam delta —
  owns a row in `seams.md`;
- every `](…)` in every `.md` resolves.

**`vp test`** — `home.test.ts` gate 16: `path.join`, `path.resolve` and `__dirname` appear
nowhere under `src/` outside `src/modules/home/`. Gate 18: no `throw` statement outside
tests, read off the syntax tree.

**And what it does not touch, which is the whole of this skill's job.** Seven of the twelve
rules — `language`, `slices`, `effect`, `knowledge`, `issues`, `decisions`, `artefacts` —
have no mechanical check on any clause, and all twelve have at least one clause nothing runs.
Each rule says so at its own foot, under **The check**.

**This list is measured, not remembered.** *Instruments:*
`grep -cE '^\s+"[a-z-]+/[a-z-]+": "error"' vite.config.ts` → 21, and `scripts/shape.ts` read
top to bottom, on 2026-08-20. A change that adds or removes a check corrects this list in the
same commit — a review that skips a finding no command makes is worse than no review.

## 4 · Dispatch three sub-agents, in parallel

Separate contexts, so no axis pollutes another. Each gets the diff command, the commit list,
its own file paths from step 2, and the subtraction from step 3.

**Standards.** *"Report, per file or hunk: every place the diff breaks a rule in
`docs/rules/`. Open the rule the diff is working under and cite it by file and clause — do
not review from memory of it. Then any smell from the baseline in
`.agents/skills/vendor/code-review/SKILL.md`, named and quoted. A documented rule here
overrides that baseline, and `modules.md`'s three depth tests are this repository's override
of Middle Man, Speculative Generality and Feature Envy. A rule breach can be hard; a smell is
always a judgement call. Report nothing on the subtraction list. Under 400 words."*

**Spec.** *"Report: (a) what the ticket's **Done when** asked for that the diff does not do;
(b) behaviour in the diff that nothing asked for; (c) a requirement that looks implemented
but is wrong. Quote the spec or ticket line for each finding. Under 400 words."*

**Shape.** *"Report: (a) behaviour the diff put somewhere other than where `design.md` says
it goes — name the step in the call graph and the module the design gave it to; (b) a public
symbol this diff exports with no production caller in the same diff — `design.md`'s
conformance table is where its caller was already written down; (c) a handler drifting toward
being the composition root — the signal is a file this diff grows far past its siblings.
`import`'s handler reached 176 lines against 8, 8, 12 and 14; by close time it is simply a
large file, and only the diff that grew it from 14 shows the growth. A divergence is not
automatically a failure — the code may be right and the design wrong — but say which, out
loud. Under 400 words."*

(b) and (c) are [`definition-of-done.md`](../../../docs/design/definition-of-done.md) row
10's second and third questions, asked in the diff rather than at close.

## 5 · Report

Three headings — `## Standards`, `## Spec`, `## Shape` — verbatim or lightly cleaned. **Do
not merge or rerank.** End with one line: findings per axis, and the worst issue *within*
each. Never a single winner across axes; that reranking is what the separation exists to
prevent.

## Why three

A change can pass one axis and fail another, and each masks the other if they are merged:

- follows every rule, implements the wrong thing → **Standards pass, Spec fail**;
- does what the ticket asked, breaks a rule → **Spec pass, Standards fail**;
- does what the ticket asked, in the wrong module → **Spec pass, Shape fail.** This is the
  one no green check catches. IMPORT passed every row it had while its topology was wrong.

The three artefacts are written to be disjoint: `docs/rules/` says how code is written,
`spec.md` says what the slice is for, `design.md` says where behaviour lives.

## What is not an axis

**Record — deliberately not built.** A fourth axis reading `docs/adr/` and the **Decided —
do not re-litigate** list in [`AGENTS.md`](../../../AGENTS.md), asking whether the diff
contradicts a decision and whether the contradiction was written as an amendment.

Its stronger half is already owned twice over:
[`decisions.md`](../../../docs/rules/decisions.md) requires the contradiction to be said in
the change that causes it, and
[`definition-of-done.md`](../../../docs/design/definition-of-done.md) row 9 asserts at close
that every one was written up. A fourth axis would be a second authority over one statement.

Recorded here so it is not rediscovered as new.
