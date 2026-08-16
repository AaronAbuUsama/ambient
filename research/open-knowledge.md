# OpenKnowledge — what it is, what it gives us, where it stops

Notes for future sessions. Read this before designing anything that touches knowledge
storage, retrieval, skills, or provenance — a large amount of what looks like "we need to
build X" is already here.

Source: the project-local runtime skill installed by `ok init`
(`.claude/skills/open-knowledge/SKILL.md`, v0.41.4, Inkeep), the global discovery skill,
and `~/email-pa/.ok/config.yml`.

---

## What it actually is

**A markdown-CRDT collaboration platform exposed over MCP.** Not a file convention, not a
viewer. A directory of `.md`/`.mdx` becomes a live multi-writer knowledge base where
agents and humans edit the same documents concurrently, every change is attributed, and a
browser preview renders edits as they land.

`ok init` from a repo root: scaffolds `.ok/`, wires the MCP server into detected editors,
installs the project-local runtime skill, ensures a `.git/`.

`content.dir` defaults to the repo root. Exclusions via `.gitignore` + `.okignore`
(honoured at any folder depth). **Every non-excluded `.md`/`.mdx` under `content.dir` is
an OK document** — including under `specs/`, `docs/`, `reports/`.

## The 21 tools

**Reads**
- `exec` — the primary read. A read-only shell subset (`cat` `ls` `grep` `find` `head`
  `tail` `wc` `sort` `uniq` `cut`; one command or one pipe, not a shell) that returns
  **enriched** output: frontmatter, backlink counts, recent activity, project git history.
  `exec("ls -A <dir>")` gives per-child frontmatter, recursive markdown counts, the
  most-recently-updated doc per subdir, and the folder's own `title`/`description`/`tags`
  plus `templates_available`.
- `search` — ranked BM25 + title boost + recency.
- `history` — versions for a doc. `links` — `backlinks | forward | dead | orphans | hubs |
  suggest`, or an array for a one-call audit.
- `skills` — list every skill across Project + Global, or read one. **Addressed by
  `name` + `scope`, never by path.**
- `lint` — markdown-lint violations, per doc or project-wide, `fix: true` auto-fixes.
- `audit` — every lint violation **plus every broken internal link**, by file, with lines.
  The authoritative link check.
- `config`, `palette` (authoring forms, theme tokens, JSX schemas), `preview_url`,
  `share_link`.

**Writes** — four polymorphic CRUD verbs over `document | folder | template | skill |
asset` (exactly one target, nested under its key):
- `write` — create or full-replace.
- `edit` — body find/replace **or** frontmatter merge-patch (`null` deletes a key).
- `delete`, `move` (rewrites referrers).
- Plus `install` (Draft → Installed, for skills), `checkpoint` (named version),
  `restore_version` (roll back).
- Every content write should carry a `summary` (≤80 chars) — it becomes the timeline entry.
- Every write response carries `brokenLinks` — `[]` or a list with `href` + reason.

**Conflicts** — `conflicts({kind: list|content})`, `resolve_conflict`. Projects with
GitHub sync can hold docs in merge-conflict state; mutating a conflicted doc returns a 409
(`urn:ok:error:doc-in-conflict`). `exec("cat …")` returns `lifecycle: {status, reason}`.

**Workflow** — `workflow({kind})` returns *procedural guidance, not data*:

| kind | when |
|---|---|
| `ingest` | preserve a URL/PDF/file verbatim (binary sources preserved, not scraped) |
| `research` | investigate/compare/synthesize → `status: provisional` article + `sources:` |
| `consolidate` | a decision was made → canonical doc with a `supersedes:` chain |
| `discover` | first arrival at a repo with content but no folder frontmatter/templates |

## The rules it enforces (these are ours for free)

**Grounding — every factual claim needs a source, and the source must live inside the KB.**
A bare `[source](https://…)` in a KB doc is *not* a citation — it is a TODO meaning "this
still needs ingesting". Web sources get fetched → `ingest`ed as a local doc → cited by
local path; the local doc carries `source_url:`. Citation chains terminate in preserved
local docs. If you have no evidence: search and ingest, mark `(TODO: needs source)`, or
don't write the claim. **This is provenance, already designed and already enforced.**

**Linking** — standard relative markdown links, `[text](./path.md)`, link liberally, every
link must resolve. Never backtick a link, never HTML `<a>`. `[[wikilinks]]` are *legacy*
and do not resolve from subfolders — email-pa's `bin/wiki` already discovered this and
switched.

**Frontmatter** — every doc needs `title` + `description`; `tags` recommended.

**Folders** — two opt-in nested mechanisms: `<folder>/.ok/frontmatter.yml` (the folder's
own properties, **self-only, does NOT cascade**) and `<folder>/.ok/templates/` (what new
docs start with). Most folders have no `.ok/`. Read the folder (`exec("ls -A")`) before
writing into it. Use a template when one fits. When the same frontmatter appears on
several siblings, bake it into a template.

**Persist incrementally** — the KB is the checkpoint. Write each unit as it completes;
never hold finished work in context for one final write.

**The STOP rule** — route every in-scope markdown read and write through OK's MCP tools,
never native `Read`/`Grep`/`Glob`/`Edit`/`Bash ls|cat|find`. Native bypasses the CRDT,
loses attribution, and skips the enrichment. Source code and non-markdown: native always.
Subagents bypass OK, so do markdown exploration yourself.

## Skills are first-class OK objects — this is the self-evolution mechanic

```
write({ skill: { name, description, body, scope } })   → .ok/skills/<name>/SKILL.md  [Draft]
install                                                 → projects into .claude/, .pi/,
                                                          .cursor/, .codex/, .opencode/,
                                                          .agents/, .github/
```

- **`scope: Project | Global`** — this is the local/global skill split, already solved.
- **Draft until `install`.** An agent can author or revise a skill; making it live is a
  separate, reviewable step. That is a self-evolving loop with a review gate built in.
- `move` with `toScope` promotes Project → Global (history resets, re-`install`).
- **Never read or edit the projections** under `.claude/skills/` etc. — `install`
  regenerates and overwrites them. Address skills by `name`+`scope`.
- Authoring a skill: invoke the `open-knowledge-write-skill` skill, don't improvise.

## What this replaces in Ambient's design

| Was going to be ours | OK ships it |
|---|---|
| `index.md` as the retrieval mechanism | `search`, `links`, enriched `exec ls -A` |
| A provenance design | the Grounding rule + `ingest` + `source_url:` |
| `bin/wiki lint` (rot, orphans, dead links) | `lint` + `audit` + `links` |
| git commit/revert for undo | `checkpoint` + `restore_version` + attributed shadow repo |
| Local vs global skills | skill `scope` + `install` |
| Page templates | `<folder>/.ok/templates/` |
| Multi-writer safety, single-writer discipline | **CRDT** + `conflicts`/`resolve_conflict` |
| Knowledge maturation, supersession | `workflow: ingest → research → consolidate` |

**The biggest consequence:** the "speaker must never write shared knowledge or it will
corrupt it" argument is gone — CRDT handles concurrent writes. Any remaining reason to
keep the speaker out of global knowledge is about *quality and latency*, not corruption.

## Where OpenKnowledge stops

Things it does **not** do, which stay ours:

- **Non-markdown state.** Transcripts, the WhatsApp mirror, media blobs, run receipts,
  the job queue. OK is `.md`/`.mdx` only.
- **Structured aggregate queries.** `search` is ranked text; `exec` is grep. "Every open
  commitment due before Friday, grouped by owner" is not a thing it answers.
- **Triggers, schedules, leases, concurrency of *runs*.** CRDT resolves concurrent *edits*;
  it does not decide who runs when.
- **The agent loop.** That is Pi.
- **Channels.** That is whatsappd.
- **Generated-region-inside-an-authored-page** (email-pa's `<!-- DOCS -->` /
  `<!-- EPISODES -->`). `edit` find/replace makes it easy, but the convention is ours.

## The stack, settled

```
OpenKnowledge   knowledge substrate — storage, retrieval, writes, attribution,
                conflicts, skills, templates, lint, versions, provenance rules
Pi              the agent loop — tools, context management, compaction, sessions
whatsappd       the channel — pairing, inbound accepted log, durable outbound queue

Ambient         the glue — sources, ingestion, loops, mandates, capabilities,
                the speaker, run receipts, jobs
```

We build the fourth row.

## Operational gotchas

- `write`/`edit` returning `"Hocuspocus server is not running"` → `ok start`, retry.
  **Never** fall back to native writes on in-scope markdown.
- MCP tools may be deferred/lazy in some clients — absence from the initial tool list means
  "not discovered yet", not "not registered". Run tool discovery first.
- Working in a git worktree: pass the worktree's absolute path as `cwd` once per session.
- `ok seed` needs `@inkeep/open-knowledge` >= 0.4.0.
- `cat ~/.ok/skill-state.yml` shows what is installed.
