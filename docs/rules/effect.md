# Write it as if it were Effect

## The rule

We are **not** using Effect yet. It lands at the work layer — triggers, cadences, the
lease, jobs, interruption — and nowhere else. Until then, four rules keep adoption a
change at one seam rather than a rewrite:

1. **Services are interfaces. Dependencies are injected, never constructed inside.** No
   `new WhatsAppClient()` in a function body.
2. **One composition root** wires everything. Nothing else reads env, config, or
   resolves wiring. A module that needs something takes it as a parameter.
3. **No ambient globals, no hidden I/O.** If a module touches the world, that fact is in
   its interface.
4. **Effects at the edges, pure transformations in the middle.**

The fifth rule — errors are values, never thrown for control flow — is
[errors.md](./errors.md).

Where Effect goes, and where it does not:

| Layer | Effect |
|---|---|
| CLI, home, config, validation | **no** — `Effect.gen` to read a YAML file is tax |
| channel, blobs, knowledge | no |
| media processing | later, maybe — concurrency and rate limits are real there |
| **work: triggers, cadences, lease, jobs, interruption** | **yes — this is what it is for** |

## Why

**The old repo hand-rolled the work layer four times: 1722 lines across
`conversation-work.ts`, `memory-work.ts`, `tasks.ts` and `evaluation-work.ts`** — the
same shape four times, with semantics that drifted apart until no two of them retried,
leased or timed out alike. That is the duplication Effect exists to prevent, and it is
the only place in this system where the problem is hard enough to be worth its cost.

**Everywhere else it is tax.** Wrapping a YAML read in `Effect.gen` buys nothing a
`Checked<T>` return does not, and it costs every reader the runtime's vocabulary before
they can follow a config parse.

**Adoption is priced by the four rules, not by Effect itself.** A function that takes
its dependencies, returns its failures and does its I/O at the edge is already an
`Effect` in everything but syntax. A function that constructs a client, throws, and
reads `process.env` has to be rewritten before it can be lifted.

## The check

**Not currently checked.** `vp check` catches none of this, and the composition root
being the only wiring site is enforced by review. The nearest running check is `vp test`
gate assertion 16 — `path.join`, `path.resolve` and `__dirname` appear nowhere under
`src/` outside `src/modules/home/` — which enforces one module's hidden-I/O boundary but
generalises to none of the others.
