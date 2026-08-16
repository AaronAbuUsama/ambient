# Ambient — the kernel

The document to read first. Written 2026-08-16, after reading the old
`whatsapp-agent-tui` repo end to end and `~/email-pa` end to end.

Self-contained on purpose: someone opening this cold, in a fresh context, should be able
to start. Everything else in this folder is evidence for what is asserted here.

---

## What Ambient is

One entity with one accumulated understanding of the world, present across many
conversations — WhatsApp chats today, one or more email accounts too — that builds its
knowledge from what arrives and eventually speaks for itself.

The knowledge is markdown files in folders. You can open it in Obsidian. You can `git log`
it. You can read any page and know what Ambient knows and how sure it is.

---

## Two experiments, one framework

Ambient is an idea Aaron has been circling for months and has attempted several times.
This is not a hack: the goal is a product he uses himself and that other people can use.
Both prior attempts are **experiments to learn from, not codebases to merge.**

**`~/email-pa`** — the ingestion end. Reads mail, builds a knowledge base, writes prose.
Three units (tradeoasis, bernoullis, lavin), one per business.

Two things about it that are constraints of that engagement, **not design principles**:

- It is **read-only because the mailboxes are not his.** It was real IRL work for a
  company he works for — understanding what the business does — and he was authorized to
  *draft* only, with the principal approving every send. The small problem space was
  handed to him, not chosen.
- The **per-unit isolation exists because those are legally distinct companies.** Nothing
  happens to those units. They are not migrating anywhere.

It is also **Python**. Every useful idea in it gets ported to TypeScript; none of the code
does.

What it proved, and what carries: 653 mail files → 92 wiki pages, 24 orgs, 6 people, 42
weekly digests, a 1903-line graph — grown from a mailbox, readable by a human, in files.

**`whatsapp-agent-tui`** — the speaking end. Durable queues, leases, agent kinds, a
bespoke context builder, an EAV memory graph. 15.2k lines. It spoke, and what it said was
embarrassing.

### The history that matters

**Pi was the LAST thing added to email-pa.** Almost all of it was built with Claude Code
as the harness — a human driving an agent that ran the skills by hand. The skills were
proven by being *operated* before anything automated them. `harness/run.ts` came at the
end, to run on a schedule what already worked in a terminal.

That is the development method, not an accident of history:

> **Operate it by hand until it's good. Then automate the loop that does it.**

### Why email-pa worked and the WhatsApp repo didn't

**Because the knowledge was built before anything spoke.**

No speaking meant no leases, no queues, no send-guards, no idempotency keys, no harness
integration, no destination binding — all of it downstream of the mouth. That left room to
iterate on the thing that matters, and it got good.

The WhatsApp repo did the reverse: built the speaking machinery first, and the knowledge
arrived as an afterthought bolted on as an EAV graph queried by `LIKE '%q%'`.

**This is a sequencing lesson, not a permanent constraint.** Ambient has a mouth. The
order of construction is: ingest → prove the knowledge → speak.

### The actual build order that worked, verbatim

1. Patch together tools that ingest and process the source.
   **Ambient already has this**: `whatsappd` is working and logged in.
2. Build the knowledge base out of what they produce.
   (Should have started from OpenKnowledge templates and didn't — start there this time.)
3. **Claude Code + Aaron operating it manually IS the harness.** Run the skills by hand
   until they are good.
4. Encode what was learned as skills; automate with Pi.

Pi was the *last* step, not the first.

---

## The kernel

### 1. Many loops, stacked — not two

**Every loop is part of the same agentic system. From the outside, none of them are
visible.** A person in a chat sees one entity. They never see a second agent speaking, a
background pass running, or a job finishing. Internal decomposition, external unity — that
is the whole point of stacking them.

Not `daily` + `weekly`. A loop per trigger, at whatever cadence and depth that trigger
deserves, layered on top of each other:

| Trigger | Depth | What it does |
|---|---|---|
| a WhatsApp message arrives | shallow, fast | decide whether to reply; reply |
| an email arrives | shallow | classify, extract, file |
| a document/image lands | medium, async | annotate it, put it in the graph |
| daily | medium | age open items, harvest facts, regenerate index/now |
| weekly | max | narrative, episodes, push understanding outward |
| a long job (code, research) | async, unbounded | runs off the conversation thread entirely |

Loops do not block each other. The conversation thread must never wait on a loop that
isn't the reply.

### 2. Pi owns the agent loop. We own triggers, tools, and files.

`@oh-my-pi/pi-coding-agent` already ships Read / Write / Edit / Bash / Glob / Grep,
sessions, skills, a model registry, and — critically — **context-window management and
compaction**. email-pa's entire runtime is ~250 lines that pick a model, set `cwd`, append
one system line, and call `session.prompt()`.

The old repo hand-built a worse version: its own loop, its own eight tool definitions, its
own context builder, its own token budgeter. That is what "we went too hard on it" means.
The clever context management *caused* the engineering problem it was meant to solve —
over-engineered in some places, under-engineered in others.

**Give Pi a full loop. Solve context and compaction at the Pi level, inside the harness —
not by hand-assembling what goes into the model.**

### 3. `cwd` is the isolation

```ts
const { session } = await createAgentSession({
  cwd,                    // every path in every script resolves relative to here
  agentDir: AGENT_DIR,
  enableMCP: false,
  modelPattern: `${provider}/${model}`,
  thinkingLevel: thinking,
  appendSystemPrompt: "...never read or write outside this directory...",
});
await session.prompt(prompt, { userInitiated: false });
```

That replaces most of what the old repo's `resources.ts` (475 lines) did with grants,
guards, scoped senders and destination binding.

### 4. The graph holds facts; the wiki holds judgement

Verbatim from `tradeoasis/AGENTS.md`, and it is the single sentence the old repo violated.

- **Graph** — `memory/ontology/graph.jsonl`, append-only. Things with *values*: a price, a
  document, a ref, a date, a status. Trade Oasis: 1353 Prices, 487 Documents, 24 Orgs, 5
  People. The schema is `schema.yaml`, **hand-written**, closed — 7 types, 7 relations,
  `required`, `forbidden_properties: [password, secret, token]`. The model picks from the
  vocabulary; it cannot invent one.
- **Wiki** — prose. Judgement, uncertainty, what to watch out for.

The old repo put judgement *into* the graph as model-invented predicates with sentence
payloads, and grew `shipping_container_details` and `person_shipping_work` in one
afternoon.

### 5. Generated regions inside authored pages

One file, two authors. The agent writes the prose; a script regenerates the blocks.

```markdown
**Bottom line.** A UK domestic pulse supplier in Hull and by some distance our most
frequent correspondent — the relationship is a standing weekly price feed...

<!-- DOCS -->
> Generated by `bin/wiki links` from the graph. Do not edit.
<!-- /DOCS -->

<!-- EPISODES -->
- **2026-08-10** — yellow split peas held at GBP 620/MT after the 5 August cut...
<!-- /EPISODES -->
```

Neither author can rot the other. This is what makes markdown memory scale past toy size.

### 6. `index.md` is retrieval

No embeddings, no FTS, no traversal. One generated line per page, and every line is
**judgement**, drawn from that page's `summary:` frontmatter:

> - [Golden Tropical Ltd](orgs/golden-tropical.md): Bolton company whose MSC telex
>   paperwork and legal letters are produced from Trade Oasis's own mailbox. Director
>   signs with Reji Malik's WhatsApp number.

One read tells the agent which of 92 pages to open. Ceiling: index size — roughly low
thousands of pages before it needs sharding.

### 7. `[assumed]` is the anti-fabrication mechanism

Inline epistemic markers in the prose — `[assumed — worth confirming with Stephen]`,
`[confirmed 2026-08]` — and `bin/wiki now` counts them and surfaces them:

> ## Open questions
> Things marked `[assumed]` that a person could settle in a sentence:
> - **Serbia → UK (road)** — 2 — [open](./routes/serbia-uk-road.md)

A convention plus a counter. The old repo's answer to the same problem was a paragraph of
apology written into the prompt.

### 8. The fold is generated, not stored

`now.md` — fully generated, never edited, rebuilt every pass. Needs attention / Open items
/ Coverage / Open questions. Everything on it is derived, so it cannot go stale and it
cannot lie.

**The typed fold does not need a database. It needs a generator.**

### 9. Async is async

A job that is truly asynchronous should be asynchronous, and must not block the
conversation.

Honest correction from the old repo: **the worker machinery was overused.** Filing a
GitHub issue should have been a tool the agent calls directly. The Worker/assignment/
receipt apparatus was built for a *future* case (run some code, do some research) that
hadn't arrived. The principle is right; the machinery was premature.

---

### 10. The Root reprograms the system by writing files

Fundamental, even if it is not built on day one — the architecture must be shaped for it
from the start. The Root can:

- create a new chat
- write and rewrite that chat's mandate
- give that chat its own skills
- extend it with tools

All of that is **file writes into the home**, which is a git repo. Every Root action is a
commit; undo is `git revert`. That is what "program the chat on the fly" means concretely,
and it is why the home has to be files before it is anything else.

---

## Settled

- **One knowledge base.** One wiki, one graph, shared across every chat and mailbox.
  Everything that enters goes into the same understanding. No partitioning.
- **v1 speaks.** v0.1 may not. The mouth is not deferred indefinitely — the build order is
  ingest → prove → speak.
- **v1 is the whole extendable architecture.** "I load up my WhatsApp; I load up one or
  more emails and it ingests those too." Email is **in for v1, out for v0.1** — Aaron
  barely uses email himself, but the architecture must not have to change to accept it.
- **TypeScript, everywhere.** email-pa's Python `bin/` and JSONL ontology get ported as
  ideas, not code.
- **Pi gets a full agent loop**, including context management and compaction. We do not
  hand-assemble what goes into the model.
- **Files are the substrate.** Markdown + frontmatter + `[[wikilinks]]`, an OpenKnowledge
  project from the start, a git repo.
- **Each chat has its own folder you can run from, with its own skills.** This part of the
  old repo worked and survives.
- **Operate by hand first, automate second.**
- **Closed, hand-written ontology schema.** The model fills it; it never extends it.
- **Nothing merges from email-pa.** Learnings only.
- **Layers and services, Effect-like** — even if Effect itself is not used. The system
  must be grokkable by a reader.

## Open

1. **Latency and the reply path.** A Pi session that searches before replying could take
   20–45s, which is not acceptable in a chat. And the thread must never block on async
   work. Candidate shape: a bounded known-paths read that answers most turns without
   searching, plus a preamble when it genuinely has to go look.
2. **Where Effect's boundary sits** — all of it, the supervision layer only, or none.
3. **How the speaker writes back to shared knowledge safely.** Pulling context in is easy;
   letting a live, time-pressured agent write the shared wiki is where corruption comes
   from.
4. **The trigger list at v0.1**, and whether a loop may fire another loop.

### Parked, not forgotten

**Disclosure.** Storage is settled (one base, no partitions), but *speech* is not: the
bug-reports group should still never hear about a container at Felixstowe. This becomes
real the day the mouth arrives, not before.

## Evidence

- `grills/001-old-repo-teardown.md` — what went wrong, measured
- `grills/002-from-scratch-round-1.md` — first design pass; harness proposal superseded
- `research/email-pa-teardown.md` — the ten patterns, with code
