# KNOWLEDGE · R3 — What the OpenKnowledge MCP actually gives us, tool by tool

**Question.** The principal, in his words: *"Open knowledge is the format for our thing — they're
just markdown files. Doing CRUD on the actual markdown files can be done directly, but the problem
is there's a lot of frontmatter and things that need to be done right, and then there are things
that should be done automatically… Ideally we would just create our own tools."* So: **keep the OK
MCP, or write straight TypeScript functions?** This finding does not decide that. It inventories
what the MCP gives us, so the decision is made against facts.

**Sources.** The twenty-one live `mcp__open-knowledge__*` tool schemas in this session; the `ok`
binary at `/Users/abuusama/.ok/bin/ok` (**0.55.2**); the bundled JS at
`/Applications/OpenKnowledge.app/Contents/Resources/cli/dist/*.mjs`; the bundled JSON Schemas at
`.../cli/dist/schemas/v0/`; and OK's own shipped runtime skill, installed by `ok init` at
`<project>/.claude/skills/open-knowledge/SKILL.md`.

**Instrument.** A **fresh** OpenKnowledge project created for this research by `ok init` at
`…/scratchpad/r3`, plus the 525-document project `…/scratchpad/kb` left by R1. Every hands-on
measurement below is against `r3` unless it says `kb`. `r3` ended the session with five documents,
about fifteen mutations, one hand-created file, one hand-edited file and two hand-deleted files.

**Nothing was run against `/Users/abuusama/.ambient/`.** No `ok` command and no MCP call carried a
path under it; `ls -a ~/.ambient/knowledge/` at the end of the session returns `.ok` and `.okignore`
and nothing else **[measured]**. The one `open-knowledge-server` process alive at the end
(`open-knowledge-boilerplate`, pid 67423, started 07:21) predates this session and is not mine; the
one I started (`r3`, pid 67975) was stopped with `ok stop` **[measured]**.

**[read]** = asserted by the cited tool schema, file line, or bundled string. **[measured]** = I ran
it and this is its output. **[inference]** = mine, asserted by no source.

---

## Verdicts

| # | Sub-question | Verdict |
|---|---|---|
| 1 | The tool inventory | **Twenty-one tools; four matter to Ambient.** `exec`, `write`, `edit`, `lint` do everything `ontology lint · next · index · query` needs. `audit`, `delete`, `move`, `history` are useful. **Eleven are irrelevant** — `checkpoint`, `conflicts`, `resolve_conflict`, `restore_version`, `share_link`, `preview_url`, `palette`, `skills`, `install`, `import`, `config` serve a GitHub-sync/desktop-UI/skill-marketplace product Ambient is not building. |
| 2 | **Does any of it work with no server?** | **No — and this is the finding that reframes the question.** With `OK_MCP_AUTOSTART=0` and no daemon, **12 of 14 tools I probed failed**, `exec` included: *"OpenKnowledge server is not running and OK_MCP_AUTOSTART=0 disables auto-start."* Only `config` and `palette` answered. **"Use the MCP" means "run a per-project daemon"** — one `open-knowledge-server` process per knowledge base, which self-terminates after `30m` idle and re-spawns in ~1.5 s on the next call. |
| 3 | Dates | **Nothing is auto-set. Not on create, not on edit.** A `write` with `{type, name, status}` produces exactly those three keys on disk. Four subsequent `edit`s added no `created`, no `updated`, no `modified`, no `title`. **The single automatic behaviour the principal named by name does not exist.** |
| 4 | Attribution | **Real, and it is the strongest thing on offer.** Every write lands in a shadow git repo at `.git/ok/` on a per-writer ref `refs/wip/main/<writer-id>`, with an `ok-actor:` JSON trailer. Four writer identities: `agent-<session>` (us), `file-system` (the watcher), `git-upstream`, `openknowledge-service`. |
| 5 | Versioning | **A 30-second debounced auto-snapshot, not per-edit.** Five mutations collapsed into three versions. Stored in `.git/ok/`, **never in the project's own git** — the outer repo stayed fully untracked throughout. `restore_version` works and writes the file back to disk. |
| 6 | Backlinks / tags | **Derived indexes OK maintains — with one real bug.** A hand-created doc is indexed within seconds. A hand-**deleted** doc's outbound edges are **never retracted while the server runs**: `links({kind:"backlinks"})` reported a backlink from a file `rm`'d four minutes earlier, and `hubs` ranked a non-existent doc first. A server restart rebuilds it correctly. |
| 7 | CRDT / conflicts | **Unreachable for Ambient.** `conflicts` and `resolve_conflict` read *git merge stages* from GitHub sync. No remote → `"No conflicts tracked."`; `share_link` → *"This project has no GitHub remote."* `autoSync.mode` defaults to `null`. Not a CRDT merge surface at all. |
| 8 | What breaks if OK is absent | **Less than expected, and precisely one thing.** Plain `fs` create/edit/delete: the file watcher reconciles all three into search, lint, `exec` enrichment, tags and dead-link detection within ~10 s. **A hand-created doc gets no version history** — `history` returns `total: 0` even though its bytes are in the shadow tree. And a non-atomic hand edit (`sed -i ''`) registers a **phantom document** in OK's removal ledger. |
| 9 | Does OK normalise our bytes? | **No — and this is the second real thing on offer.** `edit({frontmatter})` on a hand-written file with a YAML comment, mixed quoting, a flow-style array and a block scalar changed **one line** and left every other byte identical. A naive `parse → mutate → stringify` round-trip in our own code would not. |

**Headline.** Two behaviours justify the dependency and neither is a date: **surgical frontmatter
patching** and **attributed version history**. Everything else Ambient's four verbs need is `fs` +
a YAML parser + a JSON-Schema validator. And the price of those two behaviours is a **daemon per
knowledge base**, a **shadow git repo that roughly doubles the corpus on disk**, and **a telemetry
sink recording document paths**.

---

## 1 — The complete tool inventory

Twenty-one tools **[read]**, from the deferred-tool listing and their loaded schemas:
`audit`, `checkpoint`, `config`, `conflicts`, `delete`, `edit`, `exec`, `history`, `import`,
`install`, `links`, `lint`, `move`, `palette`, `preview_url`, `resolve_conflict`,
`restore_version`, `search`, `share_link`, `skills`, `write`.

Every tool takes an optional `cwd` **[read]**; §6 of
[finding 01](01-ok-mcp-read-surface.md) covers how that routes.

| Tool | Arguments | Returns | Verdict for Ambient | Rebuild cost if we wrote our own |
|---|---|---|---|---|
| `exec` | `command` (allowlist `cat ls grep find head tail wc sort uniq cut`, one pipe), `cwd` | raw stdout **+ `enrichedPaths[]`**: parsed `frontmatter`, `title`, `tags`, `backlinkCount`, `schemas_applicable`; directories get `directMdCount`/`recursiveMdCount`/`mostRecentMd` | **needed** — the only enumeration path; `ontology index` and `next` are one call each | **Trivial.** `fs.readdir` + `gray-matter`. We already own the walk. |
| `write` | one of `document`/`documents`/`folder`/`template`/`skill`/`asset`; doc takes `{path, content\|template, frontmatter, position, extension}` | `"Written successfully (replace)."`, `brokenLinks[]`, inline `warnings[{kind:"lint-violation"}]` | **needed** — `stub` writes here | **Trivial** for bytes. The lint-on-write warning is the part worth having. |
| `edit` | one of `document`/`folder`/`template`/`skill`; doc takes `{path, find, replace, occurrence}` **or** `{path, frontmatter}` | `"Frontmatter patched (2 set, 1 deleted)."` | **needed** — and **the single best thing on the surface** (§4) | **Hard to match.** A surgical YAML patch that preserves comments and quoting is not a `js-yaml` round-trip. |
| `lint` | `document` \| `path`, `fix` | diagnostics `{severity, source, code, message, range}`; capped 10 files × 10 each | **needed** — `ontology lint` is this plus a compiled schema | **Medium.** `ajv` + a `schema.yaml` → JSON Schema compiler. R1 §4 lists the four gaps we'd have to paper over anyway. |
| `audit` | `path` | lint violations **and** broken internal links in one report | **useful** — dead-link detection is real work | **Medium.** Link extraction + resolution across the corpus. |
| `delete` | one of `document` (string/array/`{path}`)/`folder`/`template`/`skill`/`asset` | `deletedDocNames[]` | **useful** | **Trivial.** `fs.rm`. |
| `move` | `from`, `to` (or nested `template`/`skill`) | `renamed[]`, **`rewrittenDocs[{docName, rewrites}]`** | **useful** — rewrites inbound wiki-links **and inline links** corpus-wide | **Medium.** Correct link rewriting across every referrer, including docs OK never wrote. |
| `history` | one of `document`/`folder`/`skill`; `branch`, `limit`, `offset`, `kind`, `author`, `excludeAuthor` | `entries[{version, timestamp, author, authorEmail, kind, message, contributors[], checkpoint}]` | **useful** — provenance, not queue state | **Hard.** A shadow git repo with per-writer refs and actor trailers is a real subsystem. |
| `search` | `query`, `intent`, `limit` (max 100), `scopes`, `semantic` | ranked hits with `signals{lexical, fullText, recency}`; **no `frontmatter`** | **irrelevant** — capped at 100, no field predicates, no grouping (R1 §1, §7) | **N/A** — the derived index replaces it. |
| `links` | `kind` (`backlinks\|forward\|dead\|orphans\|hubs\|suggest`, or array), `document`, `limit`, `mode`, `sourceDocuments` | link-graph views | **irrelevant, and currently unsound** — reads a cache that hand-deletes do not invalidate (§2.4) | **Medium**, but we would build it as part of `ontology index` anyway. |
| `config` | `key` | full merged config sub-tree | **irrelevant** — *"a pure READ"*, and **every key is `agentSettable: false`**, so no MCP tool can turn frontmatter validation on | **Trivial** — and `home` already writes `.ok/config.yml`. |
| `checkpoint` | `summary` | `{version}` — a 40-char SHA | **irrelevant** — a manual named restore point for a human in the UI | **N/A** |
| `restore_version` | one of `document`/`skill`, `version` (40-char SHA), `summary` | restores the doc, writes disk | **irrelevant** — undo for a human editor | **N/A** |
| `conflicts` | `kind` (`list`\|`content`), `file` | git merge stages `{base, ours, theirs, shape}` | **irrelevant** — GitHub-sync only (§2.5) | **N/A** |
| `resolve_conflict` | `file`, `strategy` (`mine\|theirs\|content\|delete`), `content` | commits the resolution | **irrelevant** — same | **N/A** |
| `share_link` | `path`, `kind` | `https://openknowledge.ai/d/…` | **irrelevant** — requires a GitHub remote | **N/A** |
| `preview_url` | `document`\|`folder`\|`skill`\|`file` | `{url, baseUrl, running, autoOpen}` for the local UI | **irrelevant** — and it is the one tool that **deliberately auto-starts a daemon** | **N/A** |
| `palette` | `components` | OK's authoring components, embed patterns, CSS theme tokens | **irrelevant** — a rich-markdown authoring aid for the OK app | **N/A** |
| `skills` | `name`, `file`, `query`, `scope` | list/read managed skills; marketplace search | **irrelevant** — and expensive: a bare `skills()` on `r3` returned **85 skills, 113,669 characters**, including every one of the principal's `~/.claude/skills/` globals | **N/A** — [knowledge.md](../../../rules/knowledge.md) already forbids `ambient skill add`. |
| `install` | `name`, `add`/`remove`/`convert`, `mode`, `source`, `scope`, `skillFolders` | skill placement across editor projections | **irrelevant** — see finding 02 | **N/A** |
| `import` | `source`, `add`, `skill`, `mode`, `scope` | fetches a skill-dir from skills.sh/GitHub | **irrelevant** — network fetch of third-party skills | **N/A** |

---

## 2 — What is automatic

A plain `fs.writeFile` writes bytes. Here is everything OK does on top, what triggers it, and where
it lands.

### 2.0 — The precondition: all of it needs a running daemon

I probed fourteen tools over a stdio `ok mcp` with `OK_MCP_AUTOSTART=0`, against `r3` with no server
running. **Twelve failed identically [measured]**:

```
### exec       :: "exec failed: OpenKnowledge server is not running and OK_MCP_AUTOSTART=0 disables auto-start."
### search     :: "Error: OpenKnowledge server is not running and OK_MCP_AUTOSTART=0 disables auto-start."
### lint       :: (same)      ### audit    :: (same)      ### links   :: (same)
### history    :: (same)      ### conflicts:: (same)      ### skills  :: (same)
### write      :: (same)      ### checkpoint:: (same)     ### share_link :: (same)
### preview_url:: {"url":null,"baseUrl":null,"running":false,…}   ← structured, not an error
```

Only two answered: `config` (*"[Operates on disk; no running OK server required]"* **[read]**) and
`palette` (*"[Operates on registry data; no running OK server required]"* **[read]**).

**`exec` is in the failing set.** Its schema carries no `[Requires: Hocuspocus server]` marker
**[read]** — but it needs the server, because the enrichment comes from the server's indexes. The
mandated read path is a daemon call.

The same probe created nothing: `find` over the project before and after was byte-identical
**[measured]**. So `OK_MCP_AUTOSTART=0` does suppress the spawn — the thing R1 flagged as untested.

With autostart on (the default), one `exec` call against a server-less project took **1.46 s**
wall-clock and left behind **[measured]**:

```
.git/ok/                  HEAD config description hooks info lock last-known-head objects refs
.ok/local/                cache/{tags.json,main/backlinks.json}  logs/server-current.jsonl
                          telemetry/spans-current.jsonl  principal.json  state.json
                          server.lock  ui.lock  skill-placements.json  last-spawn-error.log
```

plus a live `open-knowledge-server r3` process. Warm-call latency afterwards: **17–90 ms** per
`exec` **[measured]**.

The daemon does not stay forever. `server.idleShutdown` **[read]**, from the config registration in
the bundle:

> "Shut the server down after this long with no activity: a duration like '30m' … Default derived:
> '30m' when every bind address is loopback"

and the deprecation notice for `--remote` **[read]**: *"the idle timer only counts WS clients and
would tear the server down under a live remote MCP client."*

**[inference]** So the steady state of "Ambient uses the OK MCP" is: a `open-knowledge-server`
process per knowledge base, listening on a random loopback port (`server.lock` recorded
`127.0.0.1:62583`, then `:51186` after a restart **[measured]**), dying after 30 idle minutes and
paying a ~1.5 s cold start on the next call. That is a daemon dependency, not a library call.

### 2.1 — Dates: nothing

**[measured]**, `write({document:{path:"people/zeeshan", content, frontmatter:{type,name,status}}})`,
then `cat people/zeeshan.md` straight off disk:

```yaml
---
type: Person
name: Zeeshan
status: unreviewed
---
# Zeeshan

A person.
```

No `created`. No `title`. No `description`. After four subsequent `edit` calls the file was:

```yaml
---
type: Person
name: Zeeshan
status: reviewed
role: engineer
org: Capxul
---
```

**No `updated`, no `modified`, nothing added that I did not pass.** The only date-like automation
anywhere is the `{{date}}` template token (R1 §5), which substitutes once at instantiation and never
again.

**[inference]** The behaviour the principal named as the reason to keep the MCP — *"automatic
updating of things, dates and stuff like that"* — **is not in the product.** If Ambient wants an
`updated:` field it must set it itself, whichever path it writes through. That is one line of code
and it is ours either way.

What OK *does* track instead of a date field is the file's mtime, surfaced on directory enrichment
**[measured]**: `"mostRecentMd":{"path":"people/hand-made.md","updatedAt":"2026-08-20T08:04:34.348Z"}`.

### 2.2 — Attribution: a shadow git repo with per-writer refs

`principal.json`, created at server start **[measured]**:

```json
{"id":"principal-70e43394-7b92-40a4-888a-aa8254b89d2c","display_name":"Capxul Agent",
 "display_email":"agent@capxul.dev","source":"git-config","created_at":"2026-08-20T07:52:57.694Z"}
```

A per-project UUID; the name and email are lifted from `git config`. It identifies a *human*
connection, not an agent.

Agents are identified separately. The bundle's writer resolver **[read]**,
`src-CQVK23qz.mjs`, function `D7`:

```js
if (n.source === `local`) {
  if (typeof e.session_id === `string`) return {id:`agent-${t}`, name:`Agent (${t.slice(0,8)})`,
                                                email:`agent-${t}@openknowledge.local`};
  return e.origin === `file-watcher` ? Mx
       : e.origin === `upstream-import` || e.origin === `git-upstream` ? Nx : Px;
}
```

with **[read]**:

```js
Mx = {id:`file-system`,           name:`File System`,           email:`file-system@openknowledge.local`}
Nx = {id:`git-upstream`,          name:`Git (upstream)`,        email:`git@openknowledge.local`}
Px = {id:`openknowledge-service`, name:`OpenKnowledge (service)`,email:`service@openknowledge.local`}
```

All four appeared in `r3` **[measured]**:

```
refs/wip/main/agent-dfef18c0-f70f-4841-859b-bb11103e842c   claude-code
refs/wip/main/file-system                                  File System
refs/wip/main/git-upstream                                 Git (upstream)
refs/wip/main/openknowledge-service                        OpenKnowledge (service)
refs/checkpoints/main/08c6acd7…                            openknowledge
```

The metadata rides in a git trailer on each commit **[measured]**, `git log --format='%b'` on the
checkpoint:

```
ok-actor: {"v":1,"writer_id":"openknowledge-service","principal":null,"agent_session":null,
           "agent_type":null,"client_name":null,"client_version":null,"label":null,
           "display_name":"OpenKnowledge (service)","color_seed":"openknowledge-service","docs":[]}
```

The `docs` array is what `history({document})` filters on — see §3.2 for why that matters.

### 2.3 — Versioning: a 30-second debounced snapshot, in a shadow repo

Five mutations at 07:53:28 (write), ~07:53:40, ~07:55:42, ~07:56:05, ~07:56:13 produced **three**
versions **[measured]**:

```
edf6c231…  2026-08-20 07:56:43  claude-code  wip: people/zeeshan
f654b719…  2026-08-20 07:56:12  claude-code  wip: people/zeeshan
b8ccddc2…  2026-08-20 07:54:09  claude-code  wip: people/zeeshan
```

Thirty seconds apart, each one landing ~30 s after the last edit in its batch. The bundle names the
constant twice **[read]** — the server's own default, `src-CQVK23qz.mjs` function `d9`:

```js
{contentDir:n, projectDir:r=n, quiet:i=!0, debounce:a=2e3, maxDebounce:o=1e4,
 gitEnabled:s=!0, commitDebounceMs:c=3e4, wipRef:l=`refs/wip/main`, …}
```

and the persistence module's fallback, `T = e?.commitDebounceMs ?? 15e3`. The server passes `3e4`,
so **30 s is the effective debounce** and the measurement agrees. It is not exposed in
`config.project.schema.json` **[read]** — top-level keys are exactly `autoSync, bridge, content,
contentRules, lossCapture, remote, server, telemetry, terminal, validation`.

Where it is stored: **`.git/ok/`, a separate git dir pointed at the project as its worktree**
**[measured]**, `.git/ok/config`:

```
[core]
	worktree = …/scratchpad/r3
[user]
	name = openknowledge
	email = noreply@openknowledge.local
[gc]
	auto = 512
```

**The project's own git is never touched.** After every mutation above, `git status --porcelain` in
`r3` still showed `?? people/` — untracked **[measured]**.

`checkpoint` **consumes the WIP refs**: before it, `agent-dfef18c0…`, `file-system` and
`git-upstream` existed; after, only `refs/checkpoints/main/08c6acd7…` and the one ref that was ahead
**[measured]**. `restore_version({document, version})` then worked against a consumed ref's SHA and
wrote the file back to disk, reverting a hand-edit **[measured]**.

Cost on disk: `r3`'s `.git/ok/` is **336 KB for 5 documents**; `kb`'s is **2.6 MB against a 2.0 MB
corpus** of 525 documents **[measured]**. Maintenance is bounded — `OK_SHADOW_MAINTENANCE_*` env
vars set a 10-minute GC timeout, 600 s consolidation spacing and a dead-chain threshold of 5, with
triggers `boot | session-close | ttl | dead-chain` **[read]**.

### 2.4 — Backlinks and tags: a live index, additive-only, with a real bug

Two caches under `.ok/local/cache/` **[measured]**:

- `main/backlinks.json` — `{version:2, backward{}, forward{}, externalForward{}, skillRefs{}, mtimes{}}`, per branch
- `tags.json` — `{version:1, docs{}, files{}}`

Both are maintained by the **file watcher**, `@parcel/watcher` with a `chokidar` fallback
(`OK_FILE_WATCHER_BACKEND` **[read]**), debounced at `2e3` ms with a `1e4` ms ceiling **[read]**.

It works on files OK never wrote. **[measured]** — `cat > people/hand-made.md` at 08:00:55; by
08:01:13 the caches read:

```json
backward["people/zeeshan"] += {"source":"people/hand-made","snippet":"…Links to people/zeeshan.",
                               "sourceForm":"wiki","line":10,"column":45}
tags.docs = {"people/ali":["team"], "people/hand-made":["handmade"]}
```

**The bug.** `rm people/doomed.md` at 08:00:55. Four and a half minutes later
`links({kind:"backlinks", document:"people/ali"})` still returned **[measured]**:

```json
"backlinks":[{"source":"people/doomed","title":"people/doomed","snippet":"…Links to people/ali.",
              "previewUrl":"/#/people/doomed"}]
```

and `hubs` ranked a document that did not exist first, `{"docName":"people/zeeshan-khan","count":2}`
**[measured]**. The removal *was* noticed — `removed-docs.json` recorded it — but the backlink cache
never retracts a deleted doc's outbound edges. `mtimes` was `{}` for the whole warm session
**[measured]**.

A server restart fixes it. **[measured]** — after `ok stop` and one `exec` call, `people/ali` came
back `backlinkCount: 0`, the phantom edge gone, and `mtimes` populated:

```json
"mtimes":{"people/ali":1787213074347.56,"people/hand-made":1787213074348.99}
```

**[inference]** So the cache is a cold mtime-keyed scan at boot plus in-process incremental updates
that only ever add. `links` reads it directly and inherits the staleness. `audit` does not — it
reported both dead links correctly seconds after the same delete **[measured]**:

```
people/ali.md:       ⚠ line 10 links/dead-link: Link target "people/zeeshan-khan" does not resolve…
people/hand-made.md: ⚠ line 11 links/dead-link: Link target "people/zeeshan-khan" does not resolve…
```

**For link validation use `audit`, not `links`** — which is also what OK's own skill says
(`SKILL.md:28` **[read]**: *"for link VALIDATION use this, not `links`"*). It does not say why.

### 2.5 — Conflicts: not CRDT, and unreachable here

`conflicts`'s schema **[read]**: *"Read GitHub-sync merge conflicts… Returns `{content:{file, base,
ours, theirs, shape}}`"*, with `shape` one of `both-modified | delete-modify | modify-delete`.
`resolve_conflict`'s strategies are `git checkout --ours`, `git checkout --theirs`, write-content, and
`git rm` **[read]**. These are **git merge stages**, not CRDT merge results.

They arise from `autoSync`, whose `mode` defaults to `null` **[read]**:

> "'off' (no sync), 'follow' (one-directional — pull remote changes, never push your own) … or
> 'full' (bidirectional pull and push). null = not chosen yet (onboarding asks)."

**[measured]**, on `r3`: `conflicts({kind:"list"})` → `"No conflicts tracked."`, and
`share_link({path:"people/zeeshan"})` → *"This project has no GitHub remote."*

**[inference]** For a local, single-writer Ambient home with no remote and `autoSync.mode: null`,
these two tools can never fire. The CRDT (Hocuspocus/Yjs) is real and does merge concurrent
*live editors* — but it surfaces nothing through the MCP; it is invisible below `write`/`edit`.

### 2.6 — The telemetry sink, which nobody asked about

`telemetry.localSink.enabled` defaults **`true`**, `agentSettable: false` **[read]**:

> "Write local diagnostic spans + logs under `.ok/local/` for `ok diagnose bundle`. Local-only —
> never leaves the machine until you run bundle. Set false for sensitive workspaces."

**[measured]**, after ~20 minutes on a 5-document project: `telemetry/spans-current.jsonl` is
**324 KB / 377 spans**, `logs/server-current.jsonl` is **196 KB**, and the string `people/fussy`
appears **13 times** in the spans. Rotation caps are 50 MB (spans) and 25 MB (logs) **[read]**.

**[inference]** For the principal's private knowledge base this is a fact worth knowing rather than
an alarm — it is local-only and `home` already owns `.ok/config.yml`, so
`telemetry.localSink.enabled: false` is one line in a template we already write. But it is on by
default, it records document paths, and no MCP tool can turn it off.

---

## 3 — What breaks if OK is absent

I took `r3` with three OK-written documents and interacted with the plain files using nothing but
`fs`: `cat >` a new one, `sed -i ''` an existing one, `rm` a third. Then I asked OK what it thought.

### 3.1 — It notices, and it reconciles

Within ~15 s **[measured]**:

| Surface | Hand-created `people/hand-made` | Hand-edited `people/zeeshan` | Hand-deleted `people/doomed` |
|---|---|---|---|
| `exec` enrichment | full parsed frontmatter, `tags:["handmade"]`, `backlinkCount:0` | `status: hand-edited` reflected | gone from `find` output |
| `search` | ranked first for its terms | reflected | **correctly absent** |
| `tags.json` | indexed | — | — |
| `backlinks.json` | indexed | — | **stale — see §2.4** |
| `audit` | linted | linted | dead links to it reported |
| `removed-docs.json` | — | — | `{"docName":"people/doomed","kind":"deleted"}` |
| shadow repo | in the tree | `reconcile: people/zeeshan` on `refs/wip/main/file-system` | — |
| `history` | **`{"entries":[],"total":0}`** | versioned | — |

`move({from:"people/zeeshan", to:"people/zeeshan-khan"})` then rewrote inbound links in **both**
referrers — *including `people/hand-made`, the file OK never wrote* **[measured]**:

```
"Renamed people/zeeshan -> people/zeeshan-khan. Rewrote 2 documents."
rewrittenDocs: [{"docName":"people/ali","rewrites":1},{"docName":"people/hand-made","rewrites":1}]
```

### 3.2 — What it loses: history for anything it did not create

OK's own skill states the cost **[read]**, `SKILL.md:38`:

> "Native `Edit` / `sed` / direct `Write` on in-scope markdown bypasses the CRDT and loses agent
> attribution in the shadow repo"

The measurement refines that into two different outcomes:

- A hand-**edit** of a doc OK already knows is reconciled and attributed — `reconcile:
  people/zeeshan` by `File System` **[measured]**.
- A hand-**created** doc gets **no history at all**. `history({document:"people/hand-made"})` →
  `{"entries":[],"total":0,"truncated":false}` **[measured]** — even though
  `git ls-tree -r refs/wip/main/file-system` **does** list `people/hand-made.md` **[measured]**.

**[inference]** The bytes are in the shadow repo; `history` cannot see them because it filters on the
`ok-actor` trailer's `docs[]` array (§2.2), and a watcher-observed create never enters one. So
`restore_version`, which takes its SHA from `history`, has nothing to offer for a hand-written doc.
**Version history covers documents born through the MCP, and only those.**

### 3.3 — The gotcha: non-atomic hand edits create phantom documents

`sed -i ''` on macOS writes a temp file beside the target. OK's watcher saw it **[measured]**:

```json
{"version":1,"entries":[
  {"docName":"people/.!57116!zeeshan","kind":"deleted","addedAt":1787212855945},
  {"docName":"people/doomed","kind":"deleted","addedAt":1787212856005},
  {"docName":"people/zeeshan","kind":"renamed","newDocName":"people/zeeshan-khan","addedAt":…},
  {"docName":"people/zeeshan-khan","kind":"deleted","addedAt":…}]}
```

`people/.!57116!zeeshan` is not a document. It is `sed`'s temp file, briefly on disk, entered into
OK's permanent removal ledger. **[inference]** Any Ambient code that writes via a temp-file-and-rename
— which is the *correct* way to write a file atomically — will do this on every write, unless the
temp file is created outside the content directory or matched by `.okignore`.

### 3.4 — What it does *not* do: rewrite our bytes

This is the strongest argument for the MCP that came out of the measurements, and it is the opposite
of what "OK does things automatically" suggests.

**[measured]**, a deliberately awkward hand-written file:

```yaml
---
# a comment in frontmatter
type: Person
name: "Fussy Quoted"
aliases: [ "Fuss", 'Fizz' ]
numbers:
  - "+441234567890"
note: |
  a block scalar
  over two lines
status: unreviewed
---

# Fussy

Body   with   spaces.

* star bullet
```

MD5 unchanged after 10 s of watcher time — the reconcile does not reserialize **[measured]**. Then
`edit({document:{path:"people/fussy", frontmatter:{status:"reviewed"}}})`, and the **entire diff**
**[measured]**:

```diff
11c11
< status: unreviewed
---
> status: reviewed
```

A body `edit({find, replace})` was equally surgical — the `* star bullet` (which markdownlint would
rewrite to `-`) and the double spaces elsewhere survived **[measured]**.

**[inference]** This is the behaviour that is genuinely hard to reimplement. `gray-matter` +
`js-yaml` round-trips a frontmatter block through an AST that does not carry comments, quote style,
or flow-vs-block form. Writing a Person doc's `status` back with a naive parse-mutate-stringify
would silently destroy a principal's hand-written notes in frontmatter. OK's `edit` does not.

### 3.5 — What the daemon's absence would *not* break

**[inference]** Nothing about the format. The documents are plain markdown with YAML frontmatter;
`exec`, `search`, `lint` and the caches are all derived and all rebuildable from disk — the
`.ok/local/cache/` rebuild at boot proves it (§2.4). Deleting `.ok/local/` and `.git/ok/` costs the
version history and nothing else. **The format survives OK's absence; the history does not.**

---

## 4 — What we would have to rebuild, ranked by how hard

If Ambient writes its own `knowledge` module against `fs` and drops the MCP, this is the bill, hardest
first. **[inference]** throughout, from the measurements above.

| # | Behaviour | Difficulty | Why |
|---|---|---|---|
| 1 | **Attributed version history** | **Hard — a real subsystem** | `.git/ok/` with per-writer refs, `ok-actor` trailers, debounced snapshots, GC and consolidation. Reachable with `simple-git` against a second git dir, but it is a week of work and its own bug surface. **Ask first whether Ambient wants it**: `knowledge-flow.md` never asks for document-level undo, and `now`-as-a-fold-over-receipts is a different provenance model. |
| 2 | **Surgical frontmatter patching** | **Medium-hard, and the one to actually copy** | Preserving comments, quote style and block scalars means a comment-preserving YAML editor (`yaml`'s `Document` API does this; `js-yaml` does not) plus byte-range replacement rather than whole-file rewrite. ~100 lines done properly. **This is the behaviour worth stealing.** |
| 3 | **Corpus-wide link rewriting on move** | **Medium** | Find every `[[wiki]]` and inline `](path)` referrer, rewrite, don't touch code fences. `move` does it today, including in docs it never wrote. |
| 4 | **Dead-link detection** | **Medium** | `audit`'s `links/dead-link` with line numbers. Falls out of the derived index for free once `ontology index` exists — the index already has to hold forward edges. |
| 5 | **Frontmatter schema validation** | **Medium, and half-ours already** | R1 §4 already established Ambient must compile `schema.yaml` → JSON Schema, impose its own severity, page around the 10 × 10 cap, and name the `additionalProperties` key OK will not. Swapping OK's `lint` for `ajv` removes work rather than adding it. |
| 6 | **Backlink / tag index** | **Easy — and ours would be correct** | The measured version is stale after a delete (§2.4) and ranks non-existent hubs. `ontology index` is specified to be disposable and rebuilt from frontmatter, which is exactly the invalidation strategy OK's cache lacks. |
| 7 | **Enumeration with parsed frontmatter** | **Trivial** | `exec("find …")` → `readdir` + a YAML parse. R1 measured `exec` returning ~520 chars of response per document; a local walk returns objects. |
| 8 | **Create / overwrite / delete** | **Trivial** | `fs.writeFile`, `fs.rm`. |
| 9 | **Auto-dates** | **Nothing to rebuild** | OK does not do it (§2.1). Whichever path we take, `updated: new Date()` is ours. |
| 10 | **Conflicts, checkpoints, share links, preview URLs, skills, palette, config** | **Nothing to rebuild** | Ambient has no GitHub remote, no OK desktop UI, no skill marketplace. Eleven of twenty-one tools. |

**And the bill on the other side.** Keeping the MCP costs a per-KB `open-knowledge-server` daemon
(§2.0), a shadow repo roughly the size of the corpus (§2.3), a telemetry sink recording doc paths
(§2.6), `.git/ok/` and `.ok/local/` inside an Ambient home — which
[knowledge.md](../../../rules/knowledge.md)'s *Why* section objects to in as many words — and a
`links` surface that is wrong until the daemon restarts (§2.4).

---

## What this does not establish

- **Whether the CRDT actually merges anything for Ambient.** Hocuspocus is running (`server.lock`
  advertises `ws`), and OK's skill claims native writes "bypass the CRDT". I never had two live
  writers on one document, so I did not observe a merge. Whether concurrent Ambient agents would
  ever produce one is a `harness` question this research did not touch.
- **What `bridge` and `lossCapture` are for.** Both are top-level config keys **[read]**;
  `OK_BRIDGE_THROW_ON_VIOLATION`, `OK_RETHROW_BRIDGE_LOSS` and a `.ok/local/loss-capture/` directory
  exist. I did not investigate. The name suggests markdown↔CRDT round-trip fidelity, which would
  matter to §3.4's claim, but I have no source for that.
- **Whether `edit({frontmatter})` stays surgical on every shape.** I tested one deliberately awkward
  document. Anchors, merge keys, multi-document YAML and `---` inside a block scalar are untested.
- **How the shadow repo behaves at Ambient's real scale over months.** 2.6 MB against a 2.0 MB
  synthetic corpus is one data point at one moment; `OK_SHADOW_MAINTENANCE_*` implies growth is
  managed, and I did not exercise it.
- **The exact idle-shutdown behaviour under Ambient's usage.** `30m` is **[read]** from the config
  registration and the bundle's `thresholdMs: e.idleShutdownMs ?? 18e5` fallback. I did not wait
  thirty minutes to watch a server die.
- **Whether `import` / `install` do anything harmful.** I read both schemas and called neither —
  `import` fetches from the network and `install` writes into `~/.claude/` and project editor
  directories. Finding 02 covers that ground.
- **What `search`'s `semantic: true` sends where.** Its schema says *"the query and matching page
  content are sent to the configured embeddings provider (content egress)"* **[read]** and that the
  tool **opts in by default** when the workspace has it enabled. No key is configured here, so
  nothing left the machine. For a principal's private knowledge base this is worth settling before
  anyone enables it.
