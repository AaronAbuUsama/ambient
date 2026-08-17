# `cli`

`ambient` — argv in, one outcome out.

Read [`types.ts`](./types.ts) first. It is two types long, which is the point.

## What it owns

The mapping from a command line to a verb on a [`home`](../home/README.md), and
nothing else:

| Command line | What it calls |
|---|---|
| `ambient init` | `home.converge()` |
| `ambient doctor` | `home.plan()` |
| `ambient chat add <slug>` | `home.chat(slug).converge()` |
| `ambient agent add <name>` | `home.agent(name).converge()` |
| `ambient import <archive> --into <slug> [--zone <IANA>]` | `archive` → `transcript` → `blobs`, into a chat that already exists |
| `--home <path>` | overrides the root the caller supplied |

**`import` is the one row that does not read as a single verb on a handle, and that is a
known divergence, not a design.** Its handler orchestrates four modules where its siblings
call one, so `cli` is currently the composition owner for that path — see
[definition-of-done.md](../../../docs/design/definition-of-done.md) row 10 and
[import/spec.md](../../../docs/planning/import/spec.md). Resolving it means moving the
orchestration or amending the documented topology; leaving both standing is what row 10
exists to catch.

`service.ts` does the mapping. Each verb is one file under
[`internal/commands/`](./internal/commands), owning its own usage line — so
adding a command is a new file and one row in the map, not an edit to a growing
`switch`.

## Invariants

1. **No logic and no rendering.** Every string a human sees comes from
   `home.describe` or from the usage text. `cli` never formats a problem, never
   decides what is healthy, and never touches a path.
2. **No printing and no exiting.** `run` returns an `Outcome`;
   [`src/main.ts`](../../main.ts) — the composition root — turns it into output
   and an exit code. That is what makes the whole CLI testable in-process.
3. **No environment.** `run` takes `defaultRoot` as an argument. `src/main.ts`
   is the only file in the repository that reads `process.env`.
4. **Misuse is not ill health.** A wrong command line exits `2`. A home with
   problems exits `1`; a healthy one exits `0`. The two are never confusable,
   which is what lets `doctor` be used in a gate.

## How to test it

[`cli.test.ts`](./cli.test.ts) drives `run(argv, defaultRoot)` — the real
interface — against real temp directories, plus one end-to-end `spawnSync` of
`src/main.ts`, because exit codes are the vocabulary the gate is written in and
only a real process can prove them.

```
vp test
```

## Inside

| File | What it knows |
|---|---|
| `types.ts` | `Outcome` and the `run` signature |
| `service.ts` | argv → a command. Nothing else |
| `internal/command.ts` | what a command is, and the two ways one ends |
| `internal/commands/*.ts` | one handler each, with its own usage line |
