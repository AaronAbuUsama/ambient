# KNOWLEDGE — design

Step 2 of [`slices.md`](../../rules/slices.md), written 2026-08-20 against
[`scope.md`](./scope.md). **No production code was written in this session.** The caller
below is a sketch, and step 5 will rewrite it.

Its job was to make the frontier askable. Three questions were left for the principal at the
map, and two of them — `G3` and `G4` — could not be put to him without something to react to.
They anchored into **Branch points** at the foot of this file, were grilled as one round on
2026-08-20, and are **answered**. What each was asked with, and what killed the shapes that
lost, is recorded there rather than in a transcript.

---

## The two shapes, and the caller that kills one

The bar for `DESIGN-IT-TWICE` in [`seams.md`](../../design/seams.md) is an interface
**written through by many callers *and* hard to change later**. One thing here meets it, and
it is not the ontology verbs.

**Who reads the Transcript and turns it into documents?** [`seams.md`](../../design/seams.md)
gives `knowledge` *"the OpenKnowledge project and the ontology — frontmatter validation, the
work queue, the derived index"*. It says nothing about reading a Transcript, and the
dependency graph has no `knowledge → transcript` edge. So the mechanical stub pass has no
owner today.

### Shape A — `knowledge` reads the Transcript

```ts
const base = knowledge.open(home.knowledge, global.schema)
const report = await base.stubFromChat(chat.transcript())   // knowledge grows a transcript dep
```

### Shape B — a separate operation owns the order, as `import` and `ingest` do

```ts
const report = await observe.run({ lines, base, schema })    // a new module, one call
```

**The caller kills A.** Written out, `stubFromChat` has to open a Transcript, decode its
lines, decide which senders are new, derive a name for each, write documents, and report
what it refused. That is an *operation*, and this repository already has a name for the
module that owns one: [`import.md`](../../walkthroughs/import.md) —
*"`import` owns the order of the writes… `archive` reads, `transcript` appends, `blobs`
stores — none knows the others exist."*

Putting it in `knowledge` would make `knowledge` the third thing that both reads a Transcript
and writes elsewhere, and it is the module every later pass writes through. That is the
deletion test failing.

**B, and the module is named `observe`** — decided in this session as `B1`, because
`vp run shape` refuses a design naming a module with no [`seams.md`](../../design/seams.md)
row. The word is not invented: [product.md](../../design/product.md) and
[thesis.md](../../design/thesis.md) both already read *"Sources → observations →
knowledge"*. [`language.md`](../../rules/language.md) rule 2 is satisfied by the
**Observation** entry this change added to [`CONTEXT.md`](../../../CONTEXT.md).

**Everything else is sketched once.** `lint`, `next` and `index` are pure functions over a
list of documents with one caller each; two shapes for them would be theatre.

---

## The caller

From the verb as `main.ts` reaches it. **Failure branches included** — a caller with only
the happy path hides the decisions this step exists to expose
([`errors.md`](../../rules/errors.md): a failure is a declared value, nothing throws).

### `ambient ontology lint`

```ts
const home = openHome(root)                        // Home | HomeProblem
if ("_tag" in home) return home                    // a value, never a throw

const global = home.read()                         // Global | HomeProblem — carries `schema`
if ("_tag" in global) return global                // Global.schema is ALREADY the parsed
                                                   // ontology: home/internal/schema.ts:55

const base = knowledge.open(home.knowledge)        // Base — a handle over the Place.
                                                   // home.knowledge is the ONE new line
                                                   // in `home`. ADR 007.

const docs = await base.all()                      // Documents | ReadFailure
if ("problems" in docs) return docs                // unreadable file, bad frontmatter, escape

return knowledge.lint(global.schema, docs)         // Violation[] — PURE. no I/O, no clock.
```

### `ambient ontology next --type=person --limit=20`

```ts
const docs = await base.all()
if ("problems" in docs) return docs
return knowledge.next(docs, { type, limit })       // Document[] — pure. The work queue is a
                                                   // frontmatter status, nothing more.
```

### `ambient ontology index`

```ts
const docs = await base.all()
if ("problems" in docs) return docs
const index = knowledge.index(docs)                // Index — pure, derived, disposable
return await base.writeIndex(index)                // Written | WriteFailure   ← branch point B2
```

### The mechanical pass — the tracer bullet

```ts
const chat = home.chat(slug)                       // ChatHandle — pure and total
const place = chat.transcript()                    // Place | HomeProblem
if ("_tag" in place) return place

const lines = await transcript.read(place)         // Line[] | ReadFailure
if ("problems" in lines) return lines

const base = knowledge.open(home.knowledge)
const existing = await base.all()
if ("problems" in existing) return existing

// ── mechanical: only what a script cannot be wrong about ──────────────────
const found = observe.from(lines)                  // Observation[] — PURE. no model, no clock.
                                                   // An Observation is (type, name, frontmatter).
const fresh = observe.unseen(found, existing)      // Observation[] — pure. Identity is
                                                   // (type, name), NEVER a path: writing by
                                                   // filename silently duplicates.

// ── the one write, and it may refuse ──────────────────────────────────────
return await base.write(global.schema, fresh)      // Wrote | Refused[]
                                                   // Refused is a VALUE. product.md, Settled:
                                                   // the tool validates and refuses rather
                                                   // than writing something malformed.
```

**Notice what the caller does not do.** It does not merge two labels into one human, resolve
a relative date, or decide who a person is. Every one of those is reasoning, and
[`knowledge-flow.md`](../../design/knowledge-flow.md) is the rule: *"anything a script can be
wrong about, a script must not do."*

`scope.md` row 27 found the line running **backwards** in two places — which participant is
the Principal is answerable by `grep`, and sticker-versus-screenshot by a header parse. Both
are therefore `observe.from`'s job, and both are `B3`.

---

## Call graph

```
src/main.ts                        resolves $AMBIENT_HOME, prints, exits. The only file
  │                                that reads the environment.
  └─ cli.run(argv, root)
       ├─ cli.ontology             argv → args. Renders the outcome. NOTHING ELSE.
       │    ├─ home.read()              Global — carries the parsed `schema`
       │    ├─ knowledge.open           home.knowledge → a Base handle
       │    ├─ base.all()               every Document + its frontmatter
       │    └─ knowledge.lint|next|index   PURE. list in, value out.
       │
       └─ cli.observe               ← THE OPERATION. Owns the order of the writes.
            ├─ home.chat(slug)          the Chat, or refuse and name `chat add`
            ├─ chat.transcript()        a Place. `cli` never builds a path.
            ├─ transcript.read          Lines. `transcript` already owns the codec.
            ├─ observe.from             Lines → Observations. Pure.
            ├─ observe.unseen           minus what the Base already holds. Pure.
            └─ base.write               validate, refuse, or write. THE one Write path.
```

**Ownership**, which is the half a diagram usually omits:

| Step | Owner | Why not somewhere else |
|---|---|---|
| argv → args | `cli` | the only module that has seen a command line |
| the parsed ontology | `home` | it already does it — `readSchema` at `home/internal/schema.ts:55` returns `Schema = { types: SchemaType[] }`. KNOWLEDGE **consumes that value and does not re-parse the file** |
| every path | `home` | ADR 001's escrow rule. `home.knowledge` is a `Place`, matching `blobs` exactly |
| decoding a Transcript line | `transcript` | it owns the format, and [ADR 006](../../adr/006-schema-is-the-parse-boundary.md) made its codec canonical |
| Lines → Observations | `observe` | mechanical extraction is not the Base's job, and it is not `transcript`'s either |
| **the order of the writes** | `observe` | `transcript` reads, `knowledge` writes, neither knows the other exists — the same argument that gave `import` and `ingest` their modules |
| validate-or-refuse | `knowledge` | the settled requirement lives with the writer, so **no caller can route around it** |
| rendering a Violation | `failure` + `cli` | `cli`'s README forbids it building strings |

---

## Interfaces

**Read back off the caller above. Nothing here was invented ahead of a call site**, and every
symbol below appears in one.

```ts
// knowledge/types.ts — THE interface.

/** A document as it exists on disk: typed frontmatter plus its prose. */
export type Document = {
  readonly type: string          // a type name from schema.yaml
  readonly name: string          // the identity half. NOT the path.
  readonly frontmatter: Readonly<Record<string, unknown>>   // unknown: external data
  readonly body: string
}

/** What the mechanical pass proposes. No prose — reasoning writes that later. */
export type Observation = {
  readonly type: string
  readonly name: string
  readonly frontmatter: Readonly<Record<string, unknown>>
}

/** A handle over the knowledge base. `open` builds no path and reads nothing. */
export type Base = {
  all(): Promise<readonly Document[] | Problems>
  write(schema: Schema, os: readonly Observation[]): Promise<WriteReport>
  writeIndex(index: Index): Promise<Written | Problems>
}

export type WriteReport = {
  readonly wrote: readonly string[]        // (type, name) pairs, rendered
  readonly refused: readonly Refusal[]     // a VALUE. Never a throw.
}

export type Refusal = {
  readonly at: string                      // `${type}/${name}`
  readonly why: ProblemDetail              // reuses `failure`'s shape — doctor already prints it
}

// PURE — a list in, a value out. No I/O, no clock, no model.
export type Lint  = (schema: Schema, docs: readonly Document[]) => readonly Violation[]
export type Next  = (docs: readonly Document[], q: Query) => readonly Document[]
export type Index = (docs: readonly Document[]) => Index
```

```ts
// observe/types.ts — the operation.
export type From = (lines: readonly Line[]) => readonly Observation[]
export type Unseen     = (found: readonly Observation[],
                          held: readonly Document[]) => readonly Observation[]
```

**`home`'s one new line**, beside the property that already has this exact shape:

```ts
/** → the `blobs` module. A property, not a `Grant`: the root has no name to be wrong. */
readonly blobs: Place
/** → the `knowledge` module. Same reasoning. */
readonly knowledge: Place        // ← disk.ts:51 already computes it; it is merely unexported
```

**No public symbol without a production call site in this document.** `transcript` shipped
`from: "live"` variants nothing originated because no gate looked
([ADR 004 amendment 1](../../adr/004-transcript-line-is-a-union-on-provenance.md)); the
conformance table below is that gate.

---

## Seam delta

Rows for [`seams.md`](../../design/seams.md), written here because `new-module` refuses a
module with no row.

**One row changes.** `knowledge`'s current row says *"Hides the OK MCP client"*, which
[ADR 007](../../adr/007-knowledge-is-files-not-a-client.md) retired:

| Module | Owns | Interface is about | Effect |
|---|---|---|---|
| `knowledge` | The knowledge base on disk: the layout, the frontmatter codec, validation, the work queue and the derived index. **Hides the layout and the codec** — nothing else knows a document is a file. **Validates on write and refuses**, so no caller can route around the ontology. | `all · write · writeIndex` · `lint · next · index` | no |

**One row is added:**

| Module | Owns | Interface is about | Effect |
|---|---|---|---|
| `observe` | **The mechanical pass itself** — Transcript Lines to Observations, minus what the base already holds. Owns the order of the writes and what a crash between them leaves. **No model, no clock.** | `from · unseen`, then one `base.write` | no |

**Dependency direction**, added to that file's graph:

```
cli ─────────────> home, knowledge, observe
observe ─────────> transcript (types + read), knowledge
knowledge ───────> home (a Place), failure
```

`knowledge` depends on nothing but `home` and `failure`. That is deliberate: it is the module
every later pass writes through, and the thing it must never grow is knowledge of where its
input came from.

---

## Test seams and conformance

The highest useful seam per arrow, and what each test observes.

| Arrow | Seam | What the test observes |
|---|---|---|
| `cli → knowledge` | the CLI, in-process | exit code and rendered text for a base with a known violation |
| `observe → knowledge` | `observe.run` with a real `Base` over a temp directory | the documents on disk afterwards, and the refusals returned |
| `knowledge → disk` | `base.write` over a temp directory | **bytes**, not objects — this is the format conformance check |
| pure functions | direct call | a list in, a value out. No fixtures, no temp dir |

**Conformance — public symbol → production caller → test seam.** A row with an empty middle
column is design that got implemented.

| Symbol | Production caller | Test seam |
|---|---|---|
| `knowledge.open` | `cli.ontology`, `cli.observe` | temp directory |
| `base.all` | all four verbs | temp directory with hand-written files |
| `base.write` | `cli.observe` | bytes on disk + `Refused` values |
| `base.writeIndex` | `cli.ontology index` | temp directory |
| `knowledge.lint` | `cli.ontology lint` | direct call |
| `knowledge.next` | `cli.ontology next` | direct call |
| `knowledge.index` | `cli.ontology index` | direct call |
| `observe.from` | `cli.observe` | direct call over real Transcript lines |
| `observe.unseen` | `cli.observe` | direct call |
| `home.knowledge` | `knowledge.open` | `home.test.ts` |

**One test this design owes that no row above covers.** ADR 007 falsifier 1 is *"the folder
stops opening in OpenKnowledge"*. Conformance to a foreign format is not observable from
inside our own types, so it needs its own check — and `04-straight-tools-cost.md` measured
the method: write documents with `fs`, then `ok preview` and `ok lint` them.

---

## State and failure sequence

There are durable writes, so this section is required.

| # | Write | A crash immediately after leaves | The next run |
|---|---|---|---|
| 1 | one document, atomically | that document, complete | `unseen` finds it and does not propose it again — identity is `(type, name)` |
| 2 | the next document | a **partial** pass: some stubs present, some not | resumes; there is no receipt to contradict |
| 3 | the derived index | an index older than the documents | rebuilds it — it is disposable by construction |

**Every write is a single `rename`.** Not a stylistic choice: `03-ok-mcp-tool-inventory.md`
measured that a non-atomic edit (`sed -i ''`) registers a **phantom document** in
OpenKnowledge's permanent removal ledger, and the viewer is the one thing ADR 007 keeps.

**There is no Receipt here, and that is a departure from `import` and `ingest`.** Both write
one because an Archive read is one-shot and a crash mid-import is unrecoverable. A stub pass
is idempotent and re-runnable from material still on disk, so a Receipt would claim
provenance nothing needs. **`B4`** if that reasoning is wrong.

---

## Branch points

Every place the shape depends on something not yet decided. Each is a heading here, and each
becomes one `grilling` line in [`scope.md`](./scope.md) pointing back at it.

### B1 · What is the operation module called? — **answered in this session**

Three candidates, and [`language.md`](../../rules/language.md) rule 1 settles it: *"use the
word that is already there."*

```
distil    — "extract the essence of". No prior art in this repository at all.
stub      — knowledge-flow.md's verb for the step. Collides with the document status,
            which is the thing `next` queues on.
observe   — ALREADY THE WORD. product.md:236 and thesis.md:129, identically:
            "Sources -> observations -> knowledge."
```

**`observe`.** The noun is in the sentence that describes this half of the product, so the
module invents nothing and the lexicon gains one entry rather than a synonym. Answered here
rather than carried, because `vp run shape` refuses a design that names a module with no
[`seams.md`](../../design/seams.md) row — and a row cannot be written for an undecided name.
**Not the principal's**, per this step's own rule that shape questions are not his.

### B2 · Where does the derived index live?

`home` grants exactly one Place here, `knowledge`. So the disposable read model either lands
**inside** the knowledge base, where the OpenKnowledge viewer will show it as a document, or
it needs a second Place.

```
A  knowledge/.index.json     inside. `.okignore` already exists and can hide it.
B  home.derived: Place       a second Place beside `blobs`; nothing foreign ever sees it.
```

A costs one line in `.okignore`; B costs a second grant in `home` and an answer to *"what
else goes there"*. **Not the principal's** — it is shape, and it falls out of whether the
index is ever hand-read. Recorded here so step 4 cannot skip it.

### B3 · How much does the mechanical pass allow itself to know? — **answered 2026-08-20**

This is `scope.md`'s `G3`, and it is now askable. The Archive gives a display label and
nothing else. But `T1` found two facts a script **can** have, which the map assumed it could
not:

```
A  Label only.        Person(name: <label>, status: unreviewed, source: history)
                      Honest and thin. 14 labels -> 14 Persons, ~10 humans.

B  Label + what grep proves.
                      Adds `is_principal` — "You deleted this message." appears on exactly
                      ONE label x25 against six others x36, zero overlap. VERIFIED.
                      schema.yaml has NO FIELD FOR THIS. It needs one, or the fact is lost.

C  B, plus proposed merges as a queue rather than a write.
                      Two label pairs differ only by a leading "~ ". Proposing is mechanical;
                      merging is not — knowledge-flow.md: "do not merge identities, propose
                      with evidence." There is nowhere to PUT a proposal today.
```

**Answered: none of the three.** The principal took a fourth shape the grill surfaced —
**the Principal is `config.yaml`, not the ontology.**

```
sources.<name>.self_label: "<label>"     # maps an install to a label in one Source
```

`grep` **confirms** that mapping rather than discovering a fact about the world.
[product.md](../../design/product.md) settled who the Principal is before any Archive
existed, so recording it as knowledge would make a per-install detail look like a fact and
have `doctor` validate it forever. `Person` gains no field, so **A** is what the pass writes
— and it is no longer "thin", because the fact it seemed to be discarding was never the
ontology's to hold. `C`'s merge queue waits until something reads it.

### B4 · Does a knowledge claim have to cite its message? — **answered 2026-08-20**

`scope.md`'s `G4`, and the design makes the cost concrete. `Commitment.source_message` is
**required** and no Archive line has an identifier.

```
A  Drop it to optional.        Cheapest. A Commitment from history cites nothing.
B  Synthesize a key.           `${at}-${slug(label)}` — MEASURED TO COLLIDE on 37 pairs.
C  Grow the Transcript line.   ADR 006's codec is canonical and re-encodes byte-identically,
                               so adding a field rewrites 13,134 lines on disk.
D  Cite the WINDOW, not the message.
                               A digest reads a window; the citation is that window.
                               Costs a `Window` noun the lexicon does not have.
```

**Answered: D.** `Commitment.source_message` becomes `source_window`, carrying
`"<chat>@<from>..<to>"`. It is the only shape whose precision matches what the producing pass
reads: *optional* is silent, a synthesized key is wrong, and growing the line rewrites 13,134
bytes-exact records before any caller needs it. Tightening to a message identifier when Live
material arrives is **additive**, so nothing is foreclosed. **Window** is now a
[CONTEXT.md](../../../CONTEXT.md) entry, which is what D always cost.

### B5 · Does `Media.kind` grow a `sticker` arm? — **answered 2026-08-20: yes**

Not the principal's, and recorded because it changes a cost. `Media.kind` is
`enum(image|voice|audio|video|document)`, so **381 stickers are currently destined for a
vision model**. They are 512×512 WebP and mechanically identifiable — 207 blobs, verified by
header parse. This is `B3`'s question in miniature: a fact a script can have, with no field
to hold it.

---

## What follows

**Startable now, waiting on nobody:** `home.knowledge` as a `Place`, and the four pure
functions — `lint`, `next`, `index` and the read layer — which
[`04-straight-tools-cost.md`](findings/04-straight-tools-cost.md) already built once as a
spike and measured at 250 code lines.

**Waiting on the principal:** nothing. `G1`, `G3` and `G4` were grilled as one round on
2026-08-20 and are rows 31–33 of [`scope.md`](./scope.md)'s **Decided**.

**Waiting on a decision I make at step 4:** `B2` alone — where the derived index lives.
`B1` was answered in this session because `vp run shape` blocks on it.

**Three schema changes now have an owner and none has a ticket yet** — that is
[`plan-slice`](../../../.agents/skills/plan-slice/SKILL.md)'s job:
`Media.kind` gains `sticker`; `Commitment.source_message` becomes `source_window`; and
`config.yaml`'s Source gains `self_label`. The first two are `schema.yaml`, which
[`skeleton/spec.md`](../skeleton/spec.md) §3.4 ships and `doctor` validates; the third is
`home/internal/config.ts`.
