# 03 — the work queue and the derived index

**Status:** done · **Blocks:** nothing · **Blocked by:** 00, 01, 02

Two verbs, one ticket, because both are pure functions over the list `base.all()` already
returns and neither is a complete path on its own.

**The work queue is a frontmatter status and nothing more.** That is what lets a quiet day be
cheap: nothing unreviewed, nothing printed, nothing spent.

## What to do

1. `next(docs, { type, limit }) → Document[]`. **Pure.** Filters `status: unreviewed`.
2. `index(docs) → Index`. **Pure.** The derived read model — frontmatter is truth, this is
   disposable, and deleting it must reproduce it exactly.
3. `base.writeIndex(index)` — writes to `home.index`, **outside** the knowledge base, as a
   single `rename`.
4. `cli.ontology` grows two subcommands and no logic.

## Done when

Gate rows **10, 11** of [`spec.md`](../spec.md) pass.

Row 11 is the one with teeth: delete the index, re-run, and the bytes must be identical. An
index that is not reproducible is not derived, and the whole argument for it being disposable
collapses.

## Governed by

[`modules.md`](../../../rules/modules.md) · [`errors.md`](../../../rules/errors.md) ·
[`legibility.md`](../../../rules/legibility.md)

## Comments

**2026-08-21 — built. Gate rows 10 and 11 pass.**

`next` and `index` are pure functions in `service.ts`; the only effect is `writeIndex`,
which builds on a new `internal/index.ts` (`buildIndex` + a temp-then-rename write). `cli.ontology`
grows `next` and `index` subcommands with no logic of its own — argv shape and rendering only,
rendering delegated to two new `knowledge` describe functions (`describeDocument`,
`describeIndexFailure`), matching how `lint` already does it.

Row 10 is asserted directly on `next` (pure, literal `Document`s, no fixtures) in
[`next-and-index.test.ts`](../../../../src/modules/knowledge/next-and-index.test.ts), and
end-to-end via `ambient ontology next --type=person --limit=20` in
[`cli/ontology.test.ts`](../../../../src/modules/cli/ontology.test.ts).

Row 11 — the one with teeth — is asserted twice, both on raw bytes, never a parsed object:
once in `next-and-index.test.ts` by writing the index through `writeIndex`, deleting
`home.index.path`, rebuilding from the same on-disk base, and asserting
`Buffer.equals()` between the two reads; once more end-to-end in `cli/ontology.test.ts` by
spawning `ambient ontology index` twice with a real `fs.rmSync` of `index.json` in between and
comparing the two files' raw `Buffer`s the same way.

**Four judgement calls a reviewer should check.**

1. **`writeIndex` is not a `Base` method.** The ticket and `design.md`'s sketch both write
   `base.writeIndex(index)`. `Base`'s own invariant 1 (`knowledge/README.md`) is that the
   `Place` it was opened with — `home.knowledge` — is the whole grant; `home.index` is a
   different `Place`, outside that grant on purpose (`design.md` § B2). Hanging a method that
   needs an unrelated `Place` off a handle whose contract is "this Place is everything" felt
   like the wrong shape, so `writeIndex(place, index)` is a standalone export instead, called
   as `knowledge.writeIndex(home.index, knowledge.index(docs))`. This also means `Open`'s
   signature (`(place: Place) => Base`) is untouched, which keeps ticket 04's calls to
   `knowledge.open(home.knowledge)` unaffected.
2. **`Index`'s shape is invented, not specified.** Neither the ticket nor `design.md` (its own
   `Index` type sketch is self-referential — a function type named `Index` returning `Index` —
   and the file says the caller section is "a sketch, step 5 will rewrite it") fixes what the
   derived read model holds. `findings/04-straight-tools-cost.md` describes the spike's
   `derive.ts` as "rows, counts, backlinks", built with a `Schema` param this ticket's
   `index(docs) → Index` signature does not have. Chose the minimal reading: `{ documents:
   IndexRow[], counts: Record<type, number> }` — one row per document (`at`, `type`, `name`)
   plus a count per type. No backlinks: resolving `ref` fields needs the `Schema` to know which
   keys are refs, `index` is not handed one, and nothing in this ticket (`query` is out of
   scope) consumes them yet.
3. **`next`'s `type` filter is case-insensitive inside `next` itself**, not translated by the
   CLI. `--type=person` must reach `Document.type === "Person"`; doing that translation in
   `cli.ontology` would be exactly the "logic" the ticket says it must not have, and a
   `Person → person` folder-naming table belongs to `write` (ticket 04), not the queue. So
   `next` compares `document.type.toLowerCase() === query.type.toLowerCase()`, and the CLI
   passes the raw flag straight through.
4. **`writeIndex`'s failure is a new `IndexProblem`/`IndexFailure`, not a reused `Violation`.**
   `knowledge`'s own stated principle is one union rather than one per failure class, but
   `Violation.at` is documented as base-relative (`person/zeeshan.md`) — `index.json` lives
   outside the base entirely, so forcing it through `Violation` would misuse a field whose
   contract is specifically about paths inside the base. `IndexProblem` is two lines
   (`{ cause: string }`, wrapped in `Problems<…>`) and follows the same `"problems" in result`
   narrowing as everywhere else. `next-and-index.test.ts` lives beside `knowledge.test.ts`
   rather than inside it — appending gate rows 10 and 11 to that file pushed it to 388 lines,
   over the 250-line cap, and it is not one of the two declared exceptions in
   [`legibility.md`](../../../rules/legibility.md).

**`~/.ambient` was not touched.** Every test runs against `fs.mkdtemp`; the CLI-level rows
additionally spawn `main.ts` with `AMBIENT_HOME` pointed at a temp root.
