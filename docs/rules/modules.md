# The module shape

## The rule

Every module is a directory under `src/modules/<name>/` with all six slots — the
directory itself, plus:

```
README.md        what it owns · its invariants · how to test it. one page.
types.ts         THE interface — types plus the entry signature. Read this first.
service.ts       the entry point's implementation.
internal/        everything only this module knows.
<name>.test.ts   tests, through the interface only.
```

`src/main.ts` is the composition root and sits **outside** the modules. It is the only
file that reads `process.env`, calls `process.exit`, prints, or takes `process.argv`.
Modules return values; `main.ts` turns them into exit codes and output. One per
executable.

No slot is optional and no module is an exception, the CLI included: `cli/service.ts`
maps argv to a command and does nothing else, and each handler is a file under
`internal/commands/`.

Do not export a symbol only for testing — test through the real interface. Do not
create a directory before there is behaviour in it.

## Why

**One way to organise the whole codebase, learned once.** A reader who knows one module
can navigate every module, and an agent can find the interface without being told where
it is.

**`types.ts` is the module.** If you cannot understand what a module does by reading its
`types.ts` alone, the module is the wrong shape. `internal/` is what makes the seam
physical rather than social — see [imports.md](./imports.md) for the rule that keeps it
private.

**Grouping by what a file *is* — a `types/`, a `services/`, a `handlers/` folder — was
considered and rejected.** It dissolves the module boundary across four folders, and the
boundary is the entire point. A `handlers/` directory tells you what a file is, which
you can already see; it hides what the file belongs to, which is what you needed.

**The shape exists to force depth.** Use the `codebase-design` skill's vocabulary
exactly — *module, interface, implementation, depth, seam, adapter, leverage,
locality*. Not "component", "service", "API", "boundary". Depth is **leverage at the
interface**: behaviour a caller gets per unit of interface it must learn. Not a
line-count ratio. Three tests, applied before adding anything:

- **The deletion test.** Imagine deleting the module. If complexity vanishes, it was a
  pass-through. If complexity reappears across N callers, it earns its keep.
- **The interface is the test surface.** If you want to test *past* the interface, the
  module is the wrong shape.
- **One adapter is a hypothetical seam; two adapters is a real one.** Do not introduce a
  seam unless something actually varies across it.

**The measured failure this replaces.** The previous attempt's `src/home/` was 1038
lines: nine files exposing eleven functions and twelve interfaces, all over file
reading. Large interface, thin implementation — shallow, and every caller had to learn
the layout. The current `home` answers three verbs on three handles. Do not repeat the
old shape.

**One durable transition has one authoritative mutation path.** Two ways to write the
same state is how `init` and `doctor` drift apart; `plan()` and `converge()` are one
list precisely so they cannot.

## The check

`vp run shape` — asserts all six slots exist for every module under `src/modules/`, and
names the missing ones.

That `main.ts` is the only file reading the environment, and that a module's work is a
named top-level function rather than a nested closure, are **not currently checked**.
