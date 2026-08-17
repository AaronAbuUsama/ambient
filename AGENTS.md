# Engineering contract

Enforced on every session in this repo. This file is the index; each rule lives in one
file under [`docs/rules/`](docs/rules/), stated as **the rule**, **why**, and **the
check that enforces it**. Read the rule you are about to work under — the *why* is what
you need when the rule runs out, and it is short.

No rule is stated twice. If two documents disagree, the one under `docs/rules/` is the
rule.

## The rules

| Rule | In one line |
|---|---|
| [language.md](docs/rules/language.md) | One word, one meaning. The lexicon is [CONTEXT.md](CONTEXT.md); it defines and never decides. |
| [modules.md](docs/rules/modules.md) | Every module has all six slots; `main.ts` is the composition root and sits outside them. |
| [imports.md](docs/rules/imports.md) | Name the module — `~/modules/<name>/…`, never `../..`, never another module's `internal/`. |
| [errors.md](docs/rules/errors.md) | A failure is a declared value in `types.ts`. Nothing throws. |
| [types.md](docs/rules/types.md) | No `any`. External data is `unknown`, narrowed at the boundary. |
| [effect.md](docs/rules/effect.md) | Not using Effect yet; written so it lands at the work layer and nowhere else. |
| [legibility.md](docs/rules/legibility.md) | 250 lines a file, exceptions declared with a reason — and a rule that cannot be run is not a rule. |
| [knowledge.md](docs/rules/knowledge.md) | We match OpenKnowledge's format and never call its CLI. |
| [issues.md](docs/rules/issues.md) | Specs and issues are files under `docs/planning/`. There is no remote; never `gh`, never `glab`. |
| [decisions.md](docs/rules/decisions.md) | Decisions are ADRs. A correction is an amendment, never a rewrite. |
| [artefacts.md](docs/rules/artefacts.md) | Anything generated for a human to read is designed with the design skills, never defaulted. |

Three commands check them: `vp check`, `vp test`, `vp run shape`. What each rule is
checked by is stated at the foot of its own file, and *"not currently checked"* is
written where nothing does.

## Closing an area

[docs/design/definition-of-done.md](docs/design/definition-of-done.md) — every row a
command or an observable state. An area is not closed until all of them pass.

## Where the truth is

[README.md](README.md) is the doc map. [`docs/design/`](docs/design/) is what is true
now; [`docs/history/`](docs/history/) is how we got here and defers to it.
[`docs/design/roadmap.md`](docs/design/roadmap.md) is the anchor — where we are, what is
settled, what breaks if you go backwards.

**The words come first.** [CONTEXT.md](CONTEXT.md) is the lexicon — one entry per domain
noun, one or two sentences, plus the words not to use for it. It is the file to read before
writing anything, and the file to edit in the same change that invents a noun. It is
**not** the product model: what each noun *owns*, and what is settled or open about it, is
[`docs/design/product.md`](docs/design/product.md); which modules exist is
[`docs/design/seams.md`](docs/design/seams.md). One statement, one home —
[language.md](docs/rules/language.md) has the table.

**An area is not a module.** [`docs/design/roadmap.md`](docs/design/roadmap.md) names areas
of work; [`docs/design/seams.md`](docs/design/seams.md) names modules. They do not map one
to one and never have: SKELETON was one area and produced two modules, `cli` and `home`,
with no `skeleton` module. Do not create a module named after an area.

## Decided — do not re-litigate

- **`cwd` is the chat's own folder.** That scopes its skills and its writes. No conflict
  with one shared knowledge base, because OpenKnowledge is addressed over MCP, not by
  path.
- **The knowledge base and the chat folders are separate trees.** A chat folder is a
  runtime instance directory, not knowledge; it sits outside the OK content dir.
- **No separate graph store.** Entities are OK documents with typed frontmatter. The
  ontology tool is a validator, a queue and an indexer — never a CRUD layer, because
  OpenKnowledge already is one.
- **Shape before content.** Conventions exist in code before anything writes into them.
- **Operate it by hand until it is good, then automate.** Pi comes last, not first.

Contradicting one of these, or an ADR, is allowed — silently is not. How a correction is
recorded is [decisions.md](docs/rules/decisions.md).

## Project skills

[`.claude/skills/`](.claude/skills/) — `close-area` runs the definition of done and
updates the roadmap; `new-module` scaffolds a module's six slots.
