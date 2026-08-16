# The lessons

What the two prior experiments taught, and nothing else.

**This document owns history and lessons only.** The design they led to lives in
[product.md](product.md) and [knowledge-flow.md](knowledge-flow.md); what the knowledge
substrate already gives us is [research/open-knowledge.md](research/open-knowledge.md).
When those disagree with this, those win — this is the record of how we got here, not the
plan.

---

## Two experiments, neither a codebase to merge

Ambient is an idea Aaron has been circling for months and has attempted several times. The
goal is a product he uses himself and that other people can run. Both prior attempts are
**experiments to learn from.**

**`~/email-pa`** — the ingestion end. Reads mail, builds a knowledge base, writes prose.
Three units (tradeoasis, bernoullis, lavin), one per business.

Two things about it are constraints of that engagement, **not design principles**:

- It is **read-only because the mailboxes are not his.** Real work for a company he works
  for; he was authorized to *draft* only, with the principal approving every send.
- The **per-unit isolation exists because those are legally distinct companies.** Nothing
  happens to those units; they are not migrating anywhere.

It is also **Python**. Ideas port; code does not.

What it proved: 653 mail files → 92 pages, 24 orgs, 42 weekly digests — grown from a
mailbox, readable by a human, in files.

**`whatsapp-agent-tui`** — the speaking end. Durable queues, leases, four agent kinds, a
bespoke context builder, an EAV memory graph. 15.2k lines. It spoke, and what it said was
embarrassing. Measured in [grills/001](grills/001-old-repo-teardown.md).

---

## The history that matters

**Pi was the LAST thing added to email-pa.** Almost all of it was built with Claude Code as
the harness — a human driving an agent that ran the skills by hand. The skills were proven
by being *operated* before anything automated them. `harness/run.ts` came at the end, to
run on a schedule what already worked in a terminal.

That is the development method:

> **Operate it by hand until it's good. Then automate the loop that does it.**

## Why email-pa worked and the WhatsApp repo didn't

**Because it had exactly one thing to focus on.** Not because it lacked a mouth — that
framing was wrong and is retired. Nothing competed with getting the knowledge right.

The WhatsApp repo did the reverse: built the speaking machinery first, and the knowledge
arrived as an afterthought bolted on as an EAV graph queried by `LIKE '%q%'`.

**A sequencing lesson, not a permanent constraint.** Ambient has a mouth. The order of
construction is: ingest → prove the knowledge → speak.

## The build order that worked, verbatim

1. Patch together tools that ingest and process the source.
   **Step one already exists** — `whatsappd` is working and paired.
2. Build the knowledge base out of what they produce.
   *(Should have started from OpenKnowledge and didn't — start there this time.)*
3. **Claude Code + Aaron operating it manually IS the harness.** Run the skills by hand
   until they are good.
4. Encode what was learned as skills; automate with Pi.

Pi was the *last* step, not the first.

---

## The lessons themselves

### 1. Give Pi a full agent loop

`@oh-my-pi/pi-coding-agent` ships Read/Write/Edit/Bash/Glob/Grep, sessions, skills, a model
registry, and — critically — **context management and compaction**. email-pa's entire
runtime is ~250 lines that pick a model, set `cwd`, append one system line, and call
`session.prompt()`.

The old repo hand-built a worse version: its own loop, its own eight tool definitions, its
own context builder, its own token budgeter. The clever context management *caused* the
engineering problem it was meant to solve.

**Never hand-assemble what goes into the model.** Solve context and compaction at the Pi
level.

### 2. Isolation comes from somewhere; pick it deliberately

email-pa used `cwd` as a hard wall — every script and the graph resolve relative to the
unit, so one business physically cannot read another. That worked because units *must not*
bleed.

**Ambient's requirement is the opposite: one shared knowledge base.** So `cwd` cannot be
the isolation here, and the guard has to sit elsewhere — a send tool pre-bound to its chat,
so the model never names a destination. That was the one thing the old repo's
`resources.ts` got right.

The lesson is not "use cwd". It is: *know which thing is your wall, and don't assume the
previous project's wall is yours.*

### 3. Facts and judgement are different, and the split is not free

email-pa: *"The graph holds facts; the wiki holds judgement."* The old repo violated it —
judgement went *into* the graph as model-invented predicates with sentence payloads, and it
grew `shipping_container_details` and `person_shipping_work` in one afternoon.

But the split as email-pa drew it does not transfer. Counted properly, its graph holds
1353 Prices and 206 Documents against **4 Person entities — while its wiki holds 6 people
pages.** It excelled at PDF extractions and undercounted humans.

So: the *ontology* — a closed type vocabulary, hand-written, that the model fills and never
extends — carries over. A *separate graph store* does not. Resolved in
[knowledge-flow.md](knowledge-flow.md).

### 4. Generated regions inside authored pages

One file, two authors — the agent writes prose, a script regenerates a marked block:

```markdown
**Bottom line.** A UK domestic pulse supplier in Hull...

<!-- EPISODES -->
- **2026-08-10** — yellow split peas held at GBP 620/MT after the 5 August cut...
<!-- /EPISODES -->
```

Neither author can rot the other. This is what makes markdown memory scale past toy size,
and it is one of the few email-pa patterns OpenKnowledge does **not** hand us for free.

### 5. `[assumed]` — uncertainty as a marker plus a counter

Inline in prose: `[assumed — worth confirming with Stephen]`, `[confirmed 2026-08]`. Then a
generated page counts them and surfaces *"Open questions: things a person could settle in a
sentence."*

A convention plus a counter. The old repo's answer to the same problem was a paragraph of
apology written into the prompt.

**The general rule: every line of apologetic prompt prose is a missing check.**

### 6. Derived pages cannot lie

email-pa's `now.md` is fully generated and never edited — so it cannot go stale and cannot
fabricate. The old repo's free-text "private thought" is where the invented issue numbers
came from.

The synthesis is in [knowledge-flow.md](knowledge-flow.md): typed receipts,
deterministically folded. Judgement from the agent, assembly from the machine.

### 7. Leasing and queuing are irreducible; four copies are not

The old repo had four independent implementations — 1722 lines across
`conversation-work.ts`, `memory-work.ts`, `tasks.ts`, `evaluation-work.ts` — same shape,
drifted semantics. Concept: necessary. Copies: not.

### 8. Async is async, and workers were overused

Filing a GitHub issue should have been a direct tool call. The Worker/assignment/receipt
apparatus was built for a *future* case that hadn't arrived. The principle is right — a
long job must never block a conversation — but the machinery was premature.

### 9. Evaluate offline, never in the live path

The old repo ran a judge inside every conversation run: 136 judge calls, 916 results, **no
production reader**, roughly half of all inference spend. A judge in the hot loop cannot
gate anything, because the reply already went out.

---

## Evidence

- [grills/001](grills/001-old-repo-teardown.md) — what went wrong, measured
- [grills/002](grills/002-from-scratch-round-1.md) — first design pass; the harness
  proposal is superseded, the four decisions stand
- [research/email-pa-teardown.md](research/email-pa-teardown.md) — the patterns, with code
- [research/open-knowledge.md](research/open-knowledge.md) — the substrate
