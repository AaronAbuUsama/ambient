# SKELETON — spec

**Area:** SKELETON (Area 1) · **State:** specified, not started · **Date:** 2026-08-16

The conventions, as code. Interfaces settled in [ADR 001](../../adr/001-home-interface.md)
(`home`) and [ADR 002](../../adr/002-work-interface.md) (`work`, provisional). This document
is the layout, the verbs, the schemas and the gate.

**The question this area answers.** *Is there one command that creates a correct Ambient
home, and one that tells you when a home is wrong?*

**Out of scope.** Any content, any model call, any loop. **Nothing here reads a message.**
`work` is designed but not built — LOOPS builds it.

---

## 1. The home, path by path

Three owner kinds, from [ADR 001](../../adr/001-home-interface.md):

| Owner | Meaning |
|---|---|
| **`home`** | `home` creates it from a template, parses it, validates it, and returns its value. |
| **`foreign`** | `home` creates the slot and vouches for its kind. The contents belong to another module and `home` never reads inside. |
| **`derived`** | Generated output. Never validated. Never a failure when absent or stale. Safe to delete — it rebuilds. |

Root is `$AMBIENT_HOME`, else `~/.ambient`. **The composition root resolves it; `home`
receives a string and reads no environment.**

### Global

| Path | Owner | Created by | May write | `doctor` checks |
|---|---|---|---|---|
| `identity.md` | `home` | `init` | human · Root | exists, non-empty |
| `config.yaml` | `home` | `init` | human · Root | §3.1 in full |
| `schema.yaml` | `home` | `init` | human · Root | §3.4 in full |
| `.gitignore` | `home` | `init` | `home` | exists |
| `knowledge/` | `foreign` | `init`, via injected `ok init` | **OpenKnowledge only** | is a directory. **Never read inside** |
| `blobs/` | `foreign` | `init` | `blobs` only | is a directory. Contents never inspected |
| `state.db` | `foreign` | **`work`**, on first use | `work` only | *if present:* SQLite header magic. Nothing schema-level |
| `chats/` | `home` | `init` | `home` (via `chat add`) | is a directory |
| `agents/` | `home` | `init` | `home` (via `agent add`) | is a directory |

`state.db` is **optional** — SKELETON ships no `work`, so a healthy SKELETON home has no
database. `doctor` checks its parent, and checks the magic bytes only if the file exists.

`.gitignore` is `home`'s because *configuration is files in a git repo* and `blobs/`,
`state.db` and `knowledge/`'s own state must stay out of it.

### Per chat — `chats/<slug>/`

| Path | Owner | Created by | May write | `doctor` checks |
|---|---|---|---|---|
| *(the folder)* | `home` | `chat add` | — | slug legality (§2.3) |
| `config.yaml` | `home` | `chat add` | human · Root | §3.2 in full |
| `mandate.md` | `home` | `chat add` | human · Root | exists, non-empty |
| `skills/` | `foreign` | **KNOWLEDGE** | OpenKnowledge `install` | *not yet* |
| `transcript.jsonl` | `foreign` | **INTAKE**, on first append | `channel` only | **never validated** — see below |
| `media/` | `foreign` | **INTAKE**, on first ref | `channel` only | *not yet* |
| `now.md` | `derived` | **LOOPS**, by the receipt fold | the fold only | never validated |

**`transcript.jsonl` is never parsed by `home`, deliberately.** ADR 001 invariant 8: *`home`
parses only files whose size is bounded by configuration, never by traffic.* It is the one
file in a chat folder that grows with use, and it is what makes reading a unit per turn
affordable and keeps `doctor` from getting slower the more Ambient is used. A torn trailing
line is `channel`'s to tolerate on read.

### Per agent — `agents/<name>/`

| Path | Owner | Created by | May write | `doctor` checks |
|---|---|---|---|---|
| *(the folder)* | `home` | `agent add` | — | name legality (§2.3) |
| `agent.yaml` | `home` | `agent add` | human · Root | §3.3 in full |
| `SKILL.md` | `home` | `agent add` | human · Root | exists, non-empty |

### The scaffolding rule

> **A directory is scaffolded in the area that gives it a writer.**

So `chat add` creates the folder, `config.yaml` and `mandate.md` — and nothing else. Not
`skills/`, not `media/`, not `now.md`.

This follows AGENTS.md — *"Create a directory only when there is behaviour. No scaffolding
for later"* — and it keeps `doctor` honest, because a directory nothing writes is a
convention `doctor` cannot meaningfully check, and an unchecked convention is folklore.

The counter-argument is real and worth recording: roadmap.md says *"the scaffolder is how a
convention becomes real"*, and an empty `media/` in a fresh chat teaches a human reading the
folder what belongs there. The convention SKELETON does make real is the one it can check —
**a chat is a slug directory with a machine half and a prose half.** Reversing this is three
lines in the converge list and one in the plan list, per area, when that area lands.

### Cross-file referential integrity — checked by `home.plan()`, nothing else can see it

| Reference | Must resolve to |
|---|---|
| `config.yaml` → `roles.*` | a key in `config.yaml` `models` |
| `chats/<slug>/config.yaml` → `source` | a key in `config.yaml` `sources` |
| `chats/<slug>/config.yaml` → `mcp[]` | keys in `config.yaml` `mcp` |
| `chats/<slug>/config.yaml` → `agents[]` | directories under `agents/` |
| `agents/<name>/agent.yaml` → `model` | a key in `config.yaml` `models` |
| `agents/<name>/agent.yaml` → `mcp[]` | keys in `config.yaml` `mcp` |

These are exactly the checks four hand-written traversals reliably forget, and the reason a
chat granting a nonexistent background agent is caught by `doctor` rather than by a session
failing at 3am.

---

## 2. The CLI

`cli` is command wiring only — **no logic**. Rendering lives in `home.describe`; `cli` prints
a string and sets an exit code.

Global: `--home <path>` overrides `$AMBIENT_HOME`. Exit `0` = healthy, `1` = problems.

### 2.1 `ambient init`

`home.converge()`. Converges, then reports what convergence could not fix.

- Creates every `home`-owned global path from templates, plus `chats/` and `agents/`.
- Runs `ok init` in `knowledge/` **iff absent**, through the injected `initKnowledge` —
  `home` never spawns a process.
- **Converge, not skip-if-exists.** Re-running on a home where someone deleted `schema.yaml`
  puts it back. Running on a home half-made by a crashed `init` repairs it.
- **Never overwrites authored content.** A `mandate.md` that exists is left alone, even a
  malformed one — destroying a broken mandate is worse than reporting it.
- **Recursive downward, but invents no children.** It also converges every chat and agent
  folder that exists; it never creates a chat that is not there.
- Every whole-file write is temp-then-rename. A file is old or new, never torn.
- A defect convergence has no right to fix (a typo'd key) is reported, and `init` exits `1`.

### 2.2 `ambient doctor`

`home.plan()` — `converge()` minus the writes. **One list of things that must be true, two
verbs over it.** This is what makes `doctor` structurally incapable of falling behind `init`.

Output is sorted by path then problem tag, so it is stable and diffable:

```
$ ambient doctor; echo "exit=$?"
chats/bug-reports/config.yaml: unknown key "tool" (known: source, peer, tools, mcp, agents)
chats/bug-reports/mandate.md: missing
config.yaml: sources.personal.mode must be one of ingest|speak, got "listen"
config.yaml: roles.digest names model profile "careful", which is not defined (known: fast, cheap)
agents/linear/agent.yaml:4:11: malformed YAML — mapping values are not allowed here
exit=1
```

### 2.3 `ambient chat add <slug>` · `ambient agent add <name>`

`home.chat(slug).converge()` / `home.agent(name).converge()`.

- Idempotent. Re-running on a chat whose `mandate.md` was deleted restores it and leaves
  `config.yaml` untouched.
- Works on a machine that never ran `init` — the unit converges its parents first.
- **Names are a trust boundary.** `^[a-z0-9][a-z0-9-]{0,63}$`, plus reserved names. Chat
  slugs will eventually derive from WhatsApp group names, and `..` must never become a path.
  Case collisions are detected — `chats/Ops` beside `chats/ops` is invisible on macOS and
  breaks on Linux.
- Templates are string constants inside the implementation, not a `templates/` directory, and
  not in the interface. `chat add --from <template>` does not exist.

### 2.4 `ambient skill add` — deliberately not built

**Flagging this as a departure from the area's brief, with the reason.**

Skills are first-class OpenKnowledge objects: `write({ skill: { name, description, body,
scope } })` creates a **Draft**, and `install` is the review gate that projects it into
`.claude/`, `.pi/` and the rest. Skills are addressed by `name` + `scope`, **never by path**,
and the projections under `skills/` must never be read or edited because `install`
regenerates and overwrites them.

An `ambient skill add` that writes a file into `chats/<slug>/skills/` would be writing
directly into those projections — re-implementing what OpenKnowledge owns, and bypassing the
Draft→`install` gate that thesis.md calls out as the self-evolution mechanic's review
boundary. AGENTS.md's standing decision applies: *depend on OK's tool surface, never on its
internals.*

Skill authoring belongs to **KNOWLEDGE**, through OpenKnowledge's own tools. Reversible: if
a chat-local skill turns out to need a non-OK path, it is one more `Ensure` arm.

---

## 3. The config schemas

**Fail-closed everywhere: an unknown key is a named problem, not a silent default and not a
dropped field.** Near-miss filenames are fatal too — `config.yml` beside a declared
`config.yaml`, or `mandate.MD`, because a file that looks like it should work and silently
does not is the worst failure available.

### 3.1 `config.yaml`

```yaml
sources:                    # name -> source. Closed value shape.
  personal:
    kind: whatsapp          # whatsapp | email
    mode: ingest            # ingest (never speaks) | speak
    allow:                  # opt-in, conversation by conversation. [] means nothing.
      - "<conversation id>"
  ambient:
    kind: whatsapp
    mode: speak
    allow: []

mcp:                        # server definitions, global. Referenced by name per chat/agent.
  openknowledge:
    command: ok
    args: [mcp]
    env: {}                 # optional

models:                     # provider definitions
  fast:
    provider: anthropic
    model: claude-sonnet-5
    thinking: low           # off | low | medium | high
  careful:
    provider: anthropic
    model: claude-opus-5
    thinking: high

roles:                      # role -> a key in `models`. Checked by doctor.
  default: fast
  speaker: fast
  digest: careful
  media: fast
  synthesis: careful
```

The `models` / `roles` split is **provider-definitions versus role-profiles**, which grill
002 identified as the one thing worth porting from the old `src/models/`.

**Open tension, recorded so it is not rediscovered.** MCP servers are defined globally and
referenced by name per chat, so a typo is caught by `doctor` and a command line lives in one
place. This slightly weakens product.md's *"`cat` the config and you know exactly what this
chat can do"* — you see which servers, not their command lines. **Revisit if two chats need
the same server name with different arguments.**

### 3.2 `chats/<slug>/config.yaml`

The machine-readable half of the mandate. `mandate.md` beside it is the prose half; it has
no keys and therefore cannot fail closed, which is exactly why product.md splits the mandate
in two — everything checkable lives here.

```yaml
source: personal            # must resolve in config.yaml `sources`
peer: "<the source's own id for this conversation>"
tools: []                   # tool names this speaker has
mcp: [openknowledge]        # must resolve in config.yaml `mcp`
agents: [linear]            # must resolve under agents/
```

`source` and `peer` are **the fields most likely to be wrong** — the binding between a chat
folder and a source conversation is being decided without INTAKE's data in front of us.
roadmap.md budgets one revision; this is where it is expected to land.

### 3.3 `agents/<name>/agent.yaml`

```yaml
model: careful              # must resolve in config.yaml `models`
thinking: high              # off | low | medium | high
mcp: [openknowledge]        # must resolve in config.yaml `mcp`
scope: "Reads and files Linear issues. Declines anything outside the configured team."
```

### 3.4 `schema.yaml` — closed field vocabulary, open type space

This is the answer to roadmap.md's open research question, *"schema coverage for a whole
domain… extensible per install without going open-ended"*, adopted from design B of the
`home` round.

**Users add types. Users cannot add field forms.** Extension happens inside declared
entries; it never widens the vocabulary. That single distinction is what keeps per-install
extension from becoming a plugin system, and it is what `doctor` enforces.

The closed field forms — the whole vocabulary:

```
text · text[] · ref · ref[] · date · enum(a|b|c)      and a trailing `?` marks optional
```

The six types shipped by `init`, from knowledge-flow.md's draft:

```yaml
Person:
  name:    text
  aliases: text[]
  numbers: text[]
  org:     ref?
  role:    text?
  status:  enum(unreviewed|reviewed)
  source:  enum(history|witnessed)

Organization:
  name:    text
  aliases: text[]
  domain:  text?
  role:    text?
  status:  enum(unreviewed|reviewed)
  source:  enum(history|witnessed)

Commitment:
  what:           text
  who:            ref
  due:            date?
  source_message: text
  status:         enum(open|done|dropped)

Issue:
  title:    text
  platform: text
  repo:     text?
  number:   text?
  status:   enum(open|closed)

Media:
  hash:         text
  kind:         enum(image|voice|audio|video|document)
  from:         ref?
  chat:         ref?
  duration:     text?
  status:       enum(unprocessed|processed|failed)
  processed_by: text?

Chat:
  name:         text
  participants: ref[]
  purpose:      text?
  mode:         enum(ingest|speak)
```

`aliases` is how identity resolution works — a maintained list, not fuzzy matching and not
embeddings. `source` carries the provenance distinction that is ours rather than
OpenKnowledge's: *learned from the principal's history* versus *Ambient witnessed it*.

A user adding `Invoice: { supplier: ref, amount: text, due: date, status: enum(open|paid) }`
is legal. A user writing `amount: whatever` is a `doctor` failure.

**`schema.yaml` is validated for legality here and used by nothing in SKELETON.** KNOWLEDGE
is where `ontology lint` reads it. Shipping it now is the point — *shape before content.*

---

## 4. The gate

Verbatim from [roadmap.md](../../design/roadmap.md), made executable. Every line is an
assertion against a real temp directory, not a memfs stand-in — rename atomicity, symlink
escapes, `EACCES` and macOS case-insensitivity are exactly what this area exists to get
right and exactly what an in-memory stand-in models as fiction.

> **`ambient init` on a clean machine produces a home `ambient doctor` calls healthy.**

1. `init` on an empty directory exits `0`.
2. `doctor` immediately after exits `0` and prints no problems.
3. `init` a second time writes nothing and still exits `0`.
4. `init` with `identity.md` hand-edited leaves the edit intact.

> **Break any file by hand and `doctor` names it precisely and exits non-zero.**

5. Delete `schema.yaml` → `doctor` names `schema.yaml: missing`, exits `1`; `init` restores
   it; `doctor` exits `0`.
6. Unknown key in `config.yaml` → named with its path and the known key set, exits `1`.
7. Bad enum (`mode: listen`) → named with the expected values and what was found, exits `1`.
8. Malformed YAML → named with **line and column**, exits `1`.
9. `roles.digest` naming an undefined model profile → named as a dangling reference with the
   known set, exits `1`.
10. A chat granting a nonexistent agent → named, exits `1`.
11. `config.yml` created beside `config.yaml` → named as a near-miss, exits `1`.
12. A chat folder named `../escape` or `Ops` beside `ops` → named, exits `1`.

> **`chat add` produces a folder valid by construction.**

13. `chat add bug-reports` exits `0`; `doctor` exits `0`.
14. Delete its `mandate.md`; `chat add bug-reports` restores it and leaves `config.yaml`
    byte-identical.
15. `agent add linear` exits `0`; `doctor` exits `0`.

Plus the two invariants that are conventions only if they are checked — AGENTS.md: *"if
`doctor` cannot check it, it is not a convention"*:

16. `path.join`, `path.resolve` and `__dirname` appear nowhere under `src/` outside
    `src/modules/home/`. This is the enforcement of ADR 001's escrow rule.
17. `home` opens no file whose size is bounded by traffic — no read of `transcript.jsonl`,
    `blobs/`, `media/` or anything under `knowledge/`.

---

## 5. What this area does not decide

- **`work` is designed, not built.** [ADR 002](../../adr/002-work-interface.md) is
  provisional; LOOPS builds it and is expected to revise it. SKELETON's only contact with it
  is that `state.db` is an optional path `home` vouches for and never opens.
- **`doctor` cannot see inside `state.db`.** A row for a chat whose folder was deleted is
  invisible by construction. Right split, real hole — closing it needs `work` to expose its
  own check and `cli` to call both.
- **The chat ↔ source binding** (`source`, `peer`) survives contact with INTAKE or it does
  not. One revision is budgeted.
- **Issues are not filed yet.** This spec is the whole of
  `docs/planning/skeleton/`; per [issue-tracker.md](../../agents/issue-tracker.md),
  implementation tickets go to `docs/planning/skeleton/issues/NN-<slug>.md` when the work is
  broken down.
