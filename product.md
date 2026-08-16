# Ambient — the product model

The nouns, and what each one owns. Read before `kernel.md` (which is lessons and
mechanics). Nothing here is about libraries, services, or code.

Status: aligning. Sections marked **[open]** are not yet settled.

---

## Ambient is one entity

One identity. One voice. One accumulated understanding of the world.

It is present in many conversations and behaves differently in each — but it is never a
different entity in each. A person in one chat and a person in another are talking to the
same thing.

**Ambient is not Aaron.** It works with him and knows what he knows, but it is its own
entity with its own number and its own presence. It never speaks as him.

---

## The nouns

### Source

Somewhere knowledge arrives from. A WhatsApp account. An email account. Later, others.

Every source has a **mode**:

| Mode | Meaning |
|---|---|
| `ingest` | read continuously, build knowledge, **never speak** |
| `speak` | read and speak |

Settled:

- **Aaron's personal WhatsApp is `ingest`.** Ongoing, not a one-time import — it keeps
  receiving messages and keeps feeding the knowledge base forever.
- **Ambient's own WhatsApp is `speak`.** Fed by the same knowledge base.
- **Ambient never acts on Aaron's number.**
- Aaron's email, later, is another `ingest` source.

Two distinct operations, both real — don't collapse them, and don't call everything
"backfill":

- **History import** — a one-time pass over what already exists in a source. This is what
  makes a fresh install useful on day one.
- **Continuous ingestion** — the ongoing feed. Never stops.

Every source has an **ingestion policy**: an **allowlist** of conversations that are in
scope. Opt-in, chat by chat. Nothing is ingested by default — not everything in a personal
account belongs in a work knowledge base.

A source stamps **provenance** on everything it produces. Not optional: see *The cold
start problem* below.

### The principal

**Aaron.** One privileged human Ambient works for. Everyone else in any conversation is a
third party.

email-pa already has this shape and it is the analogy that makes the whole thing legible:
the agent reads the principal's mail; the agent is not the principal. Ambient is the same,
one step further along — it also has a line of its own.

### Chat

One conversation Ambient is present in. It has a folder, and the folder is the whole
grant.

Same entity, same personality, **different behaviour**. A bug-reports group, an internal
PA thread, an outreach conversation with a customer, and a thread with HMRC are four
different jobs done by one entity. The folder is where that difference lives.

### Mandate — two halves

The real split, and the thing `chat.md` was fumbling:

**Machine-readable configuration.** Which tools this speaker has and at what scope, which
MCPs, which background agents it may hand off to. Structured enough that the Root can
write it; legible enough that a non-engineer can read it and change it by hand.

**Prose.** What this chat is for, who is here, how to behave.

Both are **hot-reloaded**. Adding a capability — a tool, an MCP, a background agent —
never requires a daemon restart. That is what makes "give it more to do" cheap enough to
actually happen, for Aaron and for anyone else running their own.

### Background agent

The speaker never runs a long job itself. It **hands off**.

A background agent is a configured thing — an MCP, a skill, a scope — creatable at runtime
by the Root or by the user. Examples: a Linear agent, a calendar agent, a coding agent that
executes a ticket the speaker filed. Some are granted to a specific chat; some run
unattended and feed the knowledge base.

The speaker may create, read and update a GitHub issue directly — that is a tool call.
*Executing* that ticket is a different thing entirely: async, off-thread, a background
agent.

**Same paradigm as everything else:** a folder, a config file, a skill. Grokkable,
inspectable, editable by hand.

### Speaker

Ambient, present in one chat, doing that chat's job. Composed of:

```
identity.md          global — who Ambient is. always. never overridden.
<the chat's mandate>  local — what this chat is for. ADDS to identity, never replaces it.
chats/<slug>/skills/ local — how to do this chat's job
+ the shared knowledge base
```

The old repo's mistake was making the local mandate *replace* the global identity. It
composes. Always.

### Root — **[form parked, job not]**

What it does is settled; whether it is a distinct mouthless agent or just another loop is
parked, because nothing depends on the answer yet.

Its job is the system itself:

- create a chat, put a speaker in it, write its mandate
- give a chat its own skills and tools
- **dynamically create background agents** — configure an MCP, write a skill, bind a
  scope — and grant them to a chat or set them running unattended
- schedule and adjust background work

Everything it does is a **configuration file write**, hot-reloaded, in a git repo. Skills
go through OpenKnowledge's own gate: the Root authors a **Draft**; `install` makes it live.
Whatever the Root can do, the user can also do by editing the same files.

### Knowledge base

**One.** One wiki, one graph, shared by every chat and every source.

It is an **OpenKnowledge project**: markdown-CRDT over MCP. Humans and agents write the
same documents concurrently, every change attributed, with `search`, `links`, `lint`,
`audit`, `checkpoint`/`restore_version`, templates, and skills as first-class objects.
See `research/open-knowledge.md` — a large amount of what looks like product surface is
already solved there.

Two kinds of content:

- **Judgement, in prose.** Who someone is, how they behave, what to watch out for, what is
  still assumed. This is the bulk of it.
- **Facts with values.** A person's number, an org, an issue's status, a commitment's due
  date. Whether these live as typed frontmatter on documents or in a separate store is
  **open** — see below.

**Provenance is largely not ours to build.** OpenKnowledge already enforces that every
factual claim cites a source, and that the source is a document inside the base. What is
ours is one distinction on top: *learned from the principal's history* versus *Ambient
witnessed this*. Ambient must never claim presence it did not have.

---

## Two halves

**Ingestion — builds knowledge, never speaks.**
Sources → observations → knowledge. Layered cadences: per-chat digest, cross-chat weekly
synthesis, media annotation, entity and page upkeep. `~/email-pa` is this half, already
proven, for an email source — it worked because it had **one thing to focus on**, not
because it lacked a mouth.

**Speaking — one speaker per chat.**
Reads knowledge as initial context and through tools. Decides whether to speak. Emits a
structured receipt every run.

**The speaker does not write shared knowledge directly. Settled.**

The reason has changed, and the change is worth recording because the old reason was
wrong: it is *not* that concurrent writes would corrupt the base — OpenKnowledge is a CRDT
and handles that. It is that **a speaker under time pressure writes worse pages than a
considered pass does**.

So "promotion" is not a third subsystem. It is a cadenced **consolidation loop**, one of
many, and it uses OpenKnowledge's own `workflow({ kind: 'consolidate' })`.

There is **no local wiki**. A chat folder holds its mandate, its skills, its transcript,
its media and its `now` — nothing that pretends to be a second knowledge base.

---

## Memory layout

```
identity.md                 who Ambient is. always. never overridden.

<knowledge base>/           an OpenKnowledge project — the ONE knowledge base
  index.md                  curated judgement, one line per page
  now.md                    generated
  people/  orgs/  topics/
  <ontology>                form undecided — see Open

chats/<slug>/
  <mandate>                 machine-readable config + prose. hot-reloaded.
  skills/                   this chat's own skills (OK skill scope)
  now.md                    this chat's state — generated from run receipts
  transcript.jsonl
  media/

agents/<name>/              background agents — MCP, skill, scope
```

A speaker's initial context is small and known: `identity.md`, its mandate, its own
`now.md`, the knowledge base's `now.md` and `index.md`, and the transcript tail.
Everything else is a tool call.

### Loop

A trigger and the work it causes. Loops stack; they do not block each other.

**From outside, no loop is visible.** A person in a chat sees one entity. They never see a
background pass running, a second agent, or a job landing — only Ambient, which happens to
have an interior.

Candidates: a message arrives · an email arrives · media lands (annotate) · daily ·
weekly · dream/synthesis · a long job.

---

## Global and local

Both levels exist for most things. The rule is that **local adds to global; it never
replaces it** — the mistake the old repo made.

| | Global | Local (per chat) |
|---|---|---|
| identity | `identity.md` | the mandate's prose — adds to it |
| skills | OK skills at `scope: Global` | OK skills at `scope: Project`, plus the chat's own |
| state | `now.md` — where Ambient stands | `chats/<slug>/now.md` — where this thread stands |
| capabilities | every tool, MCP and background agent that exists | the subset this chat is granted |
| knowledge | the one knowledge base | — knowledge is never local |

Knowledge is the only thing that is global-only.

---

## The cold start problem

This is the thing that decides whether v0.1 is worth anything.

email-pa worked because it was handed **a year of real email** — invoices, price lists,
threads, counterparties. There was good state to build from, so the knowledge base had
something to be about.

**Ambient has none of that.** Its own WhatsApp number is a test line with nothing
canonical on it, and its one real group is poisoned from testing — that group is likely to
be deleted and started fresh.

The real history lives on **Aaron's personal WhatsApp**: a CTO across several companies,
handling bugs, doing real business — who everyone is, what they do, tracked across many
chats over a long period. That is the year-of-email equivalent, and it is the only way to
get a knowledge base that is worth anything on day one.

So history import is not a nice-to-have. **The architecture has to support ingesting from
an account Ambient does not live on, without pretending it was there.**

What that requires:

1. **Source modes.** The principal's personal number is `ingest` — read, learn, never
   speak. Ambient's own number is `speak`.
2. **Ingestion policy.** Not every personal chat belongs in a work knowledge base. Which
   conversations are in scope is a decision, not a default.
3. **Provenance, everywhere.** One knowledge base, but every fact knows where it came
   from. "What came from here and what came from there." A page about a person should be
   able to say which claims came from Aaron's history and which Ambient learned itself.
4. **Ambient never claims presence it did not have.** Something learned from Aaron's
   history is something it *knows*, not something it *witnessed*. It must not say "you
   told me" about a conversation it was not in.

---

## Settled

- Ambient is one entity; it is not the principal.
- **Aaron is the principal** for his own instance. Everyone else is a third party. Other
  people will run their own — the architecture must not assume Aaron.
- Sources have modes: `ingest` (never speaks) and `speak`. History import and continuous
  ingestion are two distinct operations, both real.
- The principal's personal WhatsApp is `ingest`. Ambient's own number is `speak`.
  **Ambient never acts on the principal's number.**
- Ingestion is governed by an **allowlist**, opt-in per conversation.
- **One knowledge base**, an OpenKnowledge project. No partitions.
- **The speaker does not write shared knowledge directly** — a quality decision, not a
  concurrency one. Consolidation is a cadenced loop.
- Identity composes: global always, local adds, local never replaces.
- **The mandate has two halves**: machine-readable capability config, and prose.
  Hot-reloaded — adding a capability never restarts the daemon.
- **The speaker never runs a long job.** It hands off to a background agent.
- **Background agents are configurable at runtime** by the Root or by the user: an MCP, a
  skill, a scope. Same paradigm as everything else — a folder and a config file.
- **Skills compound like knowledge does.** An agent authors a Draft; `install` is the
  review gate. OpenKnowledge owns this mechanism.
- **Silence is first-class. Canon.**
- Extensibility is for the user, not only for the agent. Most users will not be engineers.
- Configuration is files in a git repo.

## Open

**[open] Does the ontology make sense here, and in what form?** The *ontology* — a closed
type vocabulary — and the *graph store* are separate questions. email-pa's graph is 97%
Price and Document rows extracted from PDFs; WhatsApp produces almost none of that. See
the grill.

**[open] What `now` is, exactly.** Direction agreed: every agent invocation ends with a
structured output, and `now` is a generated fold over recent receipts plus derived counts —
something for the next invocation to grab onto. Shape still to pin down. See the grill.

**[open] Disclosure.** Storage is one base, settled. Speech is not: something learned in a
private thread must not surface in a work group. Becomes real the day the mouth arrives.

**[parked] Root form** — distinct mouthless agent, or another loop. Its *job* is settled.
