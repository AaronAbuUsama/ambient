# Ambient

One entity, present in many conversations, with one accumulated understanding of the world.

## The stack

```
OpenKnowledge   knowledge substrate — storage, retrieval, attribution, conflicts,
                skills, templates, lint, versions, provenance rules
Pi              the agent loop — tools, context management, compaction, sessions
whatsappd       the channel — pairing, inbound accepted log, durable outbound

Ambient         the glue — sources, ingestion, loops, mandates, capabilities,
                the speaker, run receipts, jobs
```

**We build the fourth row.** The other three are dependencies, not forks: we depend on their
tool surfaces and never on their internals.

## Layout

```
AGENTS.md            the engineering contract. Read before writing any code.
CONTEXT.md           the lexicon — every domain noun, one meaning each

docs/README.md       the doc map: six directories, and which one a document goes in
docs/rules/          how we work — one rule per file, each with its check
docs/design/         what is true now
docs/adr/            what was decided, and what it beat
docs/planning/       one directory per slice — scope, spec, issues
docs/walkthroughs/   how to follow something end to end
docs/history/        how we got here. Defers to docs/design/.

src/main.ts          the composition root — environment, printing, exit code
src/modules/         the modules named in docs/design/seams.md

.agents/skills/      repo-owned skills, plus vendor/ — upstream, unedited
.claude/skills/      symlinks into .agents/skills/
```

Every module has the same six slots — `README.md`, `types.ts`, `service.ts`, `internal/`,
`<name>.test.ts`. **Read a module's `types.ts` first; it is the interface.**

## Start here

| You are | Read |
|---|---|
| new to the codebase | [docs/walkthroughs/doctor.md](docs/walkthroughs/doctor.md) — `ambient doctor` from keypress to exit, through every file it touches |
| about to build something | [docs/walkthroughs/slice.md](docs/walkthroughs/slice.md) — the five steps, what you type, and how to tell each went well |
| about to write code | [AGENTS.md](AGENTS.md), then the one rule you are working under |
| looking for a word | [CONTEXT.md](CONTEXT.md) |

## Where we are

**One place says which slice is active: [docs/design/roadmap.md](docs/design/roadmap.md).**
This file does not restate it, and that is deliberate — it claimed *"Active: Area 1 —
Skeleton, specified, not started"* for as long as it took two slices to close, because a
status written in two documents only stays true in one.

`vp run slice` answers the same question from the files themselves.

## What is true now

Pointers. The map that decides where a document belongs is
[docs/README.md](docs/README.md).

| Doc | What it is |
|---|---|
| [docs/design/thesis.md](docs/design/thesis.md) | What Ambient is, the category, the opinions. The front door. |
| [docs/design/product.md](docs/design/product.md) | The nouns and what each owns. **Settled / Open at the bottom is current truth.** |
| [docs/design/knowledge-flow.md](docs/design/knowledge-flow.md) | How knowledge gets built. Mechanical vs reasoning, media, the schema, `now`. |
| [docs/design/seams.md](docs/design/seams.md) | Every module, what it owns, and the dependency direction. |
| [docs/design/roadmap.md](docs/design/roadmap.md) | The slices, ordered, and the fresh-context handoff. |
| [docs/design/definition-of-done.md](docs/design/definition-of-done.md) | The ten rows a slice passes before it closes. |

## How we got here

| Doc | What it is |
|---|---|
| [docs/history/research/open-knowledge.md](docs/history/research/open-knowledge.md) | **Read before designing anything touching knowledge, skills or provenance.** Much of it is already solved there. |
| [docs/history/research/email-pa-teardown.md](docs/history/research/email-pa-teardown.md) | The ten patterns worth stealing, with code. **See its Amendments — §5 was measured and is wrong.** |
| [docs/history/research/ontology-design-space.md](docs/history/research/ontology-design-space.md) | **Read before designing the ontology.** The traditions, email-pa's graph counted, the seven-step flow, and the schema that follows. |
| [docs/history/research/a-schema-nothing-reads.md](docs/history/research/a-schema-nothing-reads.md) | The same material as prose — why the queue decides what a system knows. |
| [docs/history/kernel.md](docs/history/kernel.md) | Lessons from the two prior experiments. Defers to `docs/design/`. |
| [docs/history/grills/](docs/history/grills/) | Dated decision records. `002`'s harness proposal is superseded; its four decisions stand. |

---

**Shape before content.** Conventions are generated and validated by code before anything
writes into them.
