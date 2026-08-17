# Ambient

Design repo.

**[AGENTS.md](AGENTS.md) is the engineering contract — read it before writing any code.**

## What is true now

| Doc | What it is |
|---|---|
| [CONTEXT.md](CONTEXT.md) | **The lexicon — one word, one meaning.** Read it first. It defines nouns and decides nothing. |
| [docs/design/thesis.md](docs/design/thesis.md) | What Ambient is, the category, the opinions. The front door. |
| [docs/design/product.md](docs/design/product.md) | The nouns and what each owns. **Settled / Open at the bottom is the current truth.** |
| [docs/design/knowledge-flow.md](docs/design/knowledge-flow.md) | How knowledge gets built. Mechanical vs reasoning, media, the schema, `now`. |
| [docs/design/seams.md](docs/design/seams.md) | Every module, what it owns, and the dependency direction. |
| [docs/design/roadmap.md](docs/design/roadmap.md) | The nine slices, ordered, and the fresh-context handoff. |

## How we got here

| Doc | What it is |
|---|---|
| [docs/history/research/open-knowledge.md](docs/history/research/open-knowledge.md) | **Read before designing anything touching knowledge, skills or provenance.** Much of it is already solved there. |
| [docs/history/research/email-pa-teardown.md](docs/history/research/email-pa-teardown.md) | The ten patterns worth stealing, with code. **See its Amendments — §5 was measured and is wrong.** |
| [docs/history/research/ontology-design-space.md](docs/history/research/ontology-design-space.md) | **Read before designing the ontology.** The traditions (FOAF, DC, schema.org, SKOS, RDFS, OWL, SHACL), email-pa's graph counted, the seven-step flow, and the schema that follows. |
| [docs/history/research/a-schema-nothing-reads.md](docs/history/research/a-schema-nothing-reads.md) | The same material as prose — the theory, the argument, and why the queue decides what a system knows. |
| [docs/history/kernel.md](docs/history/kernel.md) | Lessons from the two prior experiments. Defers to `docs/design/`. |
| [docs/history/grills/](docs/history/grills/) | Dated decision records. `002`'s harness proposal is superseded; its four decisions stand. |

## Layout

```
AGENTS.md          the engineering contract
CONTEXT.md         the lexicon — every domain noun, one meaning each
docs/design/       what is true now
docs/history/      how we got here — kernel, grills, research
docs/planning/     per-slice scope, specs and issues
docs/rules/        one rule per file: the rule, its argument, its check
docs/adr/          decisions, created lazily
.agents/skills/    repo-owned skills, plus vendor/ — upstream, unedited
.claude/skills/    symlinks into .agents/skills/
src/main.ts        the composition root — environment, printing, exit code
src/modules/       the modules from docs/design/seams.md
```

Every module has the same six slots — `README.md`, `types.ts`, `service.ts`,
`internal/`, `<name>.test.ts` — described in [AGENTS.md](AGENTS.md). Read a module's
`types.ts` first; it is the interface.

**New here?** [docs/walkthrough-doctor.md](docs/walkthrough-doctor.md) traces
`ambient doctor` from keypress to output through every file it touches. It is the
shortest path to owning this codebase.
[docs/walkthrough-import.md](docs/walkthrough-import.md) does the same for `ambient import`,
across six modules. **Building something?**
[docs/walkthrough-slice.md](docs/walkthrough-slice.md) is how a slice runs, end to end.

## The stack

```
OpenKnowledge   knowledge substrate — storage, retrieval, attribution, conflicts,
                skills, templates, lint, versions, provenance rules
Pi              the agent loop — tools, context management, compaction, sessions
whatsappd       the channel — pairing, inbound accepted log, durable outbound

Ambient         the glue — sources, ingestion, loops, mandates, capabilities,
                the speaker, run receipts, jobs
```

We build the fourth row.

## Where we are

**Which slice is active lives in one place — [docs/design/roadmap.md](docs/design/roadmap.md).**
This file does not restate it. It said *"Active: Area 1 — Skeleton, specified, not started"*
for as long as it took two slices to close, because a status written in two documents only
stays true in one.

How a slice is built, step by step, is [docs/rules/slices.md](docs/rules/slices.md).

Shape before content: conventions are generated and validated by code before anything
writes into them.
