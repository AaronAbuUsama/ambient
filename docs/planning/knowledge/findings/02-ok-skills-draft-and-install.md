# KNOWLEDGE · R2 — How a hand-operated pass becomes a skill, in OpenKnowledge's own mechanism

**Question.** `docs/design/product.md:381-382` settles the whole design in one sentence:
*"Skills compound like knowledge does. An agent authors a Draft; `install` is the review
gate. OpenKnowledge owns this mechanism."* `docs/rules/knowledge.md:30-34` derives a rule
from it: *"`write` creates a Draft and `install` is the review gate that projects it into
`.claude/`, `.pi/` and the rest. Writing into those projections by path re-implements what
OK owns and bypasses the gate — which is why `ambient skill add` does not exist."* This
finding tests both sentences against the running system.

**Sources.** All primary, all first-party.

- **The live MCP server** — `mcp__open-knowledge__{skills,install,write,edit,delete,import,history,config}`. Tool schemas quoted verbatim; every call below was actually made.
- **The shipped CLI**, `@inkeep/open-knowledge` **0.55.2** at `/Users/abuusama/.ok/bin/ok`, whose real bundle is `/Applications/OpenKnowledge.app/Contents/Resources/cli/` (`package.json` → `@inkeep/open-knowledge 0.55.2`). Its `dist/assets/skills/write-skill/SKILL.md` is OpenKnowledge's own authoring guide and is the single best source here.
- **Real state on this machine** — `/Users/abuusama/.ok/skill-state.yml`, `/Users/abuusama/.ok/skill-install-events.jsonl`, `/Users/abuusama/.ok/local/skill-placements.json`, `/Users/abuusama/.ok/skills/`, and an 89-skill live `skills({})` listing.
- **The published schemas** at `https://unpkg.com/@inkeep/open-knowledge@0.58.9/dist/schemas/v0/`.
- **A scratch project** built under the session scratchpad at `…/scratchpad/okscratch`, where every mutating experiment was run.

Repo paths are relative to `/Users/abuusama/projects/ambient/.claude/worktrees/knowledge-slice-a90e85/`.
**[read]** = asserted by the cited line, tool schema, or shipped file. **[measured]** = I ran
it; this is the output. **[inference]** = mine, asserted by no source.

---

## Verdicts

| # | Sub-question | Verdict |
|---|---|---|
| 1 | What is an OK skill, as an object? | **A folder containing `SKILL.md`, living inside an agent host's skills root at the project root** — `.claude/skills/<name>/`, `.agents/skills/<name>/`, `.codex/skills/<name>/`. **Not** inside the content directory and **not** inside `.ok/`. Its frontmatter is exactly two keys, `name` and `description`; OK injects nothing. **There is no published skill schema** — `dist/schemas/v0/` holds three config schemas and nothing else. `.ok/` holds only bookkeeping: `local/skill-placements.json`, `skills-lock.json`, and versions in the shadow git repo. |
| 2 | Scope | **Exactly two values, lowercase `"project"` and `"global"`** — an enum on every skill-shaped tool argument. Same meaning as Ambient's `Project`/`Global`. Project skills live at the OK project root and travel in git; global skills live at the *same relative paths under `$HOME`* and are unversioned. Two different host→root maps, which disagree for `copilot`, `pi` and `antigravity`. `~/.ok/skills` is named by `ok uninstall --help` as the home of "your authored skills" and is **empty on this machine while 85 global skills are managed** — it is not where skills live. |
| 3 | The Draft → install gate | **Refuted. There is no Draft, and `install` is not a review gate.** OK's own guide says it in as many words: *"its own folder IS the skill (there is no draft state)"*. `write({skill})` returns `"Created skill \"r2-probe\" (.claude/skills/r2-probe/SKILL.md) — live for that folder's agent."` It is loadable by Claude Code the instant it is written. `install` decides **where else** the skill also appears; it is additive placement, not promotion. It *does* validate the source and refuse `INVALID_SKILL_SOURCE`, but that guards the fan-out, not the skill's existence. **No interactive review step exists anywhere in the flow.** |
| 4 | Projections | **Half-confirmed, half-refuted.** ✅ `install` owns fan-out and its bookkeeping — it writes the copies/symlinks and records them in `.ok/local/skill-placements.json`. ❌ It is **not** the only supported authoring path, and a by-path write does **not** bypass a gate, because there is no gate to bypass. Measured: two skills created with plain `cat` were adopted by `skills({})` as fully managed, `installed: true`, with no ceremony and no marker distinguishing them from OK-authored ones. There is also **no separate store to project *from*** — the source folder *is itself* one of the editor projections. |
| 5 | Authoring from an agent | **Yes, completely, over MCP alone.** `write({ skill: { name, description, body, files[], scope } })` is a dedicated skill shape on the `write` tool, not a document with a skill-ish frontmatter. The full verb set is `write` / `edit` / `delete` / `install` / `import` / `skills` / `history` / `restore_version`. `write` validates (XML tags in `description` are refused); `install` returns `{ name, hosts[], scripts, warnings[], warningCodes[] }`. |

---

## 1 — What an OK skill is, as an object

### The shape, from OK's own authoring guide

`/Applications/OpenKnowledge.app/Contents/Resources/cli/dist/assets/skills/write-skill/SKILL.md`
is the skill OpenKnowledge ships to teach agents to write skills. Its Stage 5 states the
contract **[read]**:

> Frontmatter contract (validated on write — get it right):
> - `name` — lowercase letters, digits, hyphens; ≤64; **equals the directory**.
> - `description` — **≤1024 chars, no XML tags, no `version` field**. See Stage 7.
> - Nothing else. OK never injects its own frontmatter; bookkeeping lives in `.ok/`.

And its opening line **[read]**: *"an Agent Skill — a `SKILL.md` file (plus optional
`references/` and `scripts/`) … In OpenKnowledge a skill is a first-class, versioned,
installable artifact."*

### Verified against a real write

`write({ skill: { name: "r2-probe", description: "…", body: "…", scope: "project" } })` with
`cwd` = the scratch project **[measured]** returned:

```json
{"text":"Created skill \"r2-probe\" (.claude/skills/r2-probe/SKILL.md) — live for that folder's agent. Use `install` with `add` to put it in your other editors.",
 "skill":{"ok":true,"path":".claude/skills/r2-probe/SKILL.md","created":true},
 "previewUrl":"/#/__skill__/project/r2-probe"}
```

`cat .claude/skills/r2-probe/SKILL.md` **[measured]** — the whole file:

```markdown
---
name: r2-probe
description: Probe skill authored by research agent R2 to observe what
  write({skill}) actually creates on disk. Not for real use.
---
# R2 probe

This skill exists only to measure OpenKnowledge's authoring path.
```

Two frontmatter keys. No `scope`, no `id`, no timestamps, no OK-owned block. The guide's
claim is exactly true.

### Where it does *not* live

`find` over the scratch project after the write **[measured]**: the only new file anywhere
is `.claude/skills/r2-probe/SKILL.md`. `.ok/` gained **nothing** skill-shaped — the whole
`.ok/` tree was `config.yml` plus `local/{cache,logs,telemetry,principal.json,server.lock,state.json,ui.lock}`.
The only `.ok/` files mentioning the skill are the graph index — `.ok/local/cache/tags.json`
and `.ok/local/cache/main/backlinks.json`, both containing the single string
`".claude/skills/r2-probe/SKILL"` **[measured]**.

So a project skill is *also* a content document in OK's graph, addressed by its
projection path. That is what the write-skill guide means by *"a project `.md` reference
becomes a live content doc that auto-connects to its SKILL in the graph"* **[read]**.

### There is no skill schema

`https://unpkg.com/@inkeep/open-knowledge@0.58.9/dist/schemas/v0/` lists exactly three
files **[measured]**:

```
config.project-local.schema.json
config.project.schema.json
config.user.schema.json
```

`ls /Applications/OpenKnowledge.app/Contents/Resources/cli/dist/schemas/v0/` at the local
0.55.2 gives the same three **[measured]**. Grepping `config.project.schema.json` for
`skill` returns **one** hit, `properties/telemetry/default/skillInstallReports` **[measured]**
— a telemetry toggle. **There is no published skill schema, and no schema-backed skill
document type.** A skill is a file convention, validated by code, not by a schema Ambient
could match the way it matches `.ok/config.yml`.

### Bundle files

`write`'s `skill.files` schema **[read]**: an array of `{ path, content }` where *"`path` is
SKILL-RELATIVE and must stay inside the skill dir (e.g. "references/tiers.md",
"scripts/run.sh", "assets/logo.svg") — no `../`, no absolute paths."* The read side,
`skills({ name, file })`, returns `{ path, kind, text }` with `kind ∈ {reference, script, file}`
**[read]**, and OK's guide is explicit that this is *"the universal read path for references
+ scripts (no native `cat`)"* **[read]**.

A real bundle on this machine, `~/.agents/skills/break-review-loops/` **[measured]**:
`SKILL.md`, `agents/`, `references/`, `scripts/`.

---

## 2 — Scope: two values, two root maps, and a decoy directory

### The enum

Every skill-shaped argument on every tool carries the same field **[read]**, e.g. on
`write.skill.scope`:

> Level: `"project"` (default — a Project skill: lives in this KB wherever its folder is,
> shared with teammates via git) or `"global"` (a Global skill: lives under your user home,
> available in every project on this machine — not shared, not version-tracked).

`enum: ["project", "global"]`. Ambient's `scope: Global` / `scope: Project` in
`product.md` is the same distinction; only the capitalisation differs **[inference]**.

### Where each stores its skills

The shipped runtime carries **two** host→root maps, `Dl` (project) and `Ol` (global) —
`/Applications/OpenKnowledge.app/Contents/Resources/cli/dist/index.mjs` **[read]**:

```js
Dl={claude:`.claude/skills`,"claude-desktop":null,cursor:`.cursor/skills`,codex:`.codex/skills`,
    copilot:`.github/skills`,opencode:`.opencode/skills`,openclaw:null,pi:`.pi/skills`,
    antigravity:null,"lm-studio":null,hermes:null}          // project
Ol={claude:`.claude/skills`,"claude-desktop":null,cursor:`.cursor/skills`,codex:`.codex/skills`,
    copilot:`.copilot/skills`,opencode:`.opencode/skills`,openclaw:null,pi:`.pi/agent/skills`,
    antigravity:`.gemini/skills`,"lm-studio":null,hermes:null}  // global
…
const Rl=`.agents/skills`;   // the vendor-neutral hub
```

| Host | Project root | Global root |
|---|---|---|
| `claude`, `cursor`, `codex`, `opencode` | same in both | same in both |
| `copilot` | `.github/skills` | `.copilot/skills` |
| `pi` | `.pi/skills` | `.pi/agent/skills` |
| `antigravity` | *(none)* | `.gemini/skills` |

Global paths are the same strings resolved against `$HOME` — the `install` schema says so
**[read]**: *"a base-relative custom root path containing `/` (e.g. `.team/skills`;
**home-relative at global scope**)."*

### Measured against 89 real skills

`skills({ cwd: "…/open-knowledge-boilerplate" })` **[measured]** — 89 rows, `85 global`,
`4 project`. Global source directories:

```
  74  .agents/skills          ← the hub
   7  .claude/skills
   1  .codex/skills
   1  .cursor/skills
   1  .opencode/skills
   1  .pi/agent/skills
```

`~/.claude/skills/break-review-loops` on disk **[measured]**:

```
lrwxr-xr-x  break-review-loops ⇒ ../../.agents/skills/break-review-loops
```

The hub holds the real folder; the editor dir holds a symlink. That is `mode: "link"`.

### `~/.ok/skills` is a decoy

`ok uninstall --help` **[read]**: *"Keeps your markdown content and your authored skills
(`~/.ok/skills`) unless `--purge-content`."* The runtime carries the constant
`` const Cl=`.ok/skills` `` and path predicates over it **[read]**.

`ls /Users/abuusama/.ok/skills/` → **empty**, directory created 2026-07-28 and never
populated, while 85 global skills are managed **[measured]**.

**[inference]** `.ok/skills` is a legacy home from before 0.42 — `ok repair-skills --help`
offers *"Skip the confirmation prompt for removing directories left by a pre-0.42 install"*
**[read]** — and nothing on this machine writes there today. **Anything in Ambient that
plans around `~/.ok/skills` would be planning around a dead path.**

---

## 3 — The Draft → install gate: there is no Draft

### OK says so in three places

**Its authoring guide**, Stage 8 **[read]**:

> The skill is already live for whichever agent reads the folder it was created in — its own
> folder IS the skill (there is no draft state). `install` manages WHERE ELSE it is
> available, additively

**The `install` tool description** itself **[read]**:

> A skill is ONE real folder (its SOURCE — the skill itself) plus managed copies/symlinks at
> other locations. `add`/`remove` change the other locations; `mode` flips copies↔symlinks;
> `source` moves the real folder. There is NO "uninstall everywhere" and **no draft state** —
> a skill with no extra locations still lives (and loads) at its source folder; to make a
> skill stop existing, use `delete`.

**The `write` response string**, quoted in §1 **[measured]**: *"— live for that folder's
agent."*

### What `install` actually does

`install({ name: "r2-probe", scope: "project", add: ["codex","agents"] })` **[measured]**:

```json
{"text":"Skill \"r2-probe\" now lives at: claude, agents, codex.",
 "name":"r2-probe","hosts":["claude","agents","codex"],"scripts":false,"warnings":[]}
```

On disk **[measured]**:

```
.codex/skills/r2-probe  ⇒ ../../.claude/skills/r2-probe
.agents/skills/r2-probe ⇒ ../../.claude/skills/r2-probe
```

and `.ok/local/skill-placements.json` appeared for the first time **[measured]**:

```json
{"schema":1,"skills":{"r2-probe":[
  {"path":".codex/skills/r2-probe","mode":"link"},
  {"path":".agents/skills/r2-probe","mode":"link"}]}}
```

Note what the bookkeeping does **not** contain: the source, `.claude/skills/r2-probe`. OK
records the copies it made, not the skill. **[inference]** That is the whole architecture in
one file — OK owns the *fan-out*, and the skill is just a folder someone put somewhere.

### It is instantaneous and non-interactive

There is no confirmation, no diff, no queue, no approval. The response returned in one
round-trip. **[measured]** A second `write({skill})` under the same name silently replaced
the file:

```json
{"text":"Updated skill \"r2-probe\" (.claude/skills/r2-probe/SKILL.md) — live for that folder's agent.",
 "skill":{"ok":true,"path":".claude/skills/r2-probe/SKILL.md","created":false}}
```

and `cat .codex/skills/r2-probe/SKILL.md` showed the new body immediately **[measured]** —
because the projection is a symlink, so an edit needs no re-install at all. `edit`'s schema
says this for copies too **[read]**: *"Every recorded copy re-syncs from the source, so
there is nothing to re-install."*

The only prompt anywhere is the **host's own permission prompt**, and it is a per-tool
permission, not a content review. OK's config carries `agents.autoApproveOkTools`, whose
description **[read]** is:

> Auto-approve OpenKnowledge's own tools (and `ok open` on Claude) for agents launched from
> the built-in terminal. **Destructive tools (delete/move/share/install) still prompt.**

So `install` is classified alongside `delete` and `move` — as *destructive*, not as
*reviewable*. **[inference]** That classification is about blast radius, not quality
control, and it happens in the MCP host, not in OpenKnowledge.

### What `install` *does* gate on — a real, useful validator

Its description **[read]**: *"The source is validated FIRST — a SKILL.md with git conflict
markers, missing/invalid frontmatter, XML tags in name/description, or a reserved
`open-knowledge*` name is refused (never fanned into your agent context)."*

I tested every branch I could reach **[measured]**:

| Probe | Call | Result |
|---|---|---|
| Git conflict markers in `SKILL.md` | `install({name:"broken-src", add:["codex"]})` | ❌ `Skill "broken-src" cannot be installed: SKILL.md contains git conflict markers (\`<<<<<<<\` / \`=======\` / \`>>>>>>>\`). Resolve the conflict before installing. (INVALID_SKILL_SOURCE)` |
| No frontmatter block at all | `install({name:"no-fm", add:["codex"]})` | ❌ `SKILL.md has no valid \`---\` frontmatter block (name + description required). (INVALID_SKILL_SOURCE)` |
| Reserved `open-knowledge*` prefix | `install({name:"open-knowledge-probe", add:["codex"]})` | ❌ `"open-knowledge-probe" uses the reserved \`open-knowledge*\` prefix (reserved for OK's shipped skills) — choose another name. (INVALID_SKILL_SOURCE)` |
| XML tag in `description` | `write({skill:{description:"Use when <thinking> tags…"}})` | ❌ `Invalid skill request.` — refused at **write**, before install |
| Reserved prefix at write time | `write({skill:{name:"open-knowledge-probe"…}})` | ✅ **Created.** Landed at `.agents/skills/open-knowledge-probe/SKILL.md` |

That last row is the sharp one. **A reserved name is refused by `install` and accepted by
`write`** — so the skill exists, and loads for whatever agent reads `.agents/skills/`,
while being permanently un-fannable **[measured]**. The same is true of `broken-src`: OK
refuses to project it, but Claude Code is already reading it at `.claude/skills/broken-src/`.

> **The validator protects the *other* editors, not the authoring one.** A skill's own
> folder is a projection; there is no state in which a skill exists but is not loaded
> somewhere.

The machine-readable side of the non-fatal half, from the runtime's `install` result schema
**[read]**:

```js
warningCodes: ["no-targets","scripts-present","name-conflict","no-description",
               "skill-fork-name-unpatched","place-path-invalid","place-fork-refused"]
```

Reached one of them **[measured]** — `install({ name:"hand-made", scope:"project" })` with
no `add`:

```json
{"text":"Skill \"hand-made\" now lives at: claude.\nNo project-configured editors detected — nothing was projected. Set up an editor for this project (add .mcp.json / .cursor/mcp.json / .codex/config.toml) or pass explicit `targets`.",
 "hosts":["claude"],"scripts":false,
 "warnings":["No project-configured editors detected — …"],"warningCodes":["no-targets"]}
```

### The thing that *is* a review affordance

`history({ skill: "r2-probe" })` **[measured]**:

```json
{"version":"26d190def3ec2bedda96b7c50b1d1c22c49dc97d","timestamp":"2026-08-20T07:23:09Z",
 "author":"claude-code","authorEmail":"agent-dfef18c0-…@openknowledge.local",
 "kind":"wip","message":"skill-create: .claude/skills/r2-probe/SKILL.md",
 "contributors":[{"name":"claude-code","docs":[".claude/skills/r2-probe/SKILL"]}],
 "checkpoint":null}
```

A project skill is versioned in the shadow git repo, attributed to the authoring agent, with
`kind: "wip"` and `checkpoint: null`. `history`'s schema **[read]**: *"PROJECT-scope skills
only — global skills are unversioned."* Roll-back is `restore_version({ skill, version })`.

**[inference]** If Ambient wants a review gate, *this* is the seam OK actually gives it —
attributed `wip` versions plus a `checkpoint` verb — not `install`. And it only exists at
`scope: project`. A `scope: global` skill has no history at all.

---

## 4 — Projections: `install` owns fan-out; it does not own authorship

### Confirmed: `install` owns the projections and their bookkeeping

`docs/rules/knowledge.md:31-33` says `install` *"projects it into `.claude/`, `.pi/` and the
rest."* True, and measured in §3: it created the symlinks and the placements file. Real
global state agrees — `/Users/abuusama/.ok/local/skill-placements.json` **[measured]**
records four projections for each of OK's own bundles:

```json
"open-knowledge-discovery":[
  {"path":".claude/skills/open-knowledge-discovery","mode":"copy","hash":"d81d7b60…f197e"},
  {"path":".cursor/skills/open-knowledge-discovery","mode":"copy","hash":"d81d7b60…f197e"},
  {"path":".codex/skills/open-knowledge-discovery","mode":"copy","hash":"d81d7b60…f197e"},
  {"path":".opencode/skills/open-knowledge-discovery","mode":"copy","hash":"d81d7b60…f197e"}]
```

The `hash` is what makes a copy refreshable — OK's guide **[read]**: *"A copy is its own
folder and refreshes automatically from the source — until someone hand-edits it, at which
point it forks and is never overwritten again."* The hash is how it detects the hand-edit
**[inference]**.

### Refuted: writing by path bypasses no gate, because there is none

The decisive experiment **[measured]**. Two skills created with a plain shell heredoc, OK
never told:

```
.claude/skills/hand-made/SKILL.md    # valid frontmatter, never touched by an OK tool
.claude/skills/broken-src/SKILL.md   # valid frontmatter, git conflict markers in the body
```

Then `skills({ scope: "project" })`:

```json
{"name":"broken-src","scope":"project","description":"Has git conflict markers below.",
 "installed":true,"hosts":["claude"],
 "locations":[{"id":"claude","path":".claude/skills/broken-src","role":"source"}],"mode":"link"},
{"name":"hand-made","scope":"project","description":"Authored by plain file write, never through OK's write tool. …",
 "installed":true,"hosts":["claude"],
 "locations":[{"id":"claude","path":".claude/skills/hand-made","role":"source"}],"mode":"link"}
```

**Both adopted, both `installed: true`, both indistinguishable from the OK-authored
`r2-probe` in every field the tool returns.** There is no `managed` flag separating them, no
`origin`, no provenance. And `install({ name: "hand-made" })` then operated on the
hand-written skill without complaint (§3).

**[inference]** OK discovers skills by *scanning the host skill roots*. It has no registry
of "skills it made". The word "managed" in `skills`'s description — *"list managed skills"*
— means "skills OK can see and operate on", not "skills OK created".

### So what does a by-path write actually cost?

Three things, all real, none of them a gate **[inference, from the measurements above]**:

| Lost | Because |
|---|---|
| `install`'s source validation | Nothing ran it. A conflict-marker or reserved-name skill sits live in `.claude/skills/` until someone tries to fan it out. |
| `.ok/local/skill-placements.json` entries | Hand-made copies are not tracked, so OK cannot refresh or losslessly remove them. |
| Attributed `wip` versions in the shadow repo | `history({skill})` had one entry for `r2-probe`; a hand-written file gets a commit only when the watcher picks it up as content, without the `skill-create:` message or agent attribution. |

The rule at `docs/rules/knowledge.md:30-34` reaches the **right conclusion for the wrong
reason** **[inference]**. `ambient skill add` should not exist — but not because it bypasses
a review gate. It should not exist because OK's `install` already owns placement bookkeeping,
refresh, symlink/copy conversion, and per-host root resolution across eleven host ids and two
scopes, and re-implementing that by path buys nothing and drifts.

### The MCP surface exposes fewer hosts than the runtime knows

The runtime's host list **[read]**:

```js
Tl=[`claude`,`claude-desktop`,`cursor`,`codex`,`copilot`,`opencode`,`openclaw`,`pi`,
    `antigravity`,`lm-studio`,`hermes`]
```

Eleven, of which six have a project skills root. The MCP `install` tool's `add`/`remove`
enum is **six** — `claude | cursor | codex | copilot | opencode | pi` — plus `agents` and
free-form custom root paths **[read]**. `.gemini/skills` (antigravity, global-only) is
reachable only as a custom root string; real evidence it happens sits in
`/Users/abuusama/.ok/local/skill-placements.json` **[measured]**:

```json
"react-doctor":[{"path":".gemini/skills/react-doctor","mode":"copy","hash":"1a4d040c…c255d4"}]
```

---

## 5 — Authoring from an agent: the full MCP surface

Everything below is a schema quote **[read]** unless marked otherwise.

### `write` — a dedicated skill shape, not a document

```
skill — Create or overwrite an agent SKILL: reusable agent guidance you author in OK and
`install` into your editors. A NEW skill lands at the project's default skill home
(e.g. `.agents/skills/<name>/`); an existing one is edited at its real folder.
{ name, description, body, scope? }
```

- `name` — *"the skill's identity AND its bundle-dir name … Lowercase letters, digits, hyphens only (≤64 chars; no slashes, dots, spaces, or uppercase)."*
- `description` — *"One-line description (≤1024 chars) — the PRIMARY triggering surface telling an agent WHEN to use this skill. No XML tags (`<...>`), which break the skill loader. **Optional when writing ONLY `files` into an existing skill.**"*
- `body` — *"SKILL.md body (markdown guidance). Authored WITHOUT frontmatter — `name` + `description` are passed separately and composed server-side. Keep under ~500 lines."*
- `files` — *"an ARRAY of `{ path, content }` … Text only (no binary). Independent of `body`: write one reference without resending SKILL.md."*
- `scope` — `"project"` | `"global"`.

There is **no** `write`-a-document-with-a-skill-shape path. `write` takes exactly one of
`document | folder | template | skill | asset | documents`, and `skill` is its own branch.

### The rest of the vocabulary

| Verb | Signature | Note |
|---|---|---|
| `edit({ skill })` | `{ name, find, replace, occurrence? }` **or** `{ name, description }` **or** `{ name, file, find, replace }` | *"a `description` change (a skill's only metadata leaf). Every recorded copy re-syncs from the source, so there is nothing to re-install."* |
| `skills({})` | list — both scopes at once | Returns `{ name, scope, description, installed, hosts[], locations[{id,path,role}], mode, conflicts? }` **[measured]** |
| `skills({ name })` | read SKILL.md + `files: [{path, kind}]` | *"`scope` optional — omitted, it resolves by name (preferring Project when a name exists at both levels)"* |
| `skills({ name, file })` | one bundle file's text | *"the universal read path for references + scripts (no native `cat`)"* |
| `skills({ query })` | marketplace search against skills.sh | Rows are *"external candidates … NOT managed content until you call `import`"* |
| `import({ source, add, skill?, scope?, mode? })` | fetch into `.agents/skills/<name>/` | *"Provenance (source, commit, content hash, publisher) is recorded in `.ok/skills-lock.json`. Scripts are imported as content and are NEVER executed."* `add` is **required**: *"A skill acquired and placed nowhere is not a state worth having."* On name collision it lands as `<name>-imported` and never overwrites. |
| `install({ name, add?, remove?, mode?, convert?, source?, skillFolders? })` | placement | Returns `{ name, hosts[], scripts, warnings[], warningCodes[] }` |
| `delete({ skill: { name } })` / `{ name, files[] }` | remove skill or bundle files | *"to make a skill stop existing, use `delete`"* |
| `history({ skill })` → `restore_version({ skill, version })` | versions | *"PROJECT-scope skills only — global skills are unversioned"* |

`skills`'s own description carries one hard prohibition Ambient should keep **[read]**:

> Managed skills are addressed by `name` + `scope`, NOT by path — do NOT `ls`/`cat`
> `.ok/skills/` or pass raw `.ok/...` paths; `.ok/` is opaque internal state.

### Where a new skill actually lands is dynamic

`write({skill})` has no fixed home. Measured, in order, in one scratch project:

1. `.ok/` present but no editor skill root anywhere → **`Error: No agent skill host is available.`** **[measured]**
2. `mkdir .claude/skills` → the same call created `.claude/skills/r2-probe/SKILL.md` **[measured]**
3. after an `install` had created `.agents/skills/` → a later `write` landed at `.agents/skills/open-knowledge-probe/SKILL.md` **[measured]**

**[inference]** The default skill home is resolved from the host roots that exist, preferring
the `.agents/skills` hub once it does. It is not a configurable key — the merged config from
`config({})` on a real project has no `skills` sub-tree at all **[measured]**.

### `cwd` resolves to the project root, not the folder you point at

Directly load-bearing for Ambient's *"`cwd` is the chat's own folder"* decision
(`product.md`, Decided). `write({ skill: { name: "cwd-probe", … } })` with
`cwd = <project>/sub/deep` **[measured]**:

```
Created skill "cwd-probe" (.agents/skills/cwd-probe/SKILL.md)
```

`find <project>/sub` afterwards → only the two empty directories I made. **Nothing was
written under `sub/`.** The skill landed at the OK project root.

**[inference]** This is a real tension with Ambient's settled shape, and it is worth naming
before the design leans on it. `product.md` settles that *"the knowledge base and the chat
folders are separate trees"* and that *"`cwd` is the chat's own folder"*. But `install` and
`write({skill})` place skills at the **OK project root** — the knowledge base — because that
is the only root they can resolve from a `cwd`. A chat folder that is not an OK project has
no `.ok/` to walk up to, so the OK skill verbs cannot address it at all. **Whatever OK owns,
it owns inside the knowledge-base tree.** Skills scoped to one chat are not something this
mechanism can express today.

---

## What `skill-install-events.jsonl` actually proves

`/Users/abuusama/.ok/skill-install-events.jsonl`, 18 lines, 2026-07-28 → 2026-08-16
**[measured]**. Every line has the same shape; one verbatim, path-free:

```json
{"ts":"2026-08-16T16:29:29.791Z","surface":"cli-npx-skills-add","target":"cli-hosts","bundle":"discovery","outcome":"installed","version":"0.55.2"}
```

Counts **[measured]**: `bundle ∈ {discovery, write-skill}` only — 9 each. `surface ∈
{desktop-direct (12), cli-npx-skills-add (4), cli-start (2)}`. `target` is `cli-hosts` on all
18. Versions 0.41.0 → 0.55.2.

**What it proves, and what it does not.** It is a telemetry log for **OpenKnowledge's own two
onboarding bundles** — `open-knowledge-discovery` and `open-knowledge-write-skill` — being
(re)installed into the machine's editors, once per app launch or CLI start. It is gated by
`telemetry.skillInstallReports.enabled` in the project config **[read]**. Its `installsReported`
sibling in `/Users/abuusama/.ok/skill-state.yml` confirms the same **[measured]**:

```yaml
installsReported:
  - inkeep/open-knowledge-skills#open-knowledge-discovery
  - inkeep/open-knowledge-skills#open-knowledge-write-skill
  - inkeep/open-knowledge-skills#open-knowledge@/private/var/folders/…/home/knowledge
```

**It does not record a single user-authored skill install.** My own `install` calls in the
scratch project appended nothing to it — still 18 lines, still `mtime 2026-08-16`, verified
after every mutating call **[measured]**. So the file is **not** an audit trail of the
Draft→install flow, and Ambient cannot use it as one. The per-project audit trail is
`.ok/local/skill-placements.json` (current state, not history) plus the shadow repo via
`history({skill})`.

---

## What this means for `product.md:381`

The sentence *"An agent authors a Draft; `install` is the review gate"* is **wrong on both
clauses** [measured, §3], and the correction is small but load-bearing:

- There is no Draft. `write({skill})` produces a **live skill** at its source folder, loadable immediately by whatever agent reads that folder. A hand-operated pass becomes a skill the moment it is written, not when it is approved.
- `install` is a **placement verb**, not a gate. It answers *"where else does this skill appear"*. It refuses malformed or reserved-name sources before fanning them out, which is a real validator — but it never withholds a skill from the editor whose folder holds the source.
- The review affordance OK actually offers is **attributed versioning** — `history({skill})` → `restore_version` — and it exists only at `scope: project`.

**[inference]** If Ambient wants a human gate between "an agent wrote a pass down" and "every
agent now runs it", OK does not supply one and the design has to build it. The cheapest shape
that fits OK's grain is to **author at a scope nobody reads yet** — a custom root such as
`.ambient/proposed-skills` via `install({ source })` or `write` into a root no host is
configured for — and make promotion an `install({ add: [...] })` performed by the Root. That
is a gate Ambient owns, expressed entirely in OK's own vocabulary, with no path-writing. It is
not what `product.md` currently describes.

`docs/rules/knowledge.md:30-34` needs a smaller edit: strike *"`write` creates a Draft and
`install` is the review gate"* and *"bypasses the gate"*, keep *"depend on OK's tool surface,
never on its internals"* and *"which is why `ambient skill add` does not exist"* — the
conclusion survives, the mechanism named for it does not.

---

## What this does not establish

- **Global-scope authoring was never executed.** Every mutating call used `scope: "project"` in a scratch project, because a global write lands under `$HOME` and I was told not to install anything globally. Global behaviour above is read from schemas, the two root maps, and the 85 already-managed global rows — not measured end to end.
- **Whether a fresh `ok init` project gets a skill home.** My scratch had `.ok/config.yml` hand-written and no editor dirs, which is why the first `write` returned `No agent skill host is available`. What `ok init` scaffolds was not tested — `docs/rules/knowledge.md:15-19` already records that it writes `.claude`, `.codex`, `.cursor`, `.github`, `.opencode` and `.pi`, which **[inference]** would supply the home immediately.
- **`import` was never called.** Its provenance file `.ok/skills-lock.json` is quoted from the tool schema only; I did not fetch anything from skills.sh. (Ambient's own root-level `skills-lock.json` is a different tool's file — its entries are `{source, sourceType, skillPath, computedHash}` for `install-anti-slop`, not OK's shape **[measured]**.)
- **The `agents` hub's precedence rules.** `write` landed at `.agents/skills/` once that directory existed and at `.claude/skills/` before, but I did not isolate the resolution order across all six hosts.
- **What the OK desktop UI shows.** Every write returned a `previewUrl` of the form `/#/__skill__/project/<name>`, so there is a skill view in the app. Whether it offers any approval affordance was not examined — no browser was opened.
- **Version skew.** The local binary and app bundle are **0.55.2**; npm's `@latest` is **0.58.9** **[measured]**. Only the config schemas were read at 0.58.9, and they were identical in the respect that mattered (no skill schema). Nothing else here is verified against 0.58.9.
- **`conflicts` semantics.** Three rows in the live listing carry `conflicts` (`impeccable` × 3, e.g. `["claude","pi"]`) **[measured]**, which the runtime's row schema glosses as *"Hosts whose dir holds a DIFFERENT same-name skill (fork/conflict) — occupied, not this skill"* **[read]**. How `install` behaves against one was not tested.

## What was touched — and the `.ambient/knowledge` incident

Every mutating call in this finding ran against `…/scratchpad/okscratch`, created for it and
containing nothing else.

`/Users/abuusama/.ok/` was **not written**: `skill-install-events.jsonl` is still 18 lines at
`mtime 2026-08-16 16:29`, `skill-state.yml` still 1128 bytes at `16:34`, `skills/` still empty
— re-verified after the last call **[measured]**. `ok init` and `ok repair-skills` were never
run.

### The incident, and who caused it

An `ok start` ran against the principal's real knowledge base today, leaving a server holding
a lock on it and creating `.git/ok/` and `.ok/local/` inside it. This section records what the
log says, because two agents were running against this worktree at the time and attribution
matters.

`/Users/abuusama/.ok/logs/cli.2026-08-20.log` logs one line per CLI subcommand with its
`cwd` **[read]**. Line 6 **[measured]**:

```json
{"time":"2026-08-20T07:19:23.186Z","pid":59965,"command":"start","cwd":"/Users/abuusama/.ambient/knowledge","msg":"cli command started"}
```

**That call was not mine, and the log carries the evidence rather than my word for it**
**[measured]**:

| Fact | Source |
|---|---|
| I never passed `/Users/abuusama/.ambient/knowledge` as `cwd` to any tool | every MCP call in this finding is quoted above with its `cwd` |
| My earliest logged entry is **line 9, `07:21:54`**, `command:"start"`, `cwd:…/open-knowledge-boilerplate` — the server auto-spawned by my first `skills({})` read | `cli.2026-08-20.log:9` |
| My second is **line 11, `07:22:45`**, `command:"start"`, `cwd:…/scratchpad/okscratch` — auto-spawned by my first `write({skill})` | `cli.2026-08-20.log:11` |
| My only *hand-typed* subcommands are three, all after `07:26`: `stop` (`:27`, `07:26:48`), `ps` (`:29`, `07:27:09`), `stop` (`:30`, `07:27:26`) — both `stop`s targeted scratchpad projects | `cli.2026-08-20.log:27,29,30` |
| Before `07:21:54` I had run only `ok --version`, `ok --help`, `ok skills --help`, `ok install --help`, `ok start --help`, `ok init --help`, `ok repair-skills --help`, all from `/tmp`. Help/version invocations log no `command` line | absence from `cli.2026-08-20.log` |

Line 6 precedes my first logged action by **2 minutes 31 seconds** and names a `cwd` that
appears nowhere in my transcript. The surrounding lines — `:8`, `:10`, `:12`–`:26`, `:28`,
`:31`, `:32`, all `start` / `mcp` / `lint` / `preview` against
`…/scratchpad/kb` and `…/scratchpad/nook/chats/capxul-devs` — belong to the other agent
working this worktree, whose brief is how `ok mcp` resolves which project it serves.
**[inference]** Line 6 fits that brief and not this one, but I am naming the log line rather
than the agent, because `cwd` alone cannot distinguish two agents sharing a worktree.

**A correction to my own record.** An earlier draft of this section asserted that my
`config`/`skills` reads spawned the `.ambient/knowledge` server. That was wrong — I inferred
it from the directory's mtime without checking the log, and the log refutes it. The mtime I
saw was line 6's server, already running.

**Nothing in that directory was repaired, stopped, or deleted by me**, per the coordinator's
instruction; PID 59965 was left alone. No content file changed there — `find … -newermt
2026-08-20T07:00:00 -type f` outside `.ok/local/` returns nothing **[measured]**. All work
after the instruction arrived was `cat` / `ls` / `grep` only.
