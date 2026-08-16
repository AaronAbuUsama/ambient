# Engineering contract

Enforced on every session in this repo. Short on purpose.

Read [README.md](README.md) for the map. `product.md` and `knowledge-flow.md` are the
current truth; `kernel.md` is history and defers to them.

---

## Write it as if it were Effect

We are **not** using Effect yet. It will land at the loop and job layer and nowhere else
(see *Where Effect goes*). Everything is written so that adopting it is a change at one
seam rather than a rewrite. Five rules, all checkable:

1. **Errors are values, never thrown for control flow.** Return a tagged union or a
   `Result<T, E>`. `openHome(path): Home | HomeProblem` is the shape. Throwing is reserved
   for genuine invariant violations — bugs, not conditions.
2. **Services are interfaces. Dependencies are injected, never constructed inside.**
   No `new WhatsAppClient()` in a function body.
3. **One composition root** wires everything. Nothing else reads env, config, or resolves
   wiring. A module that needs something takes it as a parameter.
4. **No ambient globals, no hidden I/O.** If a module touches the world, that fact is in
   its interface.
5. **Effects at the edges, pure transformations in the middle.**

## Where Effect goes

| Layer | Effect |
|---|---|
| CLI, home, config, validation | **no** — `Effect.gen` to read a YAML file is tax |
| channel, blobs, knowledge | no |
| media processing | later, maybe — concurrency and rate limits are real there |
| **work: triggers, cadences, lease, jobs, interruption** | **yes — this is what it is for** |

The old repo hand-rolled this layer four times: 1722 lines across `conversation-work.ts`,
`memory-work.ts`, `tasks.ts`, `evaluation-work.ts`, same shape, drifted semantics. That is
the drift Effect exists to prevent.

## Deep modules

Use the `codebase-design` skill's vocabulary exactly — **module, interface, implementation,
depth, seam, adapter, leverage, locality**. Not "component", "service", "API", "boundary".

Three tests, applied before adding anything:

- **The deletion test.** Imagine deleting the module. If complexity vanishes, it was a
  pass-through. If complexity reappears across N callers, it earns its keep.
- **The interface is the test surface.** If you want to test *past* the interface, the
  module is the wrong shape.
- **One adapter is a hypothetical seam; two adapters is a real one.** Do not introduce a
  seam unless something actually varies across it.

Depth is **leverage at the interface** — behaviour a caller gets per unit of interface they
must learn. Not a line-count ratio.

**Warning from the last attempt:** `src/home/` was nine files exposing eleven functions and
twelve interfaces over file reading. Large interface, thin implementation — shallow. Every
caller learned the layout. Do not repeat that shape.

## The module shape — every module, no exceptions

One way to organise the whole codebase, the CLI included. Six slots. You learn it once and
then every module navigates the same.

```
src/modules/<name>/
  README.md        what it owns · its invariants · how to test it. one page.
  types.ts         THE interface — types plus the entry signature. Read this first.
  service.ts       the entry point's implementation.
  internal/        everything only this module knows.
  <name>.test.ts   tests, through the interface only.
```

- **`types.ts` is the module.** If you cannot understand what a module does by reading its
  `types.ts` alone, the module is the wrong shape.
- **`internal/` makes the seam physical.** `types.ts` is what callers know; `internal/` is
  what only this module knows. **No module imports from another module's `internal/`.**
- **The CLI is a module.** `service.ts` maps argv to a command and does nothing else;
  `internal/commands/*.ts` hold the handlers. No exception for being "just wiring".
- Grouping by what a file *is* — a `types/`, a `services/`, a `handlers/` folder — was
  considered and rejected: it dissolves the module boundary across four folders, and the
  boundary is the entire point.

**Legibility is part of done.** These are checkable, and `doctor` checks them:

- No source file over ~250 lines.
- No top-level implementation nested inside a closure. If a function is the module's work,
  it is a named top-level function in a file, not a nested arrow inside the entry point.
- Every module has all six slots.

## OpenKnowledge — vendored, not depended on

**We match OpenKnowledge's format. We never call its CLI.**

`ok init` does four things and we want one of them: it writes `.ok/config.yml`, and it also
creates a nested `.git`, editor wiring under `.claude` / `.codex` / `.cursor` / `.github` /
`.opencode` / `.pi`, and housekeeping files. Verified by running it.

`.ok/config.yml` is entirely comments — every key is a default. So **we write those files
from our own templates.** The result opens in the OpenKnowledge app because the format
matches, and it costs us no CLI dependency, no nested repository and no editor pollution.

The knowledge base's *layout* is the thing worth taking from OpenKnowledge. Its tooling is
not. A UI of our own replaces the app later; the format survives that.

## Discipline

- No `any`. External data is `unknown`, narrowed at the boundary.
- Discriminated unions over boolean flags and optional-field state machines.
- One durable transition has **one** authoritative mutation path.
- Do not export a symbol only for testing. Test through the real interface.
- Create a directory only when there is behaviour. No scaffolding for later.
- Conventions are generated and validated by the CLI, never folklore. If `doctor` cannot
  check it, it is not a convention.
- Every line of apologetic prompt prose is a missing check. Write the check.

## Decided — do not re-litigate

- **`cwd` is the chat's own folder.** That scopes its skills and its writes. No conflict
  with one shared knowledge base, because OpenKnowledge is addressed over MCP, not by path.
- **The knowledge base and the chat folders are separate trees.** A chat folder is a
  runtime instance directory, not knowledge; it sits outside the OK content dir.
- **No separate graph store.** Entities are OK documents with typed frontmatter. The
  ontology tool is a validator, a queue and an indexer — never a CRUD layer, because
  OpenKnowledge already is one.
- **Shape before content.** Conventions exist in code before anything writes into them.
- **Operate it by hand until it is good, then automate.** Pi comes last, not first.

---

## Agent skills

### Issue tracker

Local markdown — specs and issues live under `docs/planning/<feature>/`. There is no git
remote; never reach for `gh` or `glab`. See [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md).

### Triage labels

The five canonical roles, unchanged, written as a `Status:` line in each issue file. See
[docs/agents/triage-labels.md](docs/agents/triage-labels.md).

### Domain docs

Single-context — `CONTEXT.md` at the root, `docs/adr/` for decisions, both created lazily.
See [docs/agents/domain.md](docs/agents/domain.md).
