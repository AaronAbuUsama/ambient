# Ambient

Design repo. No code yet.

## Read in this order

| Doc | What it is |
|---|---|
| [thesis.md](thesis.md) | What Ambient is, the category, the opinions. The front door. |
| [product.md](product.md) | The nouns and what each owns. Settled / open at the bottom. |
| [knowledge-flow.md](knowledge-flow.md) | How knowledge gets built. Mechanical vs reasoning, media, the schema, `now`. |
| [roadmap.md](roadmap.md) | Where we are, what is next, and the fresh-context handoff. |
| [kernel.md](kernel.md) | Lessons from the two prior experiments. History only — the design lives in the docs above. |

## Evidence

| Doc | What it is |
|---|---|
| [research/open-knowledge.md](research/open-knowledge.md) | **Read before designing anything touching knowledge, skills or provenance.** A large amount is already solved there. |
| [research/email-pa-teardown.md](research/email-pa-teardown.md) | The ten patterns worth stealing, with code. |
| [grills/001-old-repo-teardown.md](grills/001-old-repo-teardown.md) | What went wrong in `whatsapp-agent-tui`, measured. |
| [grills/002-from-scratch-round-1.md](grills/002-from-scratch-round-1.md) | First design pass. Harness proposal superseded; the four decisions stand. |
| [grills/003-roadmap-order.md](grills/003-roadmap-order.md) | What the foundation is, and the order of the nine areas. |

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

[roadmap.md](roadmap.md) — gated sections, and the handoff for a fresh context.

Nine areas, ordered. **Active: Area 1 — Skeleton** (home layout, `ambient` CLI, config and
schema validation). Not started.

Shape before content: conventions are generated and validated by code before anything
writes into them. The ordering is grilled in
[grills/003](grills/003-roadmap-order.md).
