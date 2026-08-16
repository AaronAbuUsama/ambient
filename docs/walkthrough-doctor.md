# `ambient doctor`, from keypress to output

A complete trace of one command through every file it touches. If you have never
seen this repository before, this is the document to read first: `doctor` is the
smallest path that passes through every layer, so following it once teaches you
the whole shape.

`doctor` answers one question — **what is wrong with this Ambient home?** — and
answers it by re-deriving health from the filesystem, every time, with nothing
cached.

---

## The map

Two modules and one process edge. Nothing else exists yet.

```
src/main.ts                        the process: environment, printing, exit code
  └── src/modules/cli/             argv → a verb on a home
        └── src/modules/home/      the home on disk: layout, validation, health
```

Every module has the same six slots, so you learn the layout once:

```
src/modules/<name>/
  README.md        what it owns · its invariants · how to test it
  types.ts         THE interface — read this first
  service.ts       the entry point's implementation
  internal/        everything only this module knows
  <name>.test.ts   tests, through the interface only
```

The rule that makes `internal/` mean something: **no module imports another
module's `internal/`.** `cli` may import `home/types.ts` and `home/service.ts`.
It may not import `home/internal/anything`.

Both are rules rather than habits — [rules/modules.md](./rules/modules.md) and
[rules/imports.md](./rules/imports.md), checked by `vp run shape`.

---

## The trace

### 1 · The shell — `src/main.ts`

You type `ambient doctor`. Node runs `src/main.ts`, which is the *composition
root*: the one place in the repository allowed to read the environment.

It does three things and stops:

```ts
const defaultRoot = process.env.AMBIENT_HOME ?? `${homedir()}/.ambient`;
const outcome = await run(process.argv.slice(2), defaultRoot);
```

Note what it does **not** do. It does not know what `doctor` means, does not know
what a home looks like, and does not format anything. It resolves where the home
is, hands `["doctor"]` to the CLI, and waits.

### 2 · argv becomes a verb — `src/modules/cli/service.ts`

`run` splices out `--home <path>` if it is there, looks up the first remaining
argument in a small map, and opens the home:

```ts
const COMMANDS: Readonly<Record<string, Command>> = { init, doctor, chat: chatAdd, agent: agentAdd };
```

There is no `switch` and no argument parsing library — a command is a key in a
map and a file in `internal/commands/`. A command line that does not resolve
returns `{ kind: "misuse" }`, which becomes exit `2` and is never confusable
with a home that has problems.

Then `openHome(root)` — and `doctor(home, [])`.

### 3 · The handler — `src/modules/cli/internal/commands/doctor.ts`

The entire file:

```ts
export const doctor: Command = (home) => report(home.plan());
```

That is not a stub. It is the actual command, and its smallness is the design:
`cli` holds no logic, so there is nothing here that can disagree with what `init`
does. `report` wraps the problems into an `Outcome`
(`src/modules/cli/internal/command.ts`).

### 4 · Opening the home — `src/modules/home/service.ts`

`openHome` deliberately **does not read anything and does not validate
anything.** It resolves the root into a `Layout` — the one value that knows where
`chats/`, `agents/`, `knowledge/`, `blobs/` and `state.db` live — checks that the
root is a directory or absent, and returns the handle.

This is the most load-bearing decision in the module. Opening a home that does
not exist yet must succeed, or `init` could never run. Opening a broken home must
succeed, or `doctor` could never run. Validation is a separate verb.

### 5 · The list — `src/modules/home/internal/ensure.ts`

`home.plan()` is `planned(homeItems(h))`. `homeItems` builds **one list of things
that must be true** about a home. Each entry is an `Ensure`:

```ts
type Ensure = {
  at: string;                                  // the human-facing label
  make?: () => Promise<string | void>;         // what `init` does about it
  check: () => readonly Problem[];             // what `doctor` says about it
};
```

`doctor` runs every `check`. `init` runs every `make`, then every `check`. This is
the single most important structural fact in the codebase: because both verbs
read the same list, `init` cannot create a file `doctor` forgets to check. The
classic drift — a scaffolder and a validator maintained separately until they
disagree — has nowhere to live.

The list for a home is, in order:

| Entry | What it asserts |
|---|---|
| `.` | the root is a directory |
| `identity.md` | present, non-empty |
| `config.yaml` | present, non-empty, and every key valid |
| `schema.yaml` | present, and the ontology's field forms are legal |
| `.gitignore` | present |
| `knowledge/` | is a directory. **Never read inside** |
| `blobs/`, `chats/`, `agents/` | are directories |
| `state.db` | *if it exists*, starts with SQLite's header magic |
| root names | no `config.yml` beside `config.yaml`, no `mandate.MD` |
| `chats/` and `agents/` children | every name matches `^[a-z0-9][a-z0-9-]{0,63}$` |
| each chat, each agent | the same list again, one level down |
| cross-references | everything a chat or agent names actually exists |

The last two rows are why `home` is one unit rather than a bag of units. It
enumerates the chats and agents that exist — it never invents one — and it can
see references no individual chat could check for itself.

### 6 · Reading a file — `internal/read.ts` and `internal/disk.ts`

When `config.yaml`'s check runs, it calls `readText`, which calls `readParsed` in
`internal/disk.ts`. **That is the only file in the repository that opens a file**,
and the only one that joins a path.

It will only open a file named in this union:

```ts
export type Parsed =
  | "identity.md" | "config.yaml" | "schema.yaml"
  | "mandate.md"  | "agent.yaml"  | "SKILL.md";
```

That union is an invariant expressed as a type. Every file in it is bounded by
*configuration*; `transcript.jsonl` — the one file in a chat folder that grows
with traffic — cannot be named there, so `doctor` cannot get slower the more
Ambient is used. A symlink pointing outside the home is refused rather than
followed.

Readers here take a `Problem[]` accumulator, push what is wrong and return
`undefined`. That is why one run of `doctor` reports *every* fault in a file
rather than stopping at the first, and why no step needs a type assertion.

### 7 · Validating it — `internal/yaml.ts`, `internal/config.ts`, `internal/schema.ts`

`yaml.ts` turns text into `unknown` — with a line and column if it will not parse
— and then narrows it one key at a time. `config.ts` uses those narrowers to
express the three schemas. `schema.ts` does the same for `schema.yaml`'s ontology.

Everything here is **fail-closed**: an unknown key is a named problem, never a
silent default and never a dropped field. A misspelled key that quietly did
nothing would be the worst failure available, so it is the loudest one.

### 8 · The checks no single file can see — `internal/refs.ts`

`crossRefs` reads every chat's and every agent's config and confirms that each
reference resolves:

| Reference | Must resolve to |
|---|---|
| a role, e.g. `roles.digest` | a profile in `models` |
| a chat's `source` | a key in `sources` |
| a chat's or agent's `mcp` | keys in `mcp` |
| a chat's `agents` | directories under `agents/` |
| an agent's `model` | a profile in `models` |

These are exactly the checks a hand-written traversal forgets. They are the
reason a chat granting a background agent that does not exist is caught by
`doctor` rather than by a session failing at three in the morning.

### 9 · Ordering — `internal/problem.ts`

`planned` flattens every check's output and runs `ordered`, which de-duplicates
and sorts by label, then by tag. `doctor` output is therefore stable and
diffable, which is what makes it usable in a gate.

A `Problem` is a home-relative label plus a tagged detail:

```ts
type Problem = { at: string; detail: ProblemDetail };
```

`at` is deliberately **not a usable path**. It is a string for a human. Nothing
downstream can pass it back to the filesystem.

### 10 · Rendering and exit — back out through `main.ts`

The problems travel back untouched: `home.plan()` → `doctor` → `run` → `main.ts`.
Only there are they turned into text, using `describe` — which lives in `home`,
because the module that knows what went wrong is the module that should say it.

```
chats/bug-reports/config.yaml: unknown key "tool" (known: source, peer, tools, mcp, agents)
chats/bug-reports/mandate.md: missing
config.yaml: sources.personal.mode must be one of ingest|speak, got "listen"
config.yaml: roles.digest names model profile "careful", which is not defined (known: fast, cheap)
agents/linear/agent.yaml:4:11: malformed YAML — mapping values are not allowed here
```

Empty output and exit `0` means healthy. Anything else is exit `1`.

---

## The one thing to remember

`ambient init` is the same walk with the writes turned on.

```ts
plan()      →  run every check
converge()  →  run every make, then every check
```

One list, two verbs. Every other property in this codebase — that `chat add`
produces a folder valid by construction, that a half-finished `init` is repaired
by re-running it, that `doctor` cannot fall behind `init` — falls out of that
single fact.

---

## Where to look next

- [`src/modules/home/README.md`](../src/modules/home/README.md) — the module's own
  page: what it owns, its ten invariants, how to test it.
- [`src/modules/home/types.ts`](../src/modules/home/types.ts) — the interface. If
  you can read one file, read this one.
- [`docs/planning/skeleton/spec.md`](./planning/skeleton/spec.md) — the authority
  on behaviour, path by path, with the gate at §4.
- [`docs/adr/001-home-interface.md`](./adr/001-home-interface.md) — why the
  interface is a handle, and the two designs that lost.
