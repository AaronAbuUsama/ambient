# 02 — `ambient ontology lint`

**Status:** done · **Blocks:** 03, 04 · **Blocked by:** 00, 01

The first complete path: `cli → knowledge → disk → back`. It is the ticket that creates the
`knowledge` module, so it carries the read layer every later verb uses.

**Blocked by 01 for a symbol, not for narrative order:** `knowledge.open` takes
`home.knowledge`, which does not exist until 01.

## What to do

1. `new-module knowledge` — six slots. Its `seams.md` row exists, so it will be accepted.
2. `open(place) → Base`. Builds no path, reads nothing.
3. `base.all() → Document[] | Problems`. Decodes frontmatter through an Effect `Schema`
   ([ADR 006](../../../adr/006-schema-is-the-parse-boundary.md)) so nothing downstream sees
   `unknown`. Collects **every** problem in the base rather than stopping at the first —
   the same reason `home`'s config reader does.
4. `lint(schema, docs) → Violation[]`. **Pure.** Consumes the `Schema` value `home.read()`
   already returns; it does not re-parse `schema.yaml`.
5. `cli.ontology` wires and renders. **No logic** — `cli`'s README forbids it building
   strings, so rendering a `Violation` lives with `failure`.

## Done when

Gate rows **8, 9** of [`spec.md`](../spec.md) pass, plus **1**.

A violation names **the file, the key and the expected form**. `additionalProperties` not
naming the offending key is one of the four gaps measured in OpenKnowledge's own `lint`
([`findings/01`](../findings/01-ok-mcp-read-surface.md)); ours does not get to have it.

## Governed by

[`modules.md`](../../../rules/modules.md) · [`errors.md`](../../../rules/errors.md) — a
failure is a declared value, nothing throws · [`types.md`](../../../rules/types.md) —
external data is `unknown`, narrowed at the boundary · [`legibility.md`](../../../rules/legibility.md)

## Comments

**2026-08-21 — built. `vp check` pass·pass, `vp test` 143 green, `vp run shape` clean.**

`knowledge` exists with all six slots, and `ambient ontology lint` cuts
`cli → knowledge → disk → back`. What each gate row is held by:

| Row | Held by |
|---|---|
| 8 | `cli/ontology.test.ts` — *"names the file, the key and the expected form of a missing required field"*. It writes a `Person` with `source` deleted, then **spawns `src/main.ts`** and pins `{ code: 1, out: "", err: 'person/zeeshan.md: missing key "source" — expected enum(history\|witnessed)\n' }` |
| 9 | the same file — *"exits 0 and prints nothing on a clean base"*, pinning `{ code: 0, out: "", err: "" }` from a real process |
| 1 | `vp check` pass·pass · `vp test` 15 files, 143 tests · `vp run shape` 78 files, 10 modules, clean |

### What was decided, and where a reviewer should look

**1 · `Document` carries `at`, which [`design.md`](../design.md)'s sketch does not.**
`lint` is pure and must name **the file** — gate row 8 — so a document has to know where
it is. Identity is still `(type, name)`; `at` is for a person to read and for a `Violation`
to name, and `types.ts` says so.

**2 · `type` and `name` are the base's own vocabulary, not the ontology's.** No
`schema.yaml` type declares either, and `Commitment` declares **neither** — so requiring
`name` as a field would be impossible for four of the six types, while deriving it from the
filename would make identity a path, which the design forbids. Both are therefore always
known keys. The one measured piece of evidence available —
[`findings/04`](../findings/04-straight-tools-cost.md) §2's
`known:["type","name","aliases",…]` — is identical under either reading, so this is a call,
not a transcription.

**3 · The seam between `all()` and `lint()` is *bytes and syntax* versus *the ontology*.**
`all()` fails on what stops a file being a document at all — unreadable, no `---` fence,
malformed YAML, a missing or non-text `type`/`name`. Everything about content is a
`Violation` from `lint`. One consequence worth knowing: a single nameless file makes `all()`
refuse, so its violations are reported instead of the base's. Every problem in the base is
still collected in one pass; it is the two passes that are ordered.

**4 · One union, one `describe`, for both.** `ViolationDetail` covers `Unreadable`,
`NoFrontmatter` and `Malformed` beside the four ontology arms, because the base's contract
is one sentence and `cli` prints one list. The alternative was two unions and two renderers
for a caller that has no reason to tell them apart.

**5 · `Field = string | readonly string[]`, not `Record<string, unknown>`.** The design's
sketch writes the frontmatter as `Readonly<Record<string, unknown>>`, which anti-slop's
`no-unsafe-dictionary-type` rejects — and `schema.yaml`'s field forms are closed, so the
value space genuinely is one string or a list of them. A value outside it is reported as
`org must be text or a list of text, got "a mapping"` rather than decoded.

**6 · A clean base is `report([])`, not `message(true, "")`.** Gate row 9 says *prints
nothing*, and `main.ts` writes `${said}\n` for a message — a bare newline. An empty report
is `doctor`'s shape for `doctor`'s reason.

**7 · `Malformed.line` counts from the top of the file**, not of the block: the parser sees
the block, the person sees the file, so the opening fence is added back.

**8 · `knowledge`'s YAML decode is its own, not `home`'s.**
[`imports.md`](../../../rules/imports.md) forbids reaching `home/internal/yaml.ts`, so the
issue walk is written again — 12 lines rather than `home`'s 30, because a frontmatter block
is a flat record with no required keys and no excess-property arm.

**9 · The `String(value)` assertion in `internal/documents.ts` is `home`'s, verbatim.**
Same position, same reason, same `SAFETY` comment — `typescript/no-base-to-string` warns
otherwise, and a warning is not pass·pass.

### What is not here

`base.write`, `writeIndex`, `next` and `index` are tickets 03 and 04 and have no symbol in
`types.ts` — no public symbol without a production call site. `.ok/` and every other
dot-directory are skipped by the walk, so OpenKnowledge's scaffold is never read as content.
