# ADR 001 — the `home` interface

**Status:** Accepted, amended · **Date:** 2026-08-16 · **Area:** SKELETON

> **Amendments after implementation.** The decision stands; three details in the
> interface below did not survive contact and are corrected here rather than
> silently rewritten. See *Amendments* at the foot of this document.
> `HomeDeps` no longer exists · `HomeProblem.problems` is a plain array ·
> `converge` is async because it writes, not because it spawns.

Produced by a `DESIGN-IT-TWICE` round (three parallel designs) on the `home` module, as
required by [seams.md](../design/seams.md) — *"Two seams worth designing twice"*.

---

## Context

`home` is the floor. It depends on nothing, every area writes through it, and
[seams.md](../design/seams.md) makes it **the only module that knows a filesystem path**.
Changing the layout after INTAKE means rewriting what is on disk, which is why it is
designed before it is built.

**The failure to beat, measured.** The previous attempt's `src/home/` was 1038 lines: nine
files exposing eleven functions and twelve interfaces, all over file reading. Large
interface, thin implementation — shallow. Every caller learned the layout.
[AGENTS.md](../../AGENTS.md): *"Do not repeat that shape."*

**The five things the interface must cover.** Create a home idempotently · read it validated
as one value · re-derive health from disk · scaffold a chat/agent/skill from templates ·
signal change. Fail-closed throughout: an unknown key or a malformed file is a named
problem, never a silent default.

**The central tension.** `home` is the only module that knows a path, but `blobs` needs a
directory, `channel` needs to append to a transcript, `work` needs a SQLite file, and
`harness` needs a `cwd` to hand Pi. Hand out raw paths and every caller re-learns the
layout — the exact failure being avoided. Hand out live handles for all four and `home`
swallows four other modules.

---

## Decision

**The unit is the handle.** Three structural moves carry it; everything else falls out.

### 1. The home is itself a unit

Three inhabitants — home, chat, agent — answering the same three verbs. `init` and `doctor`
are not a second, parallel interface; they are the root unit's `converge()` and `plan()`.

### 2. `plan` and `converge` are one implementation, split apply/dry-run

```
ambient doctor      →  home.plan()
ambient init        →  home.converge()
ambient chat add x  →  home.chat('x').converge()
ambient agent add y →  home.agent('y').converge()
```

`plan()` is `converge()` minus the writes. There is **one** list of things that must be
true, and two verbs over it. The old repo's failure mode — `init` creating a file `doctor`
forgot to check — has nowhere to live. "`chat add` produces a folder valid by construction"
stops being an aspiration and becomes an assertion the gate runs:

```ts
assert.deepEqual(await chat.converge(), [])
assert.deepEqual(chat.plan(), [])
```

### 3. Nothing is cached. `read()` always hits disk

There is no watcher, no invalidation, no generation counter, no `revision` field. A mandate
edited by hand is live on the next `read()`, which for the speaker is the next turn.

**Hot-reload is not implemented — it is structural.** This deletes `fs.watch` recursion, a
debounce window, editor temp-then-rename handling, an ignore set and a rewire diff, and in
exchange the staleness window is not small but *zero*. `seams.md`'s sketch verb `watch` is
deliberately dropped: it fails the deletion test in reverse — remove it and no complexity
reappears in any caller, because every caller already re-reads per turn.

Cost: ~5 small reads and 2 YAML parses per turn. If that ever shows in a profile, an mtime
guard goes *inside* the handle and **no caller changes** — which is what buying a handle
instead of a value gets you.

---

## The interface

```ts
// ── entry ─────────────────────────────────────────────────────────────
// Resolves a root. Does NOT read, does NOT validate.
// Fails only if `root` exists and is not a directory.
export function openHome(root: string, deps: HomeDeps): Home | HomeProblem

export type HomeDeps = {
  /** Runs `ok init` in `dir`. Injected — home never spawns a process. */
  initKnowledge(dir: string): Promise<string | void>
}

export function describe(p: Problem): string   // rendering lives here, not in `cli`
```

**The most load-bearing invariant in this interface: `openHome` does not validate.** Opening
a home that does not exist yet must succeed or `init` cannot run; opening a broken home must
succeed or `doctor` cannot run. Validation is `plan()`. A design that validates on open
cannot express either command — and is very likely how the previous version grew a separate
`loadHome` / `readHome` / `checkHome` family.

```ts
// ── the three units ───────────────────────────────────────────────────
export type Home = {
  readonly root: string          // display only
  readonly blobs: Place          // → the `blobs` module
  readonly db: Place             // → the `work` module

  read(): Global | HomeProblem
  chat(slug: string): ChatHandle                    // pure, total — a bad slug fails at read()
  agent(name: string): AgentHandle
  chats(): readonly ChatHandle[]                    // total — each handle fails on its own
  agents(): readonly AgentHandle[]

  plan(): readonly Problem[]                        // `doctor`. [] means healthy.
  converge(): Promise<readonly Problem[]>           // `init`.  [] means healthy after repair.
}

export type ChatHandle = {
  readonly slug: string
  readonly cwd: Place            // → `harness`, straight to Pi
  readonly transcript: Place     // → `channel`
  readonly media: Place          // → `channel`
  readonly now: Place            // → the receipt fold
  read(): Chat | HomeProblem
  plan(): readonly Problem[]
  converge(): Promise<readonly Problem[]>
}

export type AgentHandle = {
  readonly name: string
  readonly cwd: Place
  read(): Agent | HomeProblem
  plan(): readonly Problem[]
  converge(): Promise<readonly Problem[]>
}
```

```ts
// ── what a unit reads as ──────────────────────────────────────────────
export type Chat = {
  readonly slug: string
  readonly cwd: Place
  readonly identity: string              // global identity.md — NEVER optional
  readonly mandate: string               // this chat's prose — ADDS to identity
  readonly tools: readonly string[]
  readonly mcpServers: readonly McpServer[]   // RESOLVED from global config.yaml
  readonly agents: readonly Agent[]           // RESOLVED from agents/ — objects, not names
  readonly source: Source                     // RESOLVED — carries mode + allowlist
  readonly peer: string                       // the source's own id for this conversation
  readonly model: string                      // role already resolved to a concrete model
}

export type Global = {
  readonly identity: string
  readonly sources: readonly Source[]
  readonly models: ModelPolicy
  readonly schema: Schema                // the closed ontology vocabulary
}

export type Source = {
  readonly name: string
  readonly kind: 'whatsapp' | 'email'
  readonly mode: 'ingest' | 'speak'
  readonly allow: readonly string[]      // opt-in per conversation; empty means nothing
}
```

**`Chat.identity` is non-optional, and `read()` fails if `identity.md` is missing or empty.**
This is the mechanical enforcement of *"local adds to identity, never replaces it"* — the
single worst bug in the old repo, whose one-line cause was
`src/conversation/context-builder.ts:120`, `claim.instructions ?? instructions`. **It is now
impossible to construct a session from a mandate alone, because no value has that shape.**

```ts
// ── errors: one vocabulary, everywhere ────────────────────────────────
export type ProblemDetail =
  | { _tag: 'Missing' }
  | { _tag: 'WrongKind'; expected: 'file' | 'directory' }
  | { _tag: 'Escapes' }                                    // symlink leaving the home
  | { _tag: 'Unreadable'; cause: string }
  | { _tag: 'Malformed'; line: number; column?: number; detail: string }
  | { _tag: 'UnknownKey'; key: string; known: readonly string[] }
  | { _tag: 'MissingKey'; key: string }
  | { _tag: 'BadValue'; key: string; expected: string; got: string }
  | { _tag: 'BadName'; got: string; expected: string }
  | { _tag: 'DanglingRef'; key: string; to: string; kind: 'agent' | 'mcpServer' | 'model' }

export type Problem = { readonly at: string; readonly detail: ProblemDetail }
export type HomeProblem = { readonly problems: readonly [Problem, ...Problem[]] }
```

`at` is a home-relative label — *deliberately not a usable path*. It is for humans, not for
`fs`. Narrow with `'problems' in result`.

**Resolution is total; only `read()` fails.** An earlier draft had `chat()` and `chats()`
return unions, which forced two guards at every entry point — one for a malformed slug, then
one for everything else — and made enumeration awkward to narrow. Writing the call sites out
showed the first guard earns nothing: a bad slug is just one more reason a unit will not
load, so it belongs alongside `Missing` and `Malformed` in `read()`. One guard per entry
point, one place that reports.

### `Place` — how a path escapes

```ts
declare const place: unique symbol
/** An absolute path inside the home. Home made it, checked its kind, and will not move it. */
export type Place = { readonly path: string; readonly [place]: true }
```

Branded, so no caller fabricates one from a string, and reaching the string is the visible
act `.path` rather than an invisible one. The rule that makes the escrow checkable rather
than folklore:

> **`home` emits a `Place` only when the consumer hands it to something outside our
> codebase. `home` never emits a path our own code will `join` onto.**

Enforced by one test, because [AGENTS.md](../../AGENTS.md) demands that conventions be
validated rather than believed: `path.join`, `path.resolve` and `__dirname` appear nowhere
under `src/` outside `src/modules/home/`.

Five `Place`s escape, all roots-of-grant: `chat.cwd` (Pi takes a `cwd`; the folder *is* the
isolation), `chat.transcript` and `chat.media` (→ `channel`), `home.blobs` (→ `blobs`),
`home.db` (→ `work`). Plus `chat.now` for the receipt fold.

### Invariants a caller must know

1. **Sync except `converge`.** The one async verb is the one that runs another program
   (`ok init`). That asymmetry is a signal, not a smell.
2. **`converge` converges, it does not skip-if-exists.** It re-derives from disk every call
   and repairs what is missing. A home half-made by a crashed `init` is fixed by re-running
   `init`. It is recursive downward — `home.converge()` also converges every chat and agent
   folder that exists — but it never invents children.
3. **`converge` never overwrites authored content.** It creates what is absent. It will not
   rewrite a `mandate.md` that exists, even a malformed one — destroying a broken mandate is
   worse than reporting it. A defect convergence has no right to fix is reported, and the
   command exits non-zero.
4. **Every whole-file write is temp-then-rename.** A file is old or new, never torn — the
   file half of grill 002's *"degraded, never corrupt"*.
5. **`plan()` is ordered** by `at`, then tag. `doctor` output is stable and diffable, which
   is what makes it usable in a gate.
6. **`home.plan()` is strictly more than the union of unit plans.** It additionally runs the
   cross-unit referential checks — a chat's `agents:` must resolve under `agents/`, its
   `mcpServers:` must be declared in global `config.yaml`, a model role must resolve to a
   defined profile. No single unit can see these. This is the "many units under one
   identity" problem email-pa never had, and it is why `home` is a unit rather than a bag of
   units.
7. **Slugs are a trust boundary.** Anything outside `^[a-z0-9][a-z0-9-]{0,63}$`, and every
   reserved name, is a `BadName` problem from `read()`, `plan()` and `converge()` — and no
   `Place` is ever produced for it. Chat slugs will eventually derive from WhatsApp group
   names, and `..` must never become a path. This check exists in exactly one place — it is
   precisely what vanishes when callers build their own paths.
8. **`home` parses only files whose size is bounded by *configuration*, never by *traffic*.**
   `transcript.jsonl` may be 100 MB; `home` never opens it. Same for blobs, media and the
   knowledge project. This invariant is what makes reading a unit per turn affordable, and
   it is why the transcript is a `Place` and not a reader (see *Rejected*, below).
9. **What `home` refuses to know.** It stats `knowledge/` and stops — never reads inside,
   never touches `.ok/`, never assumes OK's layout, per the standing discipline in
   [product.md](../design/product.md). It checks `state.db` for existence and the SQLite
   header magic and nothing schema-level, because that is `work`'s. It checks `blobs/` is a
   directory and nothing about its contents.
10. **A handle holds a name, not a descriptor.** It survives its folder being deleted and
    starts returning `Missing` at the point of use, rather than throwing from inside a
    session.

---

## Why the other two lost

### A — minimise the interface (two entry points)

`openHome(path, plan?)` and `watchHome(path, onHome)`, on the collapse that `init`,
`doctor`, `chat add` and `agent add` are one operation with a different `ensure` argument
and `doctor` is the empty one. The whole home — every chat, every agent, references already
resolved — is one frozen value.

Genuinely excellent, and it lost on two things.

**The watcher fails rung 1 of the ladder: does it need to exist at all?** A pays for
`fs.watch` recursion, a 50 ms debounce, editor temp-then-rename handling, an ignore set,
per-chat revision hashing and a `rewire` diff — and still has a staleness window, because a
watcher is a notification and notifications race. The winner deletes the entire subsystem
and has no window at all. This is the whole argument; everything else was close.

**Cascade.** A rejects a chat whose config is malformed *and* every chat that references a
rejected agent. One typo in `agents/linear/agent.yaml` silences every chat granted Linear.
Correct fail-closed reasoning, bad blast radius — and A's own report names the consequence:
*"a rejected chat goes quiet, and only the log says why."*

**Kept from it:** invariant 8 (traffic-bounded files) is A's insight and is load-bearing
here. Resolved references — `Chat.agents: Agent[]` rather than `string[]` — is also A's, and
deletes the existence-checking half of `capabilities` before `capabilities` is written,
which may be part of why seams.md already suspects it is not a module.

### B — the layout is data

One `LAYOUT` value of ~30 rows (`at`, `kind`, `owner`, `presence`, `shape`, `template`,
`provision`, `grant`, `hot`, `doc`) and one engine projecting it four ways. The strongest
*idea* of the three: four verbs over one traversal cannot drift, a new folder type is a row
that arrives already scaffolded, checked, watched and tested, and the rows are executable
documentation a non-engineer can read.

It lost on **floor-first**. Nothing works until `Infer<Shape>` and `Granted<Entries>` exist
— conditional-type machinery that B's own report calls *"the ugliest thing in the module"*,
whose failures are four hundred characters of nested generics, and for which it documents a
retreat path. SKELETON's job is to be the floor under eight other areas. A floor that starts
with the hardest types in the repo is a promise of a floor.

Two further marks against it. Its `openHome` returns `HomeProblem` if *anything* is wrong,
so **one broken chat config means nothing runs at all** — for a daemon that is the wrong
failure mode. And the winner gets B's central benefit anyway by a cheaper route: `plan` and
`converge` being one implementation delivers "the verbs cannot drift" without a declaration
engine.

**Kept from it:** `Place`, which closes the hole A admitted to and C could only cover with a
lint test. And the `schema.yaml` self-hosting idea — a **closed field vocabulary with an
open type space** — which is a real answer to the roadmap's open question, *"per-install
extension without going open-ended"*. Users add types; they cannot add field forms.
Extension happens inside declared entries and never adds rows. Specified in
[docs/planning/skeleton/spec.md](../planning/skeleton/spec.md).

---

## Rejected from the winner

**`Transcript.append` / `.tail` on the chat handle.** The winning design put JSONL framing
inside `home`, arguing that `doctor` must be able to name a torn line and that a second
parser in `channel` would drift.

Rejected, for two reasons. It contradicts [seams.md](../design/seams.md), which gives
`channel` *"sync a source → transcript entries + blob refs"* — and a settled seam is not
overturned by an argument this thin. More importantly it breaks invariant 8: the transcript
is the one file in a chat folder whose size is bounded by *traffic*, and letting `home` open
it is what makes per-turn reads unaffordable and `doctor` slow in proportion to how much
Ambient has been used. `doctor` checks that the home is correctly *shaped*, not that traffic
is intact. A torn trailing line is `channel`'s to tolerate on read.

`chat.transcript` is therefore a `Place`, handed to `channel`. The winning design flagged
this as *"the seam most likely to move"*; it moved immediately.

---

## Consequences

**What this buys.**

- `harness` learns four things — `openHome`, `home.chat`, `chat.read`, the `Chat` fields —
  to do its entire job. Compare the six facts every caller would otherwise carry: where
  `identity.md` lives, that it composes *before* the mandate rather than replacing it, where
  the mandate lives, that the mandate is two files, which model role applies, and that the
  chat folder is the `cwd`.
- Init, doctor and both scaffolders are one implementation. Not merely consistent —
  structurally incapable of drifting.
- The entire stale-cache and invalidation-race class does not exist.
- Renaming a file on disk is a change in one module.

**Costs accepted, with eyes open.**

- **No cross-unit queries.** "Which chats are in `ingest` mode", "how many grant Linear" —
  no home-level answer; a caller enumerates handles and `read()`s each. At 40 chats this is
  milliseconds. **If `ambient status` becomes a real command, revisit the shape rather than
  bolting on a query verb.**
- **The escrow is enforced by a lint test, not by types.** `Place` makes the escape visible;
  it cannot make it impossible, because a brand does not survive `.path`. This is the
  weakest joint. If it fails, it fails here, quietly, the first time someone needs a file
  `home` does not expose.
- **`doctor` cannot see inside `state.db`.** A row for a chat whose folder was deleted is
  invisible, by construction. Right split, real hole: the gate holds for every file `home`
  owns, and stops at the database's magic bytes. Closing it needs `work` to expose its own
  check and the CLI to call both — a change to `work`, not here.
- **Sources are not hot-reloaded** unless the caller re-reads. `product.md` only promises
  hot-reload for the mandate and chat config, so this is in contract, but it is an asymmetry
  a user will trip over. The fix is the sync loop calling `home.read()` per tick.
- **`Chat.source` and `Chat.peer` are the fields most likely to be wrong.** The binding
  between a chat folder and a source conversation is being decided without INTAKE's data in
  front of us. [roadmap.md](../design/roadmap.md) already budgets one revision; this is
  where it is expected to land.

**Dependencies.** The filesystem is DEEPENING category 2 (local-substitutable) and gets **no
port, internal or external** — tests use `fs.mkdtemp` and a real directory, because rename
atomicity, `O_APPEND`, symlink escapes, macOS case-insensitivity and `EACCES` are exactly
what this module exists to get right and exactly what an in-memory stand-in models as
fiction. `ok init` is category 4 and is the **one real port**: two adapters exist on day one
— `spawnOk` in the composition root, a stub in tests — which also keeps CI runnable without
OpenKnowledge installed. That single injected function is the whole of `HomeDeps`. No clock,
no logger, no filesystem.

---

## What would falsify this

- `ambient status`, or any cross-chat aggregate, becomes a real command → the handle shape
  is wrong; a whole-home value answers those in one expression.
- The per-turn re-read shows up in a profile → an mtime guard goes inside the handle. If
  that is not enough, the no-cache decision was wrong.
- A second module needs a file `home` does not expose, and the `path.join` lint test starts
  being argued with rather than obeyed → the escrow line is in the wrong place.
- `channel` starts wanting to *query* the transcript (search, rotate, compact) → that logic
  wants to sit beside the record schema, and `chat.transcript` as a bare `Place` is right;
  but if `doctor` is repeatedly blamed for calling a shredded transcript healthy, invariant
  8 gets revisited.

---

## Amendments

Three things in the interface above were wrong on contact with the implementation.
The decision — the handle, `plan`/`converge` as one list, nothing cached — is
unaffected.

### 1 · `HomeDeps` and `initKnowledge` are gone. `openHome(root)` takes no dependencies.

*Dependencies*, above, calls `ok init` "the one real port … that single injected
function is the whole of `HomeDeps`". AGENTS.md subsequently settled that we match
OpenKnowledge's format and never call its CLI: `ok init` also creates a nested
`.git`, editor wiring under six dot-directories, and housekeeping files, and its
`.ok/config.yml` is entirely comments because every key is a default. `init` now
writes that scaffold from `home`'s own templates.

With the spawn gone, `HomeDeps` had no members. An empty deps object that every
caller must construct and nothing reads fails the deletion test, so the type went
with it. `home` now has *no* ports: not a clock, not a logger, not a filesystem,
not a process.

Invariant 9 — "never touches `.ok/`" — is narrowed to what it was actually
protecting: `home` never **reads** inside `knowledge/`, and `doctor` still checks
only that it is a directory. It writes the scaffold once, and only when absent.

### 2 · `HomeProblem.problems` is `readonly Problem[]`, not `readonly [Problem, ...Problem[]]`.

The non-empty tuple cannot be produced without either re-constructing the array
(`[all[0], ...all.slice(1)]`) or an assertion, at *every* site that returns a
failure — eight of them in the first implementation. It buys nothing at any
consumer: the narrowing that matters is `"problems" in result`, which is identical
either way, and no caller indexes `problems[0]` unguarded. Emptiness is instead
prevented locally, where each reader pushes a problem before it returns nothing.

### 3 · Invariant 1's asymmetry has a different cause than stated.

"Sync except `converge`. The one async verb is the one that runs another program."
`converge` no longer runs another program. It is async because it writes to disk;
`plan` is sync because it only reads. The asymmetry is still a signal, and still
correct — the reason was not.
