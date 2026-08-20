# ADR 007 — `knowledge` writes files; OpenKnowledge is a format and a viewer

**Status:** accepted, 2026-08-20 · **Slice:** KNOWLEDGE
· **Amends:** [knowledge.md](../rules/knowledge.md), [product.md](../design/product.md)
· **Supersedes:** nothing

## Context

[knowledge.md](../rules/knowledge.md) said two things, and they were written as
alternatives:

> We match OpenKnowledge's format. We never call its CLI. […] At runtime the knowledge
> base is addressed over **MCP**, never by path.

**They are not alternatives. Addressing the knowledge base over MCP is what spawns `ok`.**
Measured this session, and not by argument: an agent's first MCP call carrying
`cwd: ~/.ambient/knowledge` caused `ok start`, which wrote a `.git/ok/` store and eleven
files under `.ok/local/` into the principal's real home. The rule's own stated reason for
not calling `ok init` — *"it creates a nested `.git`"* — was reproduced by the path the
rule prescribes.

*Instrument: `/Users/abuusama/.ok/logs/cli.2026-08-20.log:6`, and `ps` on the surviving
`open-knowledge-server` process. Cleaned up; `knowledge/` is `[.ok, .okignore]` again and
`doctor` exits 0.*

The design that rule protects is in [knowledge-flow.md](../design/knowledge-flow.md):
*"the ported ontology tool is a validator, a queue and an indexer — not a CRUD layer"*,
because *"CRUD is not ours to build"* — OpenKnowledge already is one. That reasoning was
sound and is not what changed. What changed is that the four things it was buying were
measured.

**The principal's stated reason for the dependency was automation:** *"there are things
that should be done automatically, like automatic updating of things, dates and stuff like
that."* Five research passes went out. Their findings are in
[`../planning/knowledge/findings/`](../planning/knowledge/findings/), every claim labelled
`[read]`, `[measured]` or `[inference]`.

| What was expected | What was measured |
|---|---|
| Automatic dates | **None.** A `write` produces exactly the frontmatter passed. Four subsequent `edit`s added no `created`, `updated`, `modified` or `title`. The one named behaviour does not exist. |
| A tool surface | **A daemon.** With `OK_MCP_AUTOSTART=0` and no server, **12 of 14 tools failed**, `exec` included. One call spawns a per-project server that idles out after 30 minutes. |
| The format needs OpenKnowledge | **It does not.** `ok preview` and `ok lint` found and passed a document in a directory with **no `.ok/` at all**; `ok start` served six plain-`fs` documents, deriving titles from the `# H1`; a file written by `fs` while the server ran appeared in its API and backlink cache in **6 seconds**; our frontmatter round-tripped byte-identically, key order and flow arrays included. |
| Roughly 250 lines to build ourselves | **Held exactly.** `lint + next + index` plus the shared read and the interface is **250 code lines on the nose**; all five verbs including `stub` and `query` are **326**. Written, typechecked, and passing a test that decodes the real `schema.yaml` through `home`'s real `readSchema`. |
| Attribution we would lose | **Copied from us in the first place.** `principal.json` carries `"source": "git-config"` and lifts `display_name` and `display_email` from `git config` — the same two values this machine already has. |

Two defects were found on the write path, and one of them lands on the operation this
Slice needs most:

- **`write` silently drops empty arrays.** `aliases: []` and `numbers: []` were passed and
  neither reached disk, leaving a `Person` **missing two required fields** — which is the
  normal shape of a mechanical stub.
- **OK's conventional `tags:` key is a forbidden property** under `schema.yaml`'s closed
  vocabulary, on both routes.

And the protocol underneath it has moved. [ADR 006](006-schema-is-the-parse-boundary.md)'s
sibling finding, from reading the specification rather than recalling it: the current MCP
revision is **`2026-07-28`**, in which `initialize` and `notifications/initialized` are
**deleted** — `InitializeRequest`, `SessionId`, `SubscribeRequest` and `PingRequest` all
have zero occurrences in the normative schema. OpenKnowledge 0.55.2 runs that handshake and
holds sticky per-session project state, which the current revision forbids. Of its three
project-routing mechanisms, one is forbidden, one is deprecated, and the survivor is a
per-call argument that does not fit inside `McpServer` as typed.

*Instrument: `schema/2026-07-28/schema.ts`, 98,426 bytes, fetched and read locally;
`LATEST_PROTOCOL_VERSION` at line 30, symbol counts by `grep -c`, verified twice.*

## Decision

**`knowledge` reads and writes markdown files with typed frontmatter, directly. No code in
Ambient ever spawns `ok`, and nothing in Ambient's write path depends on a server.**

OpenKnowledge keeps two jobs, both real and neither a dependency:

1. **A format we conform to.** The folder opens in the OpenKnowledge app because the bytes
   match, which is measured above and costs nothing.
2. **A viewer.** The principal opens it there to read and to correct by hand. Ambient's
   watcher-free write path and OK's file watcher reconcile in about ten seconds.

`home` grows one property, beside the one that already has exactly this shape:

```typescript
/** → the `blobs` module. A property, not a `Grant`: the root has no name to be wrong. */
readonly blobs: Place
/** → the `knowledge` module. Same reasoning. */
readonly knowledge: Place
```

The path is already computed at [`home/internal/disk.ts:51`](../../src/modules/home/internal/disk.ts)
for scaffolding and merely unexported, so this is one line, not a redesign.

**Version history is the home's own git**, not a shadow repository owned by another tool.
`~/.ambient` already carries a `.gitignore` excluding `blobs/` and `state.db`, and
[product.md](../design/product.md) already settles *"Configuration is files in a git
repo"* — but **`git init` has never been run there**, so the settled statement is
aspirational and this Slice makes it true.

*Instrument: `git -C ~/.ambient rev-parse --is-inside-work-tree` → `fatal: not a git
repository`, 2026-08-20.*

**Provenance stays what it already is.** `source: enum(history|witnessed)` in `schema.yaml`
is provenance about the world — did this come from the principal's Archive, or did Ambient
witness it. OpenKnowledge's attribution answers a different and smaller question: which of
four client channels wrote a file. Ours is required, per-document, and named in
[ADR 003](003-history-import-is-an-archive.md) decision 5 as a thing that must never be got
wrong. It is not a thing being given up.

**MCP is not rejected — it is repositioned.** The principal's line, and it holds: regular
tools are what Ambient builds for itself; MCP is for user-added extension, so the system
can be widened without a release. The specification takes no position either way — it
defines a wire protocol between two processes and has no concept of an in-process tool — so
this is a choice about cost, not conformance.

## What this amends

**[knowledge.md](../rules/knowledge.md)** — *"At runtime the knowledge base is addressed
over **MCP**, never by path."* That clause is withdrawn. Everything else in that rule
stands and is strengthened: we still match the format, we still never call the CLI, and
`home` still writes the scaffold from its own templates. The rule's error was believing MCP
was a way of not calling `ok`.

**[product.md](../design/product.md)**, Settled — *"Use OpenKnowledge's MCP directly. An
OK-compatible server of our own is a later problem."* The first sentence is withdrawn. The
discipline it attached — *"depend on OK's tool surface, never on its internals"* — is
superseded by something stricter: depend on the **format**, not the tool surface. Swapping
the implementation stops being a config change and becomes a non-event, because there is no
implementation to swap.

Both are recorded here rather than edited away, per
[decisions.md](../rules/decisions.md).

## The alternatives, and why they lost

| Alternative | Why it lost |
|---|---|
| **Keep the MCP as the write path** | Costs a daemon per knowledge base, a shadow git repo, and a telemetry sink recording document paths that is on by default and `agentSettable: false`. Buys automation that does not exist, and carries a defect that breaks the mechanical stub. |
| **Keep the MCP, work around the defects** | The empty-array drop is workable; the daemon is not a defect but a shape. Working around a shape means owning it anyway, at the cost of also owning theirs. |
| **Format-only, but keep the MCP declared for reasoning agents** | Genuinely tempting, and not foreclosed — a chat may still declare the server. But it must not be how Ambient writes, and `search` capping at 100 with no wildcard means it is a poor read path too. Left to `capabilities`, which is where a per-chat server list belongs. |
| **Write our own MCP server now** | The stated end goal, and premature. Nothing consumes it yet, and `2026-07-28` is four weeks old. Straight functions are what a server would wrap; building the functions first loses nothing. |
| **Build nothing; let agents edit markdown freely** | The closed vocabulary is the whole point — `schema.yaml` is *"a closed field vocabulary with an open type space"*, and it is worth exactly what enforces it. |

## Consequences

- **The tool becomes the thing that guarantees valid frontmatter.** This is the
  requirement the MCP was being kept for and it does not go away — it moves. A verb that
  writes knowledge validates against `schema.yaml` and **refuses**; validation is at the
  write boundary, not only in a `lint` run afterwards. Ambient's version is stricter than
  what it replaces, for a measured reason: OpenKnowledge's `write` silently dropped
  `aliases: []` and `numbers: []` and produced a `Person` missing two required fields.
- **One dependency does not get added.** Ambient's runtime dependency count is unchanged;
  `ok` becomes a thing the principal has installed, like a text editor.
- **`seams.md`'s `knowledge` row changes.** *"Hides the OK MCP client"* is no longer what
  the module is about. It hides the **layout and the frontmatter codec**.
- **We own frontmatter round-tripping.** OK's `edit` is surgical — measured changing one
  line in a file with a YAML comment, mixed quoting, a flow array and a block scalar. A
  naive `parse → mutate → stringify` is not, and this is the one capability genuinely
  given up. Mitigated by [ADR 006](006-schema-is-the-parse-boundary.md): a declared
  `Schema` encodes canonically, which is the same mechanism that made 13,134 Transcript
  lines re-encode byte-identically.
- **A non-atomic hand edit can register a phantom document** in OK's removal ledger —
  measured with `sed -i ''`, and reproducible by any atomic temp-file write. Our writes
  must land as a single `rename`, or the viewer accumulates ghosts.
- **`ambient init` must `git init` the home**, and `doctor` must notice when it has not.
  New work this ADR creates.
- **Folder naming must be declared.** A type does not give you its folder — `Person` →
  `person/`, never `people/`. Found by a failing assertion in the spike.
- **Identity is `(type, name)`, not a path.** "Do not overwrite" by filename silently
  duplicates. Also found by a failing assertion.

## Falsifiers

1. **The folder stops opening in OpenKnowledge.** The whole trade is that the format is
   free. If a document Ambient writes is rejected, ignored or mangled by `ok preview`,
   `ok lint` or the app, the premise is gone. Re-run the measurement each time the schema
   grows a type.
2. **Frontmatter round-tripping costs more than the 326 lines saved.** If preserving a
   hand-edited file's bytes through a programmatic frontmatter change needs more machinery
   than `Schema` gives, OK's surgical `edit` was worth the daemon.
3. **The read path needs what only a server provides.** If the hand-operated passes turn
   out to need full-text search over thousands of documents rather than the work queue,
   `next` was the wrong read and this ADR under-scoped the problem.
4. **The home's git is the wrong granularity.** If a pass produces a change a commit cannot
   usefully bound — one commit per document, or per hundred — then 30-second debounced
   snapshots were answering a real question.
