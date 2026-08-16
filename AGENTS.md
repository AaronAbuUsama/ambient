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
