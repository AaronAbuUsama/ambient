# Ambient

Design repo. No code yet.

## Read in this order

| Doc | What it is |
|---|---|
| [thesis.md](thesis.md) | What Ambient is, the category, the opinions. The front door. |
| [product.md](product.md) | The nouns and what each owns. Settled / open at the bottom. |
| [knowledge-flow.md](knowledge-flow.md) | How knowledge gets built. Mechanical vs reasoning, media, the schema, `now`. |
| [kernel.md](kernel.md) | Lessons from the two prior experiments, and the mechanics that follow. |

## Evidence

| Doc | What it is |
|---|---|
| [research/open-knowledge.md](research/open-knowledge.md) | **Read before designing anything touching knowledge, skills or provenance.** A large amount is already solved there. |
| [research/email-pa-teardown.md](research/email-pa-teardown.md) | The ten patterns worth stealing, with code. |
| [grills/001-old-repo-teardown.md](grills/001-old-repo-teardown.md) | What went wrong in `whatsapp-agent-tui`, measured. |
| [grills/002-from-scratch-round-1.md](grills/002-from-scratch-round-1.md) | First design pass. Harness proposal superseded; the four decisions stand. |

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

## Next

The roadmap: gated sections — plan, build, review, then plan the next. Not written yet.
