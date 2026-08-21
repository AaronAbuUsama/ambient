# `home`

The Ambient home on disk: layout, validation, health, scaffolding. **The only
module in the repository that knows a filesystem path** ([ADR 001](../../../docs/adr/001-home-interface.md)).

Read [`types.ts`](./types.ts) first. It is the whole interface.

## What it owns

A home is a directory — `$AMBIENT_HOME`, else `~/.ambient`. `home` owns its
shape, and hands out only what another module genuinely needs:

| Path | Who owns the contents |
|---|---|
| `identity.md`, `config.yaml`, `schema.yaml`, `.gitignore` | `home` — created from templates, parsed, validated |
| `chats/<slug>/config.yaml`, `mandate.md` | `home` |
| `agents/<name>/agent.yaml`, `SKILL.md` | `home` |
| `knowledge/` | OpenKnowledge. `home` writes the scaffold once and never reads inside |
| `index.json` | `knowledge`. The derived index, kept **outside** the base and out of git |
| `blobs/`, `state.db` | `blobs` and `work`. `home` vouches for the kind and stops |
| `transcript.jsonl`, `media/`, `now.md` | `channel` and the receipt fold. Never opened here |
| `imports/` | the History Import Receipt writer. `home` creates and stats the directory, then stops |

Three inhabitants — home, chat, agent — answer the same three verbs:

```
ambient doctor      →  home.plan()
ambient init        →  home.converge()
ambient chat add x  →  home.chat('x').converge()
ambient agent add y →  home.agent('y').converge()
```

`plan()` is `converge()` minus the writes. There is **one** list of things that
must be true ([`internal/ensure.ts`](./internal/ensure.ts)) and two verbs over
it, so `init` cannot create a file `doctor` forgets to check.

## Invariants

1. **`openHome` does not validate.** Opening a home that does not exist must
   succeed or `init` cannot run; opening a broken one must succeed or `doctor`
   cannot run. Validation is `plan()`.
2. **`converge` converges.** It re-derives from disk every call and repairs what
   is missing — it does not skip-if-exists. It is recursive downward and invents
   no children.
3. **`converge` never overwrites authored content.** Destroying a broken
   `mandate.md` is worse than reporting it.
4. **Every whole-file write is temp-then-rename.** A file is old or new, never torn.
5. **`plan()` is ordered** by `at`, then tag, and de-duplicated — so `doctor`
   output is stable and diffable.
6. **`home.plan()` is strictly more than the union of unit plans.** It also runs
   the cross-unit reference checks ([`internal/refs.ts`](./internal/refs.ts))
   that no single unit can see.
7. **Names are a trust boundary.** `^[a-z0-9][a-z0-9-]{0,63}$`. No `Place` is
   ever produced for an illegal name: a grant — `chat.cwd()`, `.transcript()`,
   `.media()`, `.imports()`, `.now()`, `agent.cwd()` — is a method returning `Place |
   HomeProblem`, so the answer to *where is it* has somewhere to say `BadName`.
   Resolution stays total and `read()` keeps its one guard.
8. **`home` parses only files whose size is bounded by *configuration*, never by
   *traffic*.** The `Parsed` union in [`internal/disk.ts`](./internal/disk.ts) is
   the enforcement: `transcript.jsonl` cannot be named there.
9. **Nothing is cached.** `read()` always hits disk, so a hand-edited mandate is
   live on the next turn and there is no invalidation race to get wrong.
10. **No dependencies.** `home` spawns no process, reads no environment and takes
    no injected ports. It writes `knowledge/` from its own templates rather than
    calling OpenKnowledge's CLI.
11. **Nothing throws.** Every failure `home` can produce is a `ProblemDetail` in
    [`types.ts`](./types.ts) — the whole answer to *what can this fail with*, in
    one file. A bad slug, an unreadable directory and a write that will not land
    are all values, which is why an Effect `E` channel is already written.

## How to test it

[`home.test.ts`](./home.test.ts) is SKELETON's gate — the eighteen assertions of
[`docs/planning/skeleton/spec.md`](../../../docs/planning/skeleton/spec.md) §4,
one `it` each, plus the resolutions the interface promises.

```
vp test
```

Every assertion runs against a real temp directory (`fs.mkdtemp`), never an
in-memory stand-in: rename atomicity, symlink escapes and `EACCES` are what this
module exists to get right and what a stand-in models as fiction.

Assertions 16, 17 and 18 are lint tests over `src/` itself, because a rule that
cannot be run is not a rule
([legibility.md](../../../docs/rules/legibility.md)): `path.join` appears nowhere
outside this module, `internal/disk.ts` is the only file that opens a file, and no
source file outside a test contains the word `throw`. The repository's own shape
rules are checked separately, by `vp run shape`.

## Inside

| File | What it knows |
|---|---|
| `types.ts` | the interface: the values, the handles, the error vocabulary |
| `service.ts` | `openHome` and the three handles. Assembly only |
| `internal/disk.ts` | paths, names, the filesystem, the `Place` mint |
| `internal/ensure.ts` | the list of things that must be true, and both verbs |
| `internal/read.ts` | how a unit reads: globals, two files, parse, resolve |
| `internal/refs.ts` | the cross-unit reference checks |
| `internal/yaml.ts` | YAML → `unknown` → narrowed, one key at a time |
| `internal/config.ts` | the three config schemas |
| `internal/schema.ts` | `schema.yaml`, the ontology vocabulary |
| `internal/problem.ts` | how a problem is made, ordered and rendered |
| `internal/templates.ts` | what `init`, `chat add` and `agent add` write |
