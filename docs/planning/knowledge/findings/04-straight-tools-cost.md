# KNOWLEDGE · R4 — What straight tools over markdown cost, against what going through the OK MCP buys

**Question.** The principal: *"Ideally we would just create our own tools — like we create our
own tools for GitHub or WhatsApp using whatsappd. It was thought to be an easier path to just use
the open knowledge MCP, with the understanding that we were always going to remove it anyway and
make our own one… Research whether we should just roll our own ones as tools, and use the logic
from it to just make straight tools — and when I say straight tools, I mean just like the
functions that can be called."*

**This is a costing exercise.** It has no recommendation section. It has a line count taken from
code that was written and run, a list of behaviours that disappear if we write files ourselves,
and the risks in both directions.

**Sources.** All primary. The `ok` binary at `/Users/abuusama/.ok/bin/ok` — **0.55.2**, a symlink
into `/Applications/OpenKnowledge.app/Contents/Resources/cli/`; the live
`mcp__open-knowledge__*` tool schemas in this session; the npm registry metadata for
`@inkeep/open-knowledge`; `home`'s own templates and parser under `src/modules/home/`; and the
shipped ontology at `/Users/abuusama/.ambient/schema.yaml`, read and never written.

**Instruments.** Three, all under the session scratchpad at
`…/16daba7c-fc16-45dd-9921-8634c629d66a/scratchpad/r4/`:

- **`spike/`** — a working `knowledge` module, six slots, `lint · next · index · query · stub`
  over a directory of markdown, consuming the `Schema` value `home` already produces. It
  typechecks under the repo's own `tsconfig.json` strictness and its test passes.
- **`kb-plain/`** — an OpenKnowledge project scaffolded **by hand from `home`'s templates**, never
  by `ok init`, whose every document was written by the spike's `applyWrites` using `node:fs` and
  nothing else. `ok preview`, `ok lint`, `ok start` and six MCP calls were then pointed at it.
- **`kb-bulk/`** — 1,200 generated documents, for the timings in §1.4.

Nothing was run with a working directory inside `/Users/abuusama/.ambient/`. The one server this
research started was stopped; `ok status` on the scratch project reports `server not running`,
`ui not running` **[measured]**.

Repo paths are relative to `/Users/abuusama/projects/ambient/.claude/worktrees/knowledge-slice-a90e85/`.
**[read]** = asserted by the cited line, tool schema, or shipped file. **[measured]** = I ran it and
this is its output. **[inference]** = mine, asserted by no source.

This finding assumes [`01-ok-mcp-read-surface.md`](01-ok-mcp-read-surface.md) and
[`02-ok-skills-draft-and-install.md`](02-ok-skills-draft-and-install.md) and does not repeat them.

---

## Verdicts

| # | Sub-question | Verdict |
|---|---|---|
| 1 | What does the straight-tools version cost, in code? | **326 lines of code, 468 with the house docblocks, for all five operations** — written, typechecked and tested, not estimated. `lint` + `next` + `index` + the shared read + the interface come to **exactly 250 code lines**. `knowledge-flow.md`'s *"roughly 250 lines of TypeScript"* holds, on the nose, for the read verbs. |
| 2 | What turned out to be hard? | **Nothing in the four verbs.** `next` is 9 lines. Two things did bite, and neither is about validation: a type does **not** give you its folder (`Person` → `person/`, never `people/`), and *"do not overwrite"* by path silently duplicates — the refusal has to be over frontmatter identity. Both were found by an assertion failing, not by reasoning. |
| 3 | What does "the folder must still open in OpenKnowledge" actually require? | **Nothing. There is no requirement to meet.** `ok preview` and `ok lint` found and passed a document in a directory with **no `.ok/` at all**. No `title`, no `description`, no naming convention, no index entry, no manifest. `ok start` on the hand-scaffolded project served all six plain-`fs` documents over its API, deriving each title from the `# H1`. A document written by `fs` **while the server ran** appeared in the API listing and in OK's own backlink cache within 6 seconds. |
| 4 | What is genuinely lost? | **Six things, and two of them are not what you would guess.** Lost: version history, per-change attribution, CRDT concurrency, full-text search from our own code, comments, share links. **Not lost: backlinks, tags, and the live view** — OK derives all three from files on disk regardless of who wrote them. |
| 5 | Is any of it reachable without a daemon? | **No.** Every OK tool that writes, versions or resolves a conflict is marked *"[Requires: Hocuspocus server]"* in its own schema. One `write` call auto-spawned a full project server on a port nobody asked for. Ten `ok mcp` stdio processes were running on this machine at the time of measurement, the oldest for 25 hours. |
| 6 | Two defects measured today, both on the MCP write path | `write`'s **create** path silently **drops empty arrays** — `aliases: []` and `numbers: []` were passed and neither reached disk, leaving a `Person` missing two required fields. And OK's own conventional `tags:` key is a **forbidden property** under Ambient's closed vocabulary: our lint flags it, correctly, on the one document that carried it. |
| 7 | The version-drift number | **1,090 published versions. 387 publishes in the last 30 days, 98 of them stable. 24 in the last 24 hours.** The installed 0.55.2 was published 2026-08-15; `latest` is 0.58.9, published 2026-08-19 — **16 stable releases behind in 5 days.** |

**Headline.** The code is not the cost — the read verbs are 250 lines and the hard parts were
naming, not validation. The format is not the cost either: OpenKnowledge reads what plain `fs`
writes, with no scaffold and no required key, and keeps its live view, its backlinks and its tags
while doing it. What is actually bought by going through the MCP is **history, attribution and
concurrency**, all three of which require a running daemon, and none of which any of the five
operations needs.

---

## 1 — The straight-tools version, written and measured

### 1.1 Where it is

```
…/16daba7c-fc16-45dd-9921-8634c629d66a/scratchpad/r4/spike/
  types.ts               the interface
  service.ts             the entry
  home-types.ts          NOT NEW CODE — a copy of the `home` declarations it imports
  internal/documents.ts  the one read effect
  internal/lint.ts       lint
  internal/next.ts       next
  internal/derive.ts     index
  internal/query.ts      query
  internal/stub.ts       stub + the one write effect
  knowledge.test.ts      the runnable check
```

Run it with `node spike/knowledge.test.ts` from `…/scratchpad/r4/`, which has a `node_modules`
symlink to the repo's own. It prints `ok — every assertion passed` **[measured]**. It typechecks
clean under a `tsconfig.json` copied key-for-key from the repo's **[measured]**. It contains no
`throw` and no `any` **[measured]**, so `contract/no-throw` and [types.md](../../../rules/types.md)
would both pass, and every file is under 250 lines.

**It consumes the real ontology through the real parser.** The test reads
`/Users/abuusama/.ambient/schema.yaml` and decodes it with
[`src/modules/home/internal/schema.ts`](../../../../src/modules/home/internal/schema.ts)'s
`readSchema`, asserting `schema.types.length === 6` before it does anything else. Nothing about the
schema is faked, which is what makes the line count a line count against the shipped ontology
rather than against a toy.

**Two effects, named in the type.** `readBase` is the only read of the disk and `applyWrites` the
only write; `lint`, `next`, `index`, `query` and `stub` are pure functions. That is not decoration
— it is what let the whole tool be exercised from a literal in 119 lines of test.

### 1.2 The line counts

**[measured]**, `wc -l` and a block-comment stripper over the files above. *Code* excludes blank
lines, `//` lines and `/* … */` blocks; *total* is what `wc -l` says, docblocks included, because
this repo writes them and [legibility.md](../../../rules/legibility.md) counts them.

| | total | code |
|---|---:|---:|
| `types.ts` — the interface | 83 | 50 |
| `service.ts` — wiring | 12 | 8 |
| `internal/documents.ts` — walk, split the fence, decode the block | 87 | 66 |
| **`lint`** | **100** | **81** |
| **`next`** | **17** | **9** |
| **`index`** | **49** | **36** |
| **`query`** | **44** | **29** |
| **`stub`** + `applyWrites` | **76** | **47** |
| **Production total** | **468** | **326** |
| — the four read verbs only (no `stub`) | 392 | 279 |
| — `lint` + `next` + `index` only (no `stub`, no `query`) | **348** | **250** |
| *`knowledge.test.ts` (not production)* | *148* | *119* |
| *`home-types.ts` (already exists in `home`)* | *35* | *22* |

**`knowledge-flow.md` estimated *"roughly 250 lines of TypeScript rather than email-pa's ~600"*
for `lint · next · index · query`.** Measured against reality: `lint + next + index` plus the read
and the interface is **250 code lines exactly**, and adding `query` takes it to **279**. The
estimate holds — with two riders. It counted code, not the docblocks this repo writes, which add
another 42%. And `stub` is not in it: the mechanical create pass is a sixth operation costing
another 47.

### 1.3 What the hard parts actually were

**Neither of them was validation.** `lint` is the longest file at 81 code lines and it is a switch
over six field forms; it was written once and never debugged. What failed were two assertions about
naming and identity.

**The type does not give you the folder.** The first version derived the folder as the type name
plus `s`, and the test failed **[measured]**:

```
+ actual - expected
+   'persons/aaron-usama.md'
-   'people/aaron-usama.md'
```

`knowledge-flow.md` writes the path as `people/zeeshan.md`. English plurals are not a function, so a
folder convention derived from a type name needs a lookup table — a second place for the ontology
to be wrong. The spike settled on `Person` → `person/`, which is ugly and is not what the design
says. **[inference]** This is not a code problem; it is an unmade decision, and it is load-bearing
twice over, because §3.4 shows OK's own frontmatter-schema binding is a *path glob* and can only
select by folder.

**"Do not overwrite" by path is not "do not duplicate".** The same failure exposed a worse one:
with the stub computing `persons/zeeshan.md` and the existing document at `people/zeeshan.md`, the
path-collision check passed and the stub was emitted — a second Zeeshan. A mechanical pass that
disagrees with a reasoning pass about where a document lives will silently double the corpus. The
fix is to refuse on `(type, name)` read out of the frontmatter of every document already on disk,
not on the path the stub happens to compute:

```ts
const identityOf = (type: unknown, name: unknown): string => `${String(type)}|${String(name)}`;
```

**[inference]** This is the one real design consequence of the whole spike, and it is the same
consequence either way — OK's `write` would have created the second document too, because its
collision check is also a path.

**The third thing, smaller: `refs` are not links.** `index` resolves a `ref`/`ref[]` field to a
document key and builds the reverse map, which is 12 code lines in `derive.ts`. That code cannot be
saved by using OK, for the reason measured in §4.3.

### 1.4 What it costs to run

**[measured]**, `kb-bulk/` — 1,200 documents (1,000 `Person`, 200 `Commitment`), one `node` process,
`performance.now()` around each call:

| Step | ms |
|---|---:|
| `readBase` — walk 1,200 files, split, parse every YAML block | **219.6** |
| `lint` — all 1,200 against the 6-type ontology | **2.0** |
| `next` — 20 unreviewed Persons | **0.3** |
| `index` — rows, counts, backlinks | **8.0** |
| `query` — open commitments due `< 2026-08-23`, grouped by owner → 158 groups | **0.6** |

The serialised index is **222,709 bytes** for 1,200 documents. Set that beside R1's measurement of
the MCP path: **261,736 characters for 500 documents in one `exec` response**, over the token budget
and spilled to disk by the harness. **[inference]** The whole corpus costs a fifth of a second
in-process and never crosses a wire; the same enumeration over the MCP is roughly 520 characters of
JSON per document, every call, through a token budget.

### 1.5 What `query` turned out to be

The design's example — *"commitments due < 2026-08-23 group by owner"* — reads like a parser, and
[`scope.md`](../scope.md)'s `G2` prices it as *"plausibly the whole budget"*. Measured, it is **29
code lines**, because the spike did not build a language:

```ts
export type Aggregate = {
  readonly type: string;
  readonly where: readonly Comparison[];
  readonly groupBy?: string;
};
```

**[inference]** The caller is a model. Turning *"commitments due before Friday, grouped by owner"*
into that object is the one part of this a language model is already better at than a lexer, and it
costs nothing. A string grammar would add a tokeniser, a precedence table and a date vocabulary,
none of which buys an answer the object does not already give. Priced this way `query` is not the
budget — it is 9% of it, and `G2` is a question about whether the *index* is wanted, not about
whether a parser is affordable.

---

## 2 — What the MCP route costs that the file route does not

Recorded here because a costing that only prices one side is not a costing.

**Compiling `schema.yaml` into JSON Schema.** R1 §4 established that OK's `lint` does the
closed-vocabulary job — but only against `contentRules.frontmatter.schemas[].file`, a JSON Schema on
disk. Going through OK therefore requires a `Schema` → JSON Schema compiler, one file per type or
one project-wide `oneOf`, plus writing `.ok/config.yml` ourselves because both keys are
`agentSettable: false` **[read, R1 §2]**. The spike needs none of that: it checks the `Schema` value
directly. **[inference]** That is work the file route deletes rather than adds.

**Re-reporting OK's diagnostics.** R1's gap 4: `additionalProperties` diagnostics do not name the
offending key. The spike's do, because it has the frontmatter and the schema in the same function
— **[measured]**, our lint over the eight-document mixed corpus of §3, one problem, named:

```
person/linker.md {"_tag":"UnknownKey","key":"tags","known":["type","name","aliases","numbers","org","role","status","source"]}
```

**Paging.** R1 gaps 2 and 3: severity is always `warning` and audit output is capped at 10 files ×
10 diagnostics, so `ontology lint` must page by folder to report *which* documents are wrong. The
spike returns all of them in one array in 2ms.

---

## 3 — The format-compatibility question

**The principal's requirement is that the folder must still open in OpenKnowledge.** This section
establishes what that requires of files we write ourselves. It is the load-bearing question, so
everything in it was measured rather than read.

### 3.1 The instrument

`…/scratchpad/r4/kb-plain/`, built by `make-kb.ts`, which:

1. writes `.ok/config.yml`, `.ok/.gitignore` and `.okignore` **verbatim from `home`'s own template
   constants** — `OK_CONFIG`, `OK_GITIGNORE`, `OKIGNORE` in
   [`src/modules/home/internal/templates.ts`](../../../../src/modules/home/internal/templates.ts) —
   imported, not retyped. `ok init` was never run.
2. decodes the real `schema.yaml` with the real `readSchema`.
3. writes six documents through the spike's `stub` + `applyWrites`, which is `fs.mkdirSync` +
   `fs.writeFileSync` with `flag: "wx"` and nothing else.

The result, **[measured]** — the entire project, before OK saw it:

```
./.ok/.gitignore   ./.ok/config.yml   ./.okignore
./chat/capxul-devs.md          ./commitment/ship-the-thing.md
./media/blob-9f2a.md           ./organization/capxul.md
./person/aaron-usama.md        ./person/zeeshan.md
```

One document verbatim:

```markdown
---
type: Person
name: Zeeshan
aliases:
  - Zee
numbers: []
org: organization/capxul
status: unreviewed
source: history
---

# Zeeshan
```

No `title`. No `description`. No `id`. No `created`. Nothing but `schema.yaml`'s own fields.

### 3.2 What OpenKnowledge requires: nothing

**[measured]**, `ok --cwd <kb-plain> preview` — *"Show what content the watcher will track"*:

```
Content:
  Found 6 markdown files in ./
  Sample: chat/capxul-devs.md, commitment/ship-the-thing.md, media/blob-9f2a.md, organization/capxul.md, person/aaron-usama.md, …
```

**[measured]**, `ok --cwd <kb-plain> lint`:

```
✓ No problems in 6 files.
```

Six of six, zero problems, from a hand-written scaffold. Then the floor was probed. **[measured]**,
three fresh directories each holding one document at `person/a.md` with three frontmatter keys:

| Scaffold | `ok preview` |
|---|---|
| `.ok/config.yml` + `.ok/.gitignore` + `.okignore`, hand-written | `Found 6 markdown files` (the full project above) |
| an **empty** `.ok/config.yml`, nothing else | `Found 1 markdown files in ./` |
| an **empty `.ok/` directory**, no `config.yml` | `Found 1 markdown files in ./` + *"Run `open-knowledge init` to scaffold config + .okignore."* |
| **no `.ok/` at all** | `Found 1 markdown files in ./` + the same nudge |

`ok --cwd <no-.ok-dir> lint` returned `✓ No problems in 1 file.` and created nothing — the directory
after the run held exactly the three paths it held before **[measured]**.

**There is no marker file, no manifest, no index to be listed in, and no naming convention.** A
document is a `.md` file with a YAML frontmatter block. `.ok/config.yml` changes *scope*
(`content.dir`) and settings; it does not confer membership. This is precisely what
[knowledge.md](../../../rules/knowledge.md) already claims — *"The layout is the thing worth taking;
the tooling is not… The result opens in the OpenKnowledge app because the format matches"* — and it
is now measured rather than asserted.

### 3.3 What OpenKnowledge does when it opens one

`ok start --only server -p 24999` on `kb-plain`. **[measured]**, `GET /api/documents`:

```json
{"kind":"document","docName":"chat/capxul-devs","docExt":".md","size":121, …}
```

all six present, and `GET /api/search?q=Zeeshan` returned every page with a derived title —
`"title":"ship the thing"`, `"title":"Capxul"` — **read off the `# H1` in the body**, since no
document carries a `title` key. So OK's own convention that *"`title` + `description` [are]
required"* (R1 §2, quoting the installed runtime skill **[read]**) is a recommendation for its
authoring path, not a condition of being read.

**What it created.** The tree went from 16 paths to 57 — **41 new paths** **[measured]**:

| What appeared | What it is |
|---|---|
| `.git/ok/` — a full git directory with `core.worktree` pointing at the project and `user.name = openknowledge` | the shadow repo (§4) |
| `.ok/local/cache/main/backlinks.json` | the wiki-link graph, forward and backward, with snippets and line/column |
| `.ok/local/cache/tags.json` | frontmatter `tags`, per document, keyed by mtime + size |
| `.ok/local/principal.json` | `{"display_name":"Capxul Agent","display_email":"agent@capxul.dev","source":"git-config"}` |
| `.ok/local/{state.json,server.lock,ui.lock,logs/,telemetry/,sync-state.json,removed-docs.json}` | per-machine runtime state |

**Nothing was written into `.claude/`, `.codex/`, `.cursor/`, `.github/`, `.opencode/` or `.pi/`.**
**[inference]** [knowledge.md](../../../rules/knowledge.md) attributes those to `ok init`, and this
measurement narrows the claim usefully: `ok start` does not write them, so the editor pollution the
rule is written against is `init`'s, not the server's. Everything the server did write is under
`.ok/local/` and `.git/ok/` — both already covered by `home`'s `OK_GITIGNORE` template, except
`.git/ok/`, which is not.

**It did not touch our files.** After `ok start` and six MCP calls, one of them a `checkpoint`, the
documents the spike wrote were byte-identical apart from the keys an `edit` was explicitly asked to
set — and the one document OK created itself is the only one shaped differently. Key
order preserved, block-style arrays preserved, flow-style `tags: [engineering, capxul]` preserved,
blank line before the `# H1` preserved, no `title` or `description` injected **[measured]**.

### 3.4 What it tolerates, and the one place it does not

**Tolerated.** Arbitrary frontmatter keys (`type`, `source`, `source_message`, `processed_by` — all
foreign to OK, all round-tripped). Arbitrary folder names. A missing `README.md`. Documents with no
frontmatter at all. A `.md` file with a malformed YAML block — `ok lint` reported no problem, while
our lint reported `Malformed` with a line number.

**Silently ignored.** Frontmatter `ref` values — see §4.3. `.okignore` on the `exec` path — R1 §3.

**The one collision.** `tags:` is OK's conventional key — its `write({folder})` schema names
*"`title`/`description`/`tags` [as] the conventional keys"* **[read]** — and OK reads it from
frontmatter into `.ok/local/cache/tags.json` from a plain-`fs` write **[measured]**. Ambient's
`schema.yaml` declares `tags` on none of its six types, so the closed vocabulary forbids it. Our
lint over the mixed corpus reported exactly one problem, and it was this **[measured]**:

```
person/linker.md {"_tag":"UnknownKey","key":"tags","known":["type","name","aliases","numbers","org","role","status","source"]}
```

**[inference]** This is not a format-compatibility failure — the file is legal markdown and OK reads
it fine. It is a decision the ontology has not made: whether a human tagging a document in the OK
UI produces a lint violation. It is the same collision R1 §2 flagged for `title`/`description`, now
with a measured instance, and it exists on **both** routes, because the `additionalProperties:
false` a JSON Schema compiled from `schema.yaml` would carry rejects `tags` just as our lint does.

### 3.5 The live view survives

The sharpest version of the compatibility question is not "does it open" but "does it stay live".
**[measured]**, with `ok start` running, a seventh document was created with a plain shell heredoc
— no MCP, no `ok`, no API. Six seconds later:

```
/api/documents → [ …, 'person/live-write', … ]
backlinks.json → [ …, 'person/live-write', … ]
```

And an eighth, carrying `tags: [engineering, capxul]` and two `[[wikilinks]]` in its body, produced
a complete backlink record in OK's own cache **[measured]**:

```json
"organization/capxul": [{ "source": "person/linker",
                          "snippet": "Works at organization/capxul with person/zeeshan.",
                          "sourceForm": "wiki", "line": 13, "column": 9 }]
```

and its tags in `tags.json`. **The watcher does not care who wrote the file.** **[inference]** The
OK Desktop app is a client of this same server, so the live view is not something the file route
gives up.

---

## 4 — What is lost

Every row measured against `kb-plain` unless marked otherwise. *"Needed?"* is against the five
operations in this Slice — `stub`, `lint`, `next`, `index`, `query` — and nothing beyond them.

| Behaviour | What it is | Needed for the five ops? | Cost to re-implement |
|---|---|---|---|
| **Version history** | A shadow git repo at `<project>/.git/ok`. `history` returns *"timeline entries from the shadow repo"* with a 40-char SHA **[read]**. **A plain-`fs` document has none: `history({document:"person/zeeshan"})` returned `{"entries":[],"total":0}`** **[measured]**. After one `checkpoint` the same document has exactly one entry — so plain-`fs` writes are **restorable but not attributed**. | **No.** Frontmatter is truth and the index is disposable. | `git init` plus a commit per pass, ~30 lines — or nothing. |
| **Attribution** | An `ok-actor:` git trailer carrying `writer_id`, `principal`, `agent_session`, `agent_type`, `client_name`, `docs`, `summaries` **[measured]**. `author` is the agent; `committer` is always `openknowledge <noreply@openknowledge.local>`. OK says it itself: *"`ok lint --fix` … writes on disk **unattributed**"* **[read]**. | **No** — and Ambient carries its own provenance axis already: `source: enum(history\|witnessed)` is a **required** field on `Person` and `Organization`. | One frontmatter key, if it is ever wanted. |
| **Concurrency / conflicts** | *"Local-first knowledge base with CRDT collaboration"* **[read]**. Measured shape: each writer commits to its own ref — `refs/wip/main/agent-dfef18c0-…` — while `refs/heads/main` stays empty until a `checkpoint` **[measured]**. `edit` warns with `content-divergence` / `disk-edit-reconciled` **[read]**. | **No** for the mechanical passes. **Yes** as a hazard — §5.1. | Not re-implementable. The mitigation is `flag: "wx"` and never rewriting a document, which is what the spike does. |
| **Full-text search** | BM25 + title boost + recency **[read, R1 §1]**. | **No.** `next` is a status filter and `query` is an aggregate; neither is retrieval. | Real, if ever wanted. **But it is not lost to the user** — OK indexes and searches our plain-`fs` files (`/api/search` returned all of them, §3.3). It is lost only *to our own code without a daemon*. |
| **Comments** | `commentCount` and a `comments` array on `exec("cat …")` **[read, R1 §2]** — human annotations on a document. | **No.** | Would not be attempted. Lost only if the human uses them and our tools must see them. |
| **Share links / preview URLs** | `share_link`, `preview_url`, and the `previewUrl` on every tool response. | **No.** | Would not be attempted. |
| **Templates** | `write({template})` stores at `<folder>/.ok/templates/<name>.md` and substitutes `{{date}}`/`{{user}}` **[read, R1 §5]**. | **No** — `stub` is the same job, 47 code lines, and it is the one that knows the ontology. | Already built. |
| **`.okignore` scoping** | Excludes paths from OK's index. | **No.** | ~40 lines or a gitignore-matcher dependency. **Note it is lost on both routes** — R1 §3 measured that `exec` ignores `.okignore` too. |

### 4.1 Everything above needs a daemon

Not a library call, not a file — a process. **[read]**, verbatim from the tool schemas in this
session: `history`, `checkpoint`, `links`, `lint`, `write` and `edit` each open with
**"[Requires: Hocuspocus server]"**. `write`'s `document` case reads *"Create or overwrite a doc via
the CRDT layer [Requires: Hocuspocus server]"*.

**[measured]** and unasked-for: after I had explicitly stopped the server I started, a single
`write` call auto-spawned a new one — `ok status` reported `server alive pid=72484 port=61071`,
`ui alive pid=72484 port=61071`. It was stopped. **[inference]** A daemon that starts itself on a
tool call is a different kind of dependency from a function call, and it is the shape of dependency
this repo has otherwise avoided: `home` takes no ports at all.

### 4.2 What history actually looks like, measured both ways

The clearest single pair of measurements in this finding.

**Before any MCP write** — six documents on disk, server running, all six indexed **[measured]**:

```
history({ document: "person/zeeshan" })  →  {"entries": [], "total": 0}
```

**After one `edit({document:{path:"person/zeeshan", frontmatter:{role:"engineer"}}, summary:"Set role from a reasoning pass"})`** **[measured]**:

```json
{"version":"95e7dfa8bd57de61dfa0b5dd4ea6b4533268cc65","timestamp":"2026-08-20T08:05:55Z",
 "author":"claude-code","authorEmail":"agent-dfef18c0-…@openknowledge.local","kind":"wip",
 "message":"wip: person/zeeshan — Set role from a reasoning pass",
 "contributors":[{"id":"agent-dfef18c0-…","name":"claude-code","docs":["person/zeeshan"],
                  "summaries":["Set role from a reasoning pass"]}]}
```

The commit object itself **[measured]**:

```
tree 353f8f69…
author claude-code <agent-dfef18c0-…@openknowledge.local> 1787213155 +0000
committer openknowledge <noreply@openknowledge.local> 1787213155 +0000

wip: person/zeeshan — Set role from a reasoning pass

ok-actor: {"v":1,"writer_id":"agent-dfef18c0-…","principal":"principal-22f534f3-…",
           "agent_session":"dfef18c0-…","agent_type":"claude","client_name":"claude-code",
           "docs":["person/zeeshan"],"summaries":["Set role from a reasoning pass"]}
```

Its tree contains **all eight documents**, including the three written by plain `fs` — so the
*snapshot* covers everything; what the plain-`fs` documents lack is a commit that names them as the
change. **[measured]**, after `checkpoint({summary:"R4 measurement — after plain-fs writes"})`, the
plain-`fs` document `person/live-write` has exactly one history entry:

```json
{"kind":"checkpoint","author":"openknowledge","authorEmail":"noreply@openknowledge.local",
 "message":"checkpoint: R4 measurement — after plain-fs writes",
 "contributors":[{"id":"openknowledge-service","name":"OpenKnowledge (service)","docs":[]}]}
```

**[inference]** Restorable, with `docs: []` and a service author. That is the precise shape of what
is lost: not the ability to roll back, but the record of who changed what and why.

### 4.3 The one that was already lost — backlinks do not see `ref` fields

This matters more than it looks. `person/zeeshan.md` carried `org: organization/capxul` in its
frontmatter from the moment it was written. OK's `backlinks.json` `backward` map stayed **empty**
until an unrelated document put `[[organization/capxul]]` in its **body** — at which point the
record that appeared was `"sourceForm": "wiki"` with a line and column in the prose **[measured]**.

**OK's link graph is wiki-links in the body. Ambient's ontology addresses by `ref` fields in the
frontmatter. They do not intersect.** **[inference]** So the 12 lines in `derive.ts` that reverse
`ref`/`ref[]` are not a re-implementation of anything OK offers — they are work that has to be done
on either route. `links` is not a way to get Ambient's graph; it is a way to get the prose graph,
which nothing in this Slice has asked for.

### 4.4 What is **not** lost — backlinks, tags, and the live view

Named separately because the intuition runs the other way. All three are derived by OK from files
on disk, by a watcher that does not know or care which process wrote them. §3.5 measured a
plain-`fs` document acquiring a full backlink record with snippet and line number, and its tags, in
OK's own caches, with no MCP call involved.

---

## 5 — Risk

### 5.1 Rolling our own — what we would get wrong that OK gets right

**Concurrent writes with a human in the OK Desktop app.** This is the only serious one. While a
document is open in the editor it lives in the CRDT layer, not on disk; OK names the failure itself
in `edit`'s schema — `content-divergence` and `disk-edit-reconciled`, advisory warnings meaning
*"the edit landed but re-read the doc"* **[read]**. **[inference]** A plain `fs` write to a document
someone has open could be reconciled away, or could clobber unsaved state. **Not measured** — it
needs the Desktop app open with a live document, which this research did not do, and it must not be
treated as measured. The spike's mitigation is structural rather than clever: `flag: "wx"` refuses
any path that exists, so the mechanical pass can only ever *create*. Everything that modifies an
existing document is a reasoning pass, and reasoning passes are hand-operated in this Slice.

**Identity, not validation.** §1.3. The `(type, name)` refusal is the whole of it, and the same
hazard exists on the MCP route because `write` also collides on path.

**YAML round-trip churn.** The spike writes with `yaml.stringify`. A human edits the document in OK;
we rewrite it; formatting churns and the diff is noise. **[inference]** Mitigated to zero by the
same rule — we create, we do not rewrite — and unmitigated the moment that rule is relaxed.

**Filename normalisation.** `slug` does `normalize("NFKD")` before stripping to `[a-z0-9-]`. macOS
stores filenames in NFD, and the Archive's labels carry emoji and a leading `~ `
([`scope.md`](../scope.md)'s `P4`/`P5`, `P1`/`P8`). **[inference]** Untested against the real
labels; those collisions are exactly the input that would break a naive slug, and two different
humans slugging to the same filename would be silently refused by `wx` rather than reported.

**`.okignore`.** Our walk skips dot-directories and nothing else. A principal who adds a pattern
would find it honoured by `search` and `lint` and ignored by our tools — the same asymmetry R1 §3
measured for `exec`, so this is a shared risk rather than a new one.

**No search, no comments, no history — by construction.** §4. Each is a thing a person might
reasonably expect a knowledge base to have, and each is available in the OK app on the same files;
what is unavailable is reaching them from Ambient's own code without starting a daemon.

### 5.2 Depending on the MCP

**Version drift, with numbers.** **[measured]**, the npm registry for `@inkeep/open-knowledge` on
2026-08-20:

| | |
|---|---|
| Total published versions | **1,090** |
| Publishes in the last 30 days | **387** — of which **98 stable** |
| Publishes in the last 7 days | **84** — of which **26 stable** |
| Publishes in the last 24 hours | **24** — of which **5 stable** |
| Installed | **0.55.2**, published 2026-08-15T01:06Z |
| `latest` | **0.58.9**, published 2026-08-19T20:51Z |
| Stable releases between them | **16** — `0.56.0`, `0.57.0`–`0.57.5`, `0.58.0`–`0.58.9` |

**[inference]** Sixteen stable minor and patch releases in the five days since the installed build,
and the app updates itself. A tool surface moving at roughly three stable releases a day is a
surface whose schemas are not a fixed point, and every one of them arrives behind an Electron app
the principal installs rather than a dependency this repo pins.

**The daemon and the auto-spawn.** §4.1. **[measured]**, at the time of writing, this machine was
running **ten** `ok mcp` stdio processes — one per MCP client session, the oldest for **25 hours**
— plus two `open-knowledge-server` project daemons belonging to other projects. Ambient would add
its own per chat and per agent, since every chat and agent template ships `mcp: [openknowledge]`
([`templates.ts:122`](../../../../src/modules/home/internal/templates.ts),
[`:146`](../../../../src/modules/home/internal/templates.ts)).

**The wiring does not work today.** R1 §6 and [`scope.md`](../scope.md)'s *"one defect found while
tracing"*: `ok mcp` is a global server routed per call by a `cwd` argument or a client-advertised
root, and Ambient's `McpServer` type is `{ name, command, args, env }` with no `cwd`
([`home/types.ts:85`](../../../../src/modules/home/types.ts)). **[inference]** So the MCP route is
not a working status quo that the file route would have to displace — it is itself unbuilt, and
closing it means either widening a `home` type that SKELETON settled, or depending on MCP roots.

**Two write-path defects, measured today.**

*`write`'s create path drops empty arrays.* **[measured]** — a `write` carrying
`frontmatter: {type:"Person", name:"OK Written", aliases:[], numbers:[], status:"unreviewed",
source:"witnessed"}` returned `"Written successfully (replace)."` and put this on disk:

```markdown
---
type: Person
name: OK Written
status: unreviewed
source: witnessed
---
# OK Written
```

`aliases` and `numbers` are gone. Both are **required** `text[]` fields on `Person`, and both were
legitimately empty — which is the *normal* state of a mechanically-created stub, because a stub
carries only what is mechanically knowable. A subsequent `edit` with `{aliases: []}` **did** persist
it **[measured]**, so the defect is specific to the create path. **[inference]** A mechanical `stub`
pass routed through `write` would emit documents that its own `lint` then rejects, on the most
common shape it will ever produce. The spike's `applyWrites` writes `aliases: []`, because
`yaml.stringify` writes what it is given.

*Enumeration is the read path, and it is expensive.* R1 §1: `exec` is the only enumerator, `search`
caps at 100 with no match-everything query, and a 500-document enumeration is a 261,736-character
response. §1.4 measured the same work in-process at 220ms for 1,200 documents.

**The cost of a breaking change, given the intent to replace it anyway.** **[inference]** Every MCP
call site is a call site to rewrite. The `knowledge` module is specified as *"hides the OK MCP
client"* ([seams.md](../../../design/seams.md)), so the blast radius of a schema change is bounded
to one module either way — which cuts both directions: it makes the MCP route survivable, and it
makes the file route no cheaper to defer.

---

## Appendix — what was run, and what was left behind

**Under `/Users/abuusama/.ambient/`:** two reads and no writes — `cat schema.yaml` and
`ls -laR knowledge/`. No `ok` command and no MCP call carried a `cwd` inside it.

**Servers.** One started: `ok start --only server -p 24999` on `…/scratchpad/r4/kb-plain`, stopped
with `ok stop` (`Stopped: server (pid=60401, port=24999)`). One auto-spawned by an MCP `write`,
found by `ok status` and stopped (`Stopped: server (pid=72484, port=61071), ui (pid=72484,
port=61071)`). Final `ok status` on that project: `server not running`, `ui not running`
**[measured]**. Two `open-knowledge-server` processes belonging to other projects were left alone —
they are not mine.

**MCP calls made** — all with `cwd: …/scratchpad/r4/kb-plain`: `history` ×2, `edit` ×2,
`checkpoint` ×1, `write` ×1.

**Scratch state**, all under
`…/16daba7c-fc16-45dd-9921-8634c629d66a/scratchpad/r4/`: `spike/` (the module), `make-kb.ts`,
`kb-plain/` (the compatibility instrument, now carrying OK's shadow repo and caches), `kb-bulk/`
(1,200 generated documents), `t-bare/`, `t-min/`, `t-empty/` (the scaffold-floor probes),
`tsconfig.json`, `node_modules` symlinked to the repo's own, and the tree snapshots `before.txt`,
`after-readonly.txt`, `after-start.txt`, `after-write.txt`. The scratchpad is session-scoped; the
spike is evidence, not code to keep.
