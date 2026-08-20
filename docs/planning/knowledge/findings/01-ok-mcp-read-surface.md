# KNOWLEDGE · R1 — Can `ontology lint · next · index · query` be built on OK's MCP surface alone?

**Question.** [`docs/design/knowledge-flow.md:106`](../../../design/knowledge-flow.md) settles that
*"CRUD is not ours to build"* and that the ported ontology tool is **"a validator, a queue and an
indexer"** — four read-only verbs (`:122-125`). [`docs/design/seams.md:30`](../../../design/seams.md)
gives the `knowledge` module the job of **hiding the OK MCP client**. R1 asks whether those four
verbs can be built on `mcp__open-knowledge__*` without reaching into OK's internals — and, since
[`docs/rules/knowledge.md:5-11`](../../../rules/knowledge.md) forbids spawning `ok`, whether the MCP
surface is sufficient *on its own*.

**Sources.** The live `mcp__open-knowledge__*` tool schemas in this session; the `ok` binary at
`/Users/abuusama/.ok/bin/ok` (**0.55.2**, a symlink to
`/Applications/OpenKnowledge.app/Contents/Resources/cli/bin/ok.sh`); the bundled JSON Schemas at
`/Applications/OpenKnowledge.app/Contents/Resources/cli/dist/schemas/v0/`; the bundled JS at
`.../cli/dist/*.mjs`; OK's own installed runtime skill at
`/Users/abuusama/projects/ambient-workspace/open-knowledge-boilerplate/.claude/skills/open-knowledge/SKILL.md`;
and `/Users/abuusama/.ok/logs/cli.2026-08-20.log`.

**Instrument.** A scratch OpenKnowledge project built for this research at
`…/scratchpad/kb` — **504 markdown documents** at the point of the enumeration measurements
(500 generated `bulk/p####.md`, plus `README.md`, `people/zeeshan.md`, `people/bad-person.md`,
`commitments/ship-the-thing.md`), rising to **525** once 20 deliberately schema-violating docs and a
template-instantiated stub were added. Its `.ok/config.yml` enables
`contentRules.frontmatter` against a hand-written JSON Schema at `.ok/schemas/person.schema.json`
transcribing `Person` from `/Users/abuusama/.ambient/schema.yaml:8-15`. Everything hands-on was run
there. **See "What I ran against the principal's home" at the foot — one early pair of MCP calls
carried `cwd: /Users/abuusama/.ambient/knowledge` and that turned out to be a finding in itself.**

**[read]** = asserted by the cited tool schema, file line, or bundled string. **[measured]** = I ran
it and this is its output. **[inference]** = mine, asserted by no source.

---

## Verdicts

| # | Sub-question | Verdict |
|---|---|---|
| 1 | Enumeration | **`exec` is the only path, and there is no cap in it.** `search` has `max: 100` and no match-everything query — `search("*")` on 504 docs returns *"No matches"*. There is no list/glob tool. `exec("find . -name '*.md'")` returned **500 of 500** files with parsed frontmatter for every one. The ceiling is the MCP client's own token budget: that response was **261,736 characters**. |
| 2 | Frontmatter access | **Structured, parsed, and free — from `exec` only.** Every `exec` response carries `enrichedPaths[].frontmatter` as a JSON object. `search` does not: its hits carry `snippet`, in which frontmatter appears flattened into raw text. OK *does* have a typed-frontmatter concept — `contentRules.frontmatter.schemas`, JSON Schema per path glob. |
| 3 | `exec`'s contract | **Sanctioned — it is the *mandated* read path, not a workaround.** Allowlist of ten read-only commands, one command or one pipe, no shell. But it is **raw filesystem, not the OK document set**: a file excluded by `.okignore` was still enumerated and enriched by `exec` while `lint` reported *0 documents* and `search` found nothing. |
| 4 | OK's own `lint` | **It already does `ontology lint`'s job — closed vocabulary included.** Pointed at a custom JSON Schema it emits `required`, `additionalProperties` and `enum` diagnostics with `frontmatterScope`/`frontmatterProperty`. Four gaps: severity is **always `warning`** (`errorCount: 0` in every run, and no config key raises it); output is capped at **10 files × 10 diagnostics** (22 problem files → 10 returned, `omittedFileCount: 12`); `appliesTo` is a **path glob, not a `type:` discriminator**; and `additionalProperties` never names the offending key. |
| 5 | Writes | **`edit` is a true merge-patch and `null` deletes — measured.** *"Frontmatter patched (2 set, 1 deleted)."* `write({template})` stores at `<folder>/.ok/templates/<name>.md`; `write({document:{path, template}})` instantiates it, substituting `{{date}}`/`{{user}}` and stripping the template's own identity. `write` also returns schema violations inline as `warnings[{kind:"lint-violation"}]`. |
| 6 | `ok mcp` project resolution *(added mid-task)* | **Not cwd at all — `ok mcp` is a global server with per-call routing.** Identical failure from a folder with no `.ok/`, from inside a project, and with `ok --cwd <kb> mcp`. It creates nothing. Three routing mechanisms exist: a per-call `cwd` argument, a single client-advertised MCP **root**, or `ok mcp -p <port>`. Ambient's `{command: ok, args: [mcp], env: {}}` supplies **none** of them, and `McpServer` has no field that could. |
| 7 | `ontology query` | **Nothing in the surface answers it, and that is the design.** `search` is BM25 + recency with no field filters, no comparisons, no grouping. `"commitments due < 2026-08-23 group by owner"` has no MCP analogue — which is exactly the case `knowledge-flow.md:131` makes for a derived index. |

**Headline.** Every verb is buildable on the MCP surface. `index` and `next` are one `exec` call
each. `lint` is OK's own `lint`, and Ambient's job shrinks to compiling `schema.yaml` into JSON
Schema and imposing the severity OK will not. `query` is Ambient's, as designed. **The one thing
that does not work today is the wiring** — §6.

---

## 1 — Enumeration

### The surface, in full

Twenty-one tools are exposed: `audit`, `checkpoint`, `config`, `conflicts`, `delete`, `edit`,
`exec`, `history`, `import`, `install`, `links`, `lint`, `move`, `palette`, `preview_url`,
`resolve_conflict`, `restore_version`, `search`, `share_link`, `skills`, `write` **[read]**, from
the deferred-tool listing in this session. **There is no `list`, `glob`, `ls`, or `documents`
tool.**

### `search` cannot do it, and its schema says why

`mcp__open-knowledge__search`, `limit` field **[read]**:

> "Max rows; default 20, max 100."

100 < 504. And there is no match-everything query — **[measured]**, against the 504-document
scratch project:

```
search({ query: "*", limit: 5 })
→ {"text":"No matches for \"*\".","resultCount":0,"results":[],"elapsedMs":2.68}
```

The tool's own description calls it *"Ranked retrieval"* and *"title boost + body BM25 + recency"*
**[read]**. It is a relevance engine, not an enumerator. It is also not an exact-match filter —
**[measured]**, `search({query:"reviewed", limit:4})` returned four `status: reviewed` docs and no
`unreviewed` ones, i.e. token-level matching, not substring; but the ordering signal reported per
hit is `{"lexical":0,"fullText":0.61,"recency":49.77}`, so *which* four you get is decided by
recency, not by the predicate.

### `links` enumerates, but only fragments

`kind: "orphans"` and `kind: "hubs"` return document sets **[read]** — but `hubs` takes
`limit` (*"default 20, max 100"* **[read]**) and `orphans` is by definition a subset. Neither is
"every document".

### `exec` does it, in one call, with no cap

**[measured]**, against `…/scratchpad/kb`:

| Call | `enrichedPaths` length | Unique paths in stdout | Entries with `frontmatter: {}` | `stdoutTruncated` | Response size |
|---|---|---|---|---|---|
| `find bulk -name '*.md'` | **500** | 500 | 0 | `false` | 261,736 chars |
| `grep -rl "type: Person" bulk/` | **500** | 500 | 0 | `false` | 262,236 chars |
| `grep -rn "^status: unreviewed" bulk/ \| head -300` | **300** | 300 | 0 | `false` | 164,698 chars |

Instrument: three `exec` calls made by a sub-agent, which counted the arrays with `jq` rather than
reading them inline. In all three, `enrichedPaths.length` **exactly equals** the number of unique
file paths in stdout. Nothing was dropped.

The 300 in row three is not an enrichment cap — it is the caller's own `head -300` truncating
stdout *before* enrichment, and OK says so, `warnings[0]` **[measured]**:

> "Output hit `head -300` cap (300 lines, 300 unique files). The `grep` stage may have had more
> matches that never reached stdout. For existence checks across many files, prefer
> `grep -rl PATTERN <dir>` (list files only, no head). For enumeration, drop the `| head` or widen
> the cap."

Ground truth: `grep -rn "^status: unreviewed" bulk/` matches **333** files **[measured]**, so
`head -300` hid 33. OK detected the truncation and did **not** claim to know the real number.

### The ceiling that does exist is the client's

All three responses exceeded the MCP tool-result token budget and were spilled to disk by the
harness. **[inference]** For `ontology index` this means the enumeration must be *paged by the
caller* — by folder, or by a `find`/`grep -rl` narrowed to one type — not because `exec` caps
anything, but because a 262KB tool result is not something a process wants in memory per call.
At the scratch corpus's shape that is roughly **520 characters of response per document**.

### Verdict

`ontology index` is `exec("find . -name '*.md'")`, in as many slices as the caller wants. It is the
only path, and §3 establishes it is the *sanctioned* one.

---

## 2 — Frontmatter access

### `exec` returns it parsed

**[measured]**, `exec({command: "find . -name '*.md'"})` on the four-document version of the
project — one entry from `enrichedPaths`, verbatim:

```json
{"path":"people/zeeshan.md","title":"Zeeshan","tags":[],
 "frontmatter":{"type":"Person","name":"Zeeshan","aliases":["Zee"],
                "numbers":["+441234567890"],"status":"unreviewed","source":"witnessed"},
 "backlinkCount":0,"graphRole":null,"commentCount":0,
 "schemas_applicable":[".ok/schemas/person.schema.json"],
 "previewUrl":"/#/people/zeeshan","previewUrlSource":"lock"}
```

Fully parsed YAML — arrays as arrays. A document with **no** frontmatter block returns
`"frontmatter":{}`, not null and not an error (`README.md`, same call) **[measured]**.
`schemas_applicable` names the frontmatter schema OK will validate that path against — present on
docs and on directories.

`exec("cat …")` adds `backlinks`, `forwardLinks`, `history`, `projectHistory`, `graphRole` and
`comments` as populated arrays; `find`/`ls` return them as `null` (a slim mode) **[measured]**.
Frontmatter is populated in **both**.

### `search` does not

**[measured]**, a `search` hit in full:

```json
{"kind":"page","path":"bulk/p0039","docName":"bulk/p0039","title":"Person 39",
 "score":600001.99,"signals":{"lexical":600,"fullText":0.126,"recency":49.68},
 "snippet":"--- type: Person name: Person 39 status: reviewed source: history --- # Person 39 body",
 "previewUrl":"/#/bulk/p0039","previewUrlSource":"lock"}
```

**No `frontmatter` field.** The frontmatter is inside `snippet`, flattened onto one line with its
`---` fences intact — text a caller would have to re-parse, having lost the line structure YAML
needs. **[inference]** Parsing that snippet is a trap: it is a *truncated* body preview, so on a
document with more than a handful of keys the frontmatter would be cut mid-block with no marker.

### The trap in `exec` enrichment: it resolves the tokens in stdout

Enrichment is driven by the **paths that appear in stdout**, not by what the command traversed.
Commands whose output carries bare filenames rather than paths mis-resolve. **[measured]**,
`exec({command: "ls -R"})` on the four-document project — every entry came back
`"frontmatter":{}`, because stdout listed `zeeshan.md`, not `people/zeeshan.md`. Worse,
`exec({command: "ls people/ commitments/"})` produced phantom entries
`commitments/bad-person.md` and `commitments/zeeshan.md` (neither exists) with empty frontmatter,
while `people/` itself vanished from the list — and OK's own GNU-style provenance headers had
scrambled the raw stdout into `commitments/: people/: bad-person.md zeeshan.md … commitments/:
ship-the-thing.md`.

**[inference]** This is not a reason to avoid `exec`; it is a reason `ontology index` must use
`find` or `grep -rl`, which emit full relative paths, and never `ls -R` or a multi-directory `ls`.

### Is there a typed-frontmatter concept in OK? Yes

`/Applications/OpenKnowledge.app/Contents/Resources/cli/dist/schemas/v0/config.project.schema.json`,
`properties.contentRules.properties.frontmatter` **[read]**:

```json
"enabled":  { "default": false, "type": "boolean", "agentSettable": false,
              "description": "Whether the frontmatter plugin (JSON-Schema validation of document frontmatter) contributes diagnostics." },
"schemas":  { "default": [], "type": "array",
              "items": { "type":"object", "required":["file"],
                         "properties": { "appliesTo": {"anyOf":[{"type":"string"},{"type":"array","items":{"type":"string"}}]},
                                         "file": {"type":"string"}, "enabled": {"type":"boolean"} } },
              "agentSettable": false,
              "description": "Frontmatter schema mappings: which docs (appliesTo globs) validate against which JSON Schema file (project-root-relative path)." }
```

That is §4's whole story. Note `agentSettable: false` on both, and that
`mcp__open-knowledge__config` is described as **"a pure READ"** with *"no allowlist on reads"*
**[read]** — so no MCP tool can turn this on. Ambient must write it into `.ok/config.yml` itself,
which `home` already does for that file.

**[inference]** OK's own convention pulls a different way. Its runtime skill says *"Every `.md` /
`.mdx` needs YAML frontmatter — `title` + `description` required, `tags` recommended"*
(`.claude/skills/open-knowledge/SKILL.md:89` **[read]**). Ambient's `schema.yaml` has neither, and a
schema with `additionalProperties: false` would reject them. That collision is real but not
settled here.

---

## 3 — `exec`'s contract

### What it will run

`mcp__open-knowledge__exec` description **[read]**:

> "Allowlist: cat, ls, grep, find, head, tail, wc, sort, uniq, cut. One command or a pipe (|) per
> call — NOT a shell: `&&`, `;`, redirections, subshells, and writes are rejected."

Enforced. **[measured]**, `exec({command: 'python3 -c "print(1)"'})`:

```
Command 'python3' is not in the allowlist. For pattern matching try 'grep'; for file listing
try 'ls' or 'find'. Allowlist: cat, ls, grep, find, head, tail, wc, sort, uniq, cut.
```

### What it is scoped to

> "the command runs in the explicit absolute `cwd` you pass … Paths inside the command resolve
> relative to that cwd; traversal above it is rejected." **[read]**

**[measured]**, `exec({command: "cat ../../../../etc/hosts", cwd: <scratch kb>})`:

```
stderr: cat: ../../../../etc/hosts: No such file or directory
```

Not a shell, then, but a jail around one project.

### Is `cat`-and-enumerate sanctioned? It is *mandated*

The tool's own description opens with a STOP rule **[read]**:

> "**STOP — when the project has `.ok/`, do NOT use native `Read`/`Grep`/`Glob` on in-scope
> `.md`/`.mdx`; use `exec` (this tool).** Native tools skip the frontmatter, backlinks, unresolved
> comments, shadow-repo activity, and git history `exec` returns per wiki file."

OK's installed runtime skill is more explicit still —
`…/open-knowledge-boilerplate/.claude/skills/open-knowledge/SKILL.md:43` **[read]**:

> "**`Bash ls` / `Bash find` / `Bash cat` on dirs containing in-scope markdown** — use
> `exec("ls -A …")` / `exec("find … -name '*.md'")` / `exec("cat …")`. Native returns bare names;
> `exec` returns frontmatter, backlink counts, and recent activity."

and `:59-61` **[read]** lists exactly the three recipes this finding uses:

> "Read a file: `exec("cat <path>.md")` … List a directory: `exec("ls -A <dir>")` … Literal search:
> `exec("grep -rn <term> <dir> | head -5")`"

**Using `exec` to enumerate and read frontmatter is not an end-run around the tool surface. It is
the tool surface.** The end-run OK forbids is the opposite one — reading the same files with native
file tools.

### The defect that matters for `index`: `exec` is not scoped to the document set

`search`'s description says it ranks *"across ALL non-ignored files"* **[read]**. `exec` claims to
run *"against the project content directory"* **[read]**. It does not apply `.okignore`.

**[measured]**, one experiment: `secret/hidden.md` created, `.okignore` set to `secret/`.

| Surface | Result |
|---|---|
| `exec({command: "find secret -name '*.md'"})` | returns `secret/hidden.md`, **fully enriched** with its frontmatter |
| `lint({path: "secret"})` | `"No problems across 0 documents in secret."`, `fileCount: 0` |
| `search({query: "Hidden"})` | `"No matches for \"Hidden\"."` |
| `ok preview` (fresh CLI process, no server) | `Found 526 markdown files in ./` — the file counted |

`.okignore` works for the indexed surface and not for `exec`. I also tried `secret/**`, `secret`,
`/secret/` and `**/hidden.md`: `ok preview` reported 526 for all four **[measured]**.

**[inference]** So `exec("find … -name '*.md'")` returns a **superset** of OK's document set.
For Ambient this is a live hazard rather than a curiosity: `home` writes an `.okignore` from a
template (`src/modules/home/internal/templates.ts:202-206`) and anything a principal later adds to
it would silently *not* be excluded from `ontology index`, while remaining invisible to `search`
and `lint`. Reconciling the two would mean intersecting `exec`'s enumeration against something —
and nothing in the MCP surface returns "the document set" to intersect against.

---

## 4 — OK's own `lint`: it is the same job, not a different one

### What it validates

Both body rules and frontmatter. `lint`'s description names markdownlint **[read]** and does not
mention frontmatter at all; `audit`'s says its `source` field names *"'markdownlint' rule
violations; 'links' broken internal links"* **[read]**. **Both descriptions are incomplete** — with
`contentRules.frontmatter.enabled: true` both tools emit `source: "frontmatter"` diagnostics
**[measured]**.

**[measured]**, `lint({path: "people"})` against the `Person` JSON Schema, structured output:

```json
{"file":"people/bad-person.md","diagnostics":[
  {"severity":"warning","source":"frontmatter","code":"required",
   "message":"Frontmatter property \"source\" is required",
   "frontmatterScope":"missing","frontmatterProperty":"source"},
  {"severity":"warning","source":"frontmatter","code":"additionalProperties",
   "message":"Frontmatter must NOT have additional properties","frontmatterScope":"invalid"},
  {"severity":"warning","source":"frontmatter","code":"enum",
   "message":"Frontmatter property \"status\" must be one of: unreviewed, reviewed (got \"definitely-not-a-legal-status\")",
   "frontmatterScope":"invalid"}]}
```

Set that beside what `knowledge-flow.md:45` says `lint` is for — *"Validate every doc's frontmatter
against `schema.yaml` — legal type, required props, no forbidden props"*:

| `knowledge-flow.md:45` | OK diagnostic |
|---|---|
| legal type | `enum` on a `type` property, or `const` |
| required props | `code: "required"` + `frontmatterProperty` |
| no forbidden props | `code: "additionalProperties"` |
| closed vocabulary on a value | `code: "enum"`, and the message prints the legal set **and the value it got** |

**Plainly, then: OK's `lint` already does what `ambient ontology lint` intends.** What is left for
Ambient is not validation. It is four gaps.

### Gap 1 — `appliesTo` is a path glob, not a `type:` discriminator

`schemas[].appliesTo` selects *"which docs (appliesTo globs) validate against which JSON Schema
file"* **[read]**. Ambient's `schema.yaml` is keyed by **type** (`Person:`, `Commitment:`, …), and
`type` is a frontmatter value, not a path. **[inference]** Two shapes work and nothing else does:
one folder per type (`people/**` → `person.schema.json`, as measured here), or one project-wide
schema whose top level is a `oneOf` discriminated on `type`. The first is what the design's own
paths imply (`people/zeeshan.md` at `knowledge-flow.md:113`); the second survives a document whose
type changes without a move. Either way Ambient compiles `schema.yaml` → JSON Schema, which is a
transformation of ~45 lines of closed field forms and is not hard.

### Gap 2 — severity is always `warning`, and nothing raises it

`errorCount: 0` in every measured run — including 84 frontmatter violations across 22 files. The
project config has exactly one severity knob, and it is not this one
(`config.project.schema.json`, `properties.validation.properties.links`) **[read]**:

```json
"links": { "default": "warning", "enum": ["off","warning","error"],
           "description": "How broken internal links are reported on the validation plane: 'off' hides them, 'warning' (default) or 'error' sets their severity." }
```

`properties.validation` has only `links` and `fileTreeIndicators`; the top-level config keys are
`autoSync, bridge, content, contentRules, lossCapture, remote, server, telemetry, terminal,
validation` **[read]**. **[inference]** So "a schema violation fails the build" is Ambient's
decision to make in `knowledge`, from `warningCount`. That is one line, and it is arguably where it
belongs — OK is a notes app and has no business deciding Ambient's exit code.

### Gap 3 — the 10 × 10 cap is real, and `ontology lint` will hit it

`lint`'s description **[read]**:

> "Audit output (text and structured) is capped at 10 files × 10 diagnostics per file, with explicit
> '... and N more' indicators; the counts always reflect the full scan"

**[measured]**, whole-project `lint()` over 525 documents with 20 seeded violators plus two others:

```
"22 of 525 documents with problems — 84 warnings:"   … "… and 12 more files with problems"
files: 10 entries      fileCount: 525      errorCount: 0
warningCount: 84       omittedFileCount: 12
```

The counts are honest — `warningCount: 84` is the full scan — but only 10 files come back per call.
`audit({path: "people"})` behaved identically: `fileCount: 23`, `warningCount: 84`,
`omittedFileCount: 12` **[measured]**. **[inference]** `ontology lint` therefore reports *how many*
in one call and must page by `path` to report *which* — folder by folder, or file by file via
`lint({document})`, which returns that document's diagnostics uncapped.

### Gap 4 — `additionalProperties` does not name the property

`frontmatterProperty` is populated for `required` and absent for `additionalProperties`
**[measured]** — a document with two forbidden keys (`colour`, `extra`) produced **two** identical
diagnostics reading only *"Frontmatter must NOT have additional properties"*, both at line 1
columns 0-3. **[inference]** For a closed-vocabulary guard whose entire purpose is stopping the
model inventing fields, "you invented one, I won't say which" is the single most annoying possible
output. Ambient has the parsed frontmatter from `exec` and the schema it compiled, so it can name
the key itself — but that means `ontology lint` is a thin *re-reporting* layer over OK's
diagnostics, not a pure pass-through.

### The bonus: the guard also fires at the write boundary

`write` returns violations inline. **[measured]**, creating a document from a template that
supplies no `name`:

```json
"warnings":[{"kind":"lint-violation","source":"frontmatter","code":"required",
             "message":"Frontmatter property \"name\" is required",
             "severity":"warning","line":1,"column":1}]
```

**[inference]** This is worth more than `ontology lint` itself. The mechanical `stub` pass at
`knowledge-flow.md:44` can know its stub was illegal *at the moment it wrote it*, without a
separate lint sweep.

---

## 5 — Writes

### `edit` frontmatter is a genuine merge-patch, and `null` deletes

`edit`'s description **[read]**: *"Metadata: `{ path, frontmatter }` (merge-patch; `null` deletes a
key). Body find/replace is body-only; frontmatter-intersecting finds are rejected."*

**[measured]**. `edit({document:{path:"people/zeeshan", frontmatter:{role:"engineer", aliases:null,
status:"reviewed"}}})`:

```
"Frontmatter patched (2 set, 1 deleted)."
```

On disk afterwards **[measured]** — `aliases` gone, `role` appended, `status` changed, everything
else untouched, and the body intact:

```yaml
---
type: Person
name: Zeeshan
numbers: [ "+441234567890" ]
status: reviewed
source: witnessed
role: engineer
---
```

The `[Zee]` → *(deleted)* and the flow-style reflow of `numbers` are OK's serializer, not a
content change.

`knowledge-flow.md:115` states this correctly and it is confirmed.

### Templates: where they come from and what `write` does with them

A template is a document under the **folder's own** `.ok/` **[read + measured]**.
`write({template:{path:"people/person", content, frontmatter:{title, description}}})` returned:

```
Created template "person" in people (people/.ok/templates/person.md).
```

On disk **[measured]** — the picker identity lands under a reserved `template:` key, above the
starting properties:

```yaml
---
template:
  title: Person stub
  description: Ambient's mechanical Person stub
type: Person
status: unreviewed
source: witnessed
---

# {{date}}

Stub created by the mechanical pass.
```

Resolution, from `write`'s `document.template` field **[read]**: *"resolved against the parent
folder's `templates_available`, leaf→root walk-up, closest-wins"* — and only `{{date}}` and
`{{user}}` substitute, *"any other `{{...}}` token hard-errors at write time"*.

**[measured]**, `write({document:{path:"people/new-stub", template:"person"}})` produced:

```yaml
---
type: Person
status: unreviewed
source: witnessed
---

# 2026-08-20
```

`{{date}}` substituted, the `template:` identity stripped, the starting properties kept.

**[inference]** This is exactly the mechanical `stub` step at `knowledge-flow.md:44`: one template
per type, holding `type` and the initial `status: unreviewed`, so the stub carries the queue state
by construction rather than by a caller remembering to set it. The catch is visible in the same
measurement — the template cannot supply `name`, so every stub is born schema-invalid until the
caller patches it. Either the schema makes `name` optional for `status: unreviewed`, or `stub` does
`write({document:{path, template}})` then `edit({document:{path, frontmatter:{name}}})`, or it
skips the template and passes `frontmatter` inline. **The third is one call instead of two** and
`write`'s own schema allows it: `{path, content, frontmatter}` writes YAML inline on create.

### The rest of the write path

`delete({document})` takes a path, an array of paths, or `{path}` **[read]**; `move({from,to})`
rewrites inbound wiki-links and inline links **[read]**. `write({documents:[…]})` batches
**[read]**. So `knowledge-flow.md:110-117`'s CRUD table is accurate as written.

One schema subtlety worth carrying into the design **[read]**: supplying `frontmatter` alongside
literal `content` *"forces `position: replace` … overriding an explicit `append`/`prepend`"*, and
`position` is *required* when overwriting an existing document. A caller that means "append prose
to an existing Person doc" must therefore make two calls, not one, if it also wants to touch
frontmatter.

---

## 6 — How `ok mcp` resolves its project *(added mid-task; the premise needed correcting)*

### The claim under test

Ambient's shipped MCP definition, `src/modules/home/internal/templates.ts:32-35` **[read]**:

```yaml
mcp: # server definitions, global. Referenced by name per chat and per agent.
  openknowledge:
    command: ok
    args: [mcp]
    env: {}
```

and `src/modules/home/types.ts:85-90` **[read]** — `McpServer` is `{name, command, args, env}`,
**no `cwd` field**. The worry was that `ok mcp` resolves its project from the working directory, and
that a chat folder is a sibling of `knowledge/`, not an ancestor.

### Finding: `ok mcp` does not resolve a project from cwd — or from anywhere

**[measured]**, three runs, each driving a real JSON-RPC `initialize` + `tools/call` over stdio:

| Run | Process cwd | Extra args | Result of `exec({command:"ls -A"})` with no `cwd` argument |
|---|---|---|---|
| A | `…/nook/chats/capxul-devs` (no `.ok/`) | — | error, below |
| B | `…/scratchpad/kb` (**a real OK project**) | — | **identical** error |
| C | `…/nook/chats/capxul-devs` | `ok --cwd <kb> mcp` | **identical** error |

The error, verbatim in all three **[measured]**:

```
exec failed: `cwd` is required for tool calls against the global MCP server.
Pass an absolute path inside an OpenKnowledge project, or have the MCP client advertise a single root.
```

and stderr, verbatim **[measured]**:

```
[mcp] global stdio server ready (per-call project routing)
```

So: **there is no upward walk to find a `.ok/`, because there is no cwd-based resolution at all.**
Run B is the proof — starting *inside* a valid project changes nothing. **`ok --cwd <path> mcp` does
not work either** (run C); `--cwd` is a global CLI option that `mcp` ignores.

### Finding: it creates nothing

**[measured]**, run A, `find` over the directory tree before and after — byte-identical, three
entries both times (`nook`, `nook/chats`, `nook/chats/capxul-devs`). No `.ok/`, no `.git`, no
silent scaffold. It exits 0.

### Finding: there is no env var

`grep -rhoE '\bOK_[A-Z0-9_]+' /Applications/OpenKnowledge.app/Contents/Resources/cli/dist/*.mjs |
sort -u` returns **51 names** **[measured]**. There is no `OK_PROJECT`, no `OK_CWD`, no
`OK_CONTENT_DIR`. `/Users/abuusama/.ok/env.sh` is five lines and only prepends `~/.ok/bin` to
`PATH` **[read]**.

### The three routing mechanisms that *do* work

**(a) A per-call `cwd` argument.** Every tool's `cwd` field says so **[read]**, and every
measurement in §§1-5 used it.

**(b) A single client-advertised MCP root.** The same field says *"unless the MCP client advertises
exactly one root via the `roots` capability — that single root is then used as the implicit `cwd`"*
**[read]**. **[measured]** — a probe that declared `capabilities.roots` in `initialize`, ran with
process cwd `…/nook/chats/capxul-devs`, and answered OK's callback:

```
SERVER ASKED roots/list -> {"method":"roots/list","jsonrpc":"2.0","id":0}
→ replied {"roots":[{"uri":"file://…/scratchpad/kb","name":"kb"}]}
TOOL RESULT: ".git .ok .okignore README.md bulk commitments people" + full enrichment
```

The call succeeded with **no `cwd` argument**, against a project the process was not in.

**(c) `ok mcp -p <port>`.** `ok mcp --help` **[read]**: *"Override per-call routing and proxy stdio
to this HTTP MCP port (skips bundle proxy)."* **[measured]** — with a server started on 39411 for
the scratch project, `ok mcp -p 39411` from `…/nook/chats/capxul-devs` served a `cwd`-less
`exec({command:"ls -A"})` against the scratch project, stderr
`[mcp-shim] proxying stdio to http://127.0.0.1:39411/mcp`.

### What this means for Ambient

**[inference]** The shipped definition supplies none of the three. It is not wrong *about cwd* — cwd
is simply irrelevant — but the outcome is the one feared: an agent in a chat folder gets a server
that answers `tools/list` and fails every call. And **no repair fits inside `McpServer` as typed**:

- (a) is a *per-call argument*, not server config. It would have to be injected by whatever
  constructs tool calls — which by `seams.md:30` is `knowledge`, "hides the OK MCP client", and by
  `seams.md` line 44 sits behind `harness`.
- (b) is a *client capability*. Whether Pi advertises `knowledge/` as its single root is a `harness`
  question, invisible to `templates.ts`.
- (c) needs a port that only exists because someone ran `ok start`, which
  `docs/rules/knowledge.md:5-7` forbids Ambient from doing.

**[inference]** (b) is the cleanest: one root, declared once per session by `harness`, and every
`mcp__open-knowledge__*` call routes without an argument. It also matches
`docs/rules/knowledge.md:10` exactly — *"addressed over MCP, never by path"* — because the path is
declared to the protocol once and never appears in a call.

### The bundle proxy is not part of this

**[measured]**, stderr on every run: `{"event":"mcp-bundle-proxy","mode":"suppressed-self",
"bundlePath":null,"reason":null,"hint":"Suppress with --no-bundle-proxy or OK_BUNDLE_PROXY=0."}`.
The proxy decides *which process hosts* the stdio server (the Desktop app bundle vs. in-process) and
is orthogonal to project routing — all three failing runs and both succeeding ones reported the same
proxy mode. `--no-bundle-proxy` changes nothing about resolution.

---

## 7 — `ontology query`

`knowledge-flow.md:125` wants `"commitments due < 2026-08-23 group by owner"`. Nothing in the
surface answers it. `search` has no field predicates, no comparison operators, no grouping, and no
`frontmatter` in its results (§2). `exec`'s allowlist has `grep`, `sort`, `uniq` and `cut` but no
`awk`, no `jq`, and one pipe per call.

**[inference]** This is not a gap — it is the case `knowledge-flow.md:131` already makes: *"the
index … exists only because 'every open commitment due before Friday, grouped by owner' is not
something `grep` should answer."* The research confirms the premise: OK will hand you every
document's frontmatter, parsed, and will not aggregate over it. The fold is Ambient's, and its
input is one `exec` call.

---

## What I ran against the principal's home, and what it proves

My first two MCP calls in this session carried `cwd: /Users/abuusama/.ambient/knowledge` —
`config({cwd})` and `exec({command:"ls -A", cwd})` — followed shortly by `search({query:"*", cwd})`.
I ran no `ok` command against that path. OK ran one anyway.
`/Users/abuusama/.ok/logs/cli.2026-08-20.log:6` **[read]**:

```json
{"level":30,"time":"2026-08-20T07:19:23.186Z","pid":59965,"runtime":"cli","project":"<no-project>",
 "name":"cli","command":"start","cwd":"/Users/abuusama/.ambient/knowledge","msg":"cli command started"}
```

**An MCP tool call carrying a `cwd` auto-spawns `ok start` for that project.** The same log shows the
identical pattern for the scratch project at `:8` (pid 64478, 07:20:28) — a server I had not asked
for, which my later explicit `ok start` then refused to duplicate: *"An MCP-spawned OpenKnowledge
server is already running on this project (pid 64478)"* **[measured]**.

The mechanism is named in the shipped bundle **[read]**:

> `OpenKnowledge server is not running and OK_MCP_AUTOSTART=0 disables auto-start.`

What that start left behind, read-only `ls` **[measured]** — `.ok/config.yml` and `.ok/.gitignore`
retain their original `Aug 17 13:55` timestamps; everything else is new as of `Aug 20 07:19`:

```
~/.ambient/knowledge/.git/            → contains: ok
~/.ambient/knowledge/.ok/local/       → cache, last-spawn-error.log, logs,
                                        principal.json, server.lock, state.json,
                                        telemetry, ui.lock
```

**Why this belongs in the findings.** `docs/rules/knowledge.md:5-11` says *"No code in this
repository spawns `ok`"* and *"At runtime the knowledge base is addressed over MCP."* Those two
sentences were written as if they were alternatives. **They are not.** Addressing the knowledge base
over MCP *is* what spawns `ok start`, and it produces precisely the artefacts the rule's own *Why*
section objects to — a git store and a directory of machine state inside an Ambient home.

**[inference]** The rule holds; its check does not cover this. `home.test.ts` asserts the scaffold is
exactly `.ok/` and `.okignore` — which was still true of `config.yml` and `.gitignore` here, and said
nothing about `.git/ok/` or `.ok/local/` appearing later at runtime. Two things follow, and neither is
mine to decide: whether `env` on the `openknowledge` MCP definition should carry
`OK_MCP_AUTOSTART: "0"` (the `env: {}` at `templates.ts:35` is exactly the slot for it), and whether
`.okignore` / `home`'s notion of the scaffold should expect `.ok/local/` and `.git/` to exist.
**I did not test `OK_MCP_AUTOSTART=0`**, because doing so means making an MCP call against a project
with no running server, and the only such project left is the principal's.

*No file under `~/.ambient/` was created, edited or deleted by me directly; the writes above are OK's,
triggered by the calls named. Per the coordinator's instruction I ran no repair, no `ok stop`, and no
further `ok` or MCP call bound to that path.*

---

## What this does not establish

- **Whether `OK_MCP_AUTOSTART=0` actually suppresses the spawn.** The string is in the shipped
  bundle **[read]**; I did not run it. Testing it needs a project with no running server.
- **Why `.okignore` did not exclude `secret/hidden.md` from `exec` and `ok preview` while it did
  exclude it from `lint` and `search`.** Four pattern forms were tried. Whether `exec` is
  deliberately raw-filesystem or this is a bug, the tool schema does not say and I found no source
  that does. The *divergence* is measured and reproducible; its intent is not.
- **What `ontology index` should cost on a real corpus.** The 500-document instrument is synthetic —
  four frontmatter keys, a nine-byte body. `~/.ambient/knowledge/` holds **zero** documents
  **[measured, `ls`]**, so there is no real corpus to measure against yet. The 520-chars-per-document
  figure will not survive real prose, real `aliases[]`, and real backlinks.
- **Whether `oneOf`-on-`type` works in OK's frontmatter plugin.** I measured a flat schema against a
  path glob. A discriminated union is the shape §4 Gap 1 recommends and I did not test it; the
  plugin's JSON Schema dialect and draft support are not documented in the config schema.
- **Whether Pi advertises an MCP root.** §6(b) is measured against a probe *I* wrote. Whether the
  `harness` module's actual MCP client can advertise one, and what it would advertise, is a `harness`
  question this research did not touch.
- **How OK's `title`/`description` frontmatter convention interacts with a closed schema.** Its
  runtime skill requires them (`SKILL.md:89` **[read]**); `schema.yaml` does not have them and an
  `additionalProperties: false` schema would reject them. Unresolved.
- **Anything about `import`, `install`, `skills`, `checkpoint`, `conflicts`, `share_link` or
  `preview_url`.** Out of scope for R1 and untouched.
