# `knowledge`

The knowledge base on disk — the layout, the frontmatter codec and validation
against the ontology. **Files, not a client**
([ADR 007](../../../docs/adr/007-knowledge-is-files-not-a-client.md)): nothing here
spawns `ok`, opens a socket or knows a path.

Read [`types.ts`](./types.ts) first. It is the whole interface.

## What it owns

| Thing | What `knowledge` says about it |
|---|---|
| the layout | a document is a `.md` file with a YAML frontmatter block, anywhere under the base. `.ok/` is OpenKnowledge's own scaffold and is never read |
| the codec | the block decodes through an Effect `Schema`, so nothing downstream of `all()` sees `unknown` ([ADR 006](../../../docs/adr/006-schema-is-the-parse-boundary.md)) |
| identity | `(type, name)`, read out of the frontmatter. **Never the path** — refusing by filename silently duplicates |
| validation | `lint` checks one document's frontmatter against the `Schema` value `home.read()` already returns. It does **not** re-parse `schema.yaml` |

It depends on `home` — for a `Place` and for the parsed ontology — and on
`failure`, and on nothing else. That is deliberate: it is the module every later
pass writes through, and the thing it must never grow is knowledge of where its
input came from.

```
ambient ontology lint  →  knowledge.open(home.knowledge).all()  →  knowledge.lint(global.schema, docs)
```

## Invariants

1. **`open` builds no path and reads nothing.** The `Place` is the whole grant,
   exactly as it is for [`blobs`](../blobs/README.md).
2. **`all()` collects every problem in the base**, never the first. A person
   repairing a base gets the whole list at one time — the same reason `home`'s
   config reader does it.
3. **`lint` is pure.** A list in, a value out: no I/O, no clock, no model. It is
   handed the ontology; it never opens `schema.yaml`.
4. **Every violation names the file, the key and the expected form.**
   OpenKnowledge's own `lint` reports `additionalProperties` without saying which
   property — one of the four gaps measured in
   [`findings/01`](../../../docs/planning/knowledge/findings/01-ok-mcp-read-surface.md).
   Ours has the frontmatter and the schema in the same function, so it has no
   excuse.
5. **`type` and `name` are the base's vocabulary, not solely the ontology's.** No type
   declares `type`. Three of the six declare `name` — `Person`, `Organization`, `Chat` —
   and `Commitment`, `Issue` and `Media` do not, so `name` cannot be only an ontology
   field: a Commitment still has one, because identity is `(type, name)` and never a path.
   Both are therefore always **known**, which is not always optional — where a type
   declares `name`, that declaration is in `declared.fields` and `lint` still requires it.
6. **Nothing throws.** Every failure is a `ViolationDetail` in
   [`types.ts`](./types.ts), and one `describe` renders every arm.

## How to test it

```
vp test src/modules/knowledge
```

[`knowledge.test.ts`](./knowledge.test.ts) drives the interface only. **The
ontology is never a fixture:** every test converges a real home in a temp
directory and reads `global.schema` back through `home`, so `lint` is checked
against the ontology this repository actually ships — `enum(history|witnessed)`
is `schema.yaml`'s text, not the test's.

Gate rows 8 and 9 of
[`docs/planning/knowledge/spec.md`](../../../docs/planning/knowledge/spec.md) are
about a command line rather than about this module, so they live in
[`../cli/ontology.test.ts`](../cli/ontology.test.ts), which spawns `src/main.ts`
— *"exits 0 and prints nothing"* is a claim about a process.

## Inside

| File | What it knows |
|---|---|
| `types.ts` | the interface: `Document`, `Base`, `Violation`, and every way it refuses |
| `service.ts` | binds a `Place` to `all`, `lint`, and how a `Violation` reads |
| `internal/documents.ts` | the walk, the `---` fence, and the frontmatter codec. The only file here that opens anything |
| `internal/lint.ts` | one document's frontmatter against one `SchemaType` |
