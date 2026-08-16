# Ambient

Design repo.

**[AGENTS.md](AGENTS.md) is the engineering contract — read it before writing any code.**

## What is true now

| Doc | What it is |
|---|---|
| [docs/design/thesis.md](docs/design/thesis.md) | What Ambient is, the category, the opinions. The front door. |
| [docs/design/product.md](docs/design/product.md) | The nouns and what each owns. **Settled / Open at the bottom is the current truth.** |
| [docs/design/knowledge-flow.md](docs/design/knowledge-flow.md) | How knowledge gets built. Mechanical vs reasoning, media, the schema, `now`. |
| [docs/design/seams.md](docs/design/seams.md) | Every module, what it owns, and the dependency direction. |
| [docs/design/roadmap.md](docs/design/roadmap.md) | The nine areas, ordered, and the fresh-context handoff. |

## How we got here

| Doc | What it is |
|---|---|
| [docs/history/research/open-knowledge.md](docs/history/research/open-knowledge.md) | **Read before designing anything touching knowledge, skills or provenance.** Much of it is already solved there. |
| [docs/history/research/email-pa-teardown.md](docs/history/research/email-pa-teardown.md) | The ten patterns worth stealing, with code. |
| [docs/history/kernel.md](docs/history/kernel.md) | Lessons from the two prior experiments. Defers to `docs/design/`. |
| [docs/history/grills/](docs/history/grills/) | Dated decision records. `002`'s harness proposal is superseded; its four decisions stand. |

## Layout

```
AGENTS.md          the engineering contract
docs/design/       what is true now
docs/history/      how we got here — kernel, grills, research
docs/planning/     per-feature specs and issues
docs/agents/       skill docs — issue tracker, triage labels, domain
docs/adr/          decisions, created lazily
src/modules/       the modules from docs/design/seams.md
```

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

Nine areas, ordered — see [docs/design/roadmap.md](docs/design/roadmap.md).

**Active: Area 1 — Skeleton** (home layout, `ambient` CLI, config and schema validation).
Specified, not started. Both interfaces designed twice —
[ADR 001](docs/adr/001-home-interface.md) (`home`),
[ADR 002](docs/adr/002-work-interface.md) (`work`, provisional) — and the spec is at
[docs/planning/skeleton/spec.md](docs/planning/skeleton/spec.md).

Shape before content: conventions are generated and validated by code before anything
writes into them.
