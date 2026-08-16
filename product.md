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
grant:

```
chats/<slug>/
  chat.md            the mandate — who is here, what this chat is for, how to behave
  skills/            skills scoped to THIS chat only
  now.md             this chat's state — local, generated
  transcript.jsonl
  notes/             what the speaker noticed, awaiting promotion
  media/
```

Same entity, same personality, **different behaviour**. A bug-reports group, an internal
PA thread, an outreach conversation with a customer, and a thread with HMRC are four
different jobs done by one entity. The folder is where that difference lives.

### Speaker

Ambient, present in one chat, doing that chat's job. Composed of:

```
identity.md          global — who Ambient is. always. never overridden.
chats/<slug>/chat.md local — what this chat is for. ADDS to identity, never replaces it.
chats/<slug>/skills/ local — how to do this chat's job
+ the shared knowledge base
```

The old repo's mistake was making the local mandate *replace* the global identity. It
composes. Always.

### Root — **[parked]**

The thing that configures the system: create a chat, put a speaker in it, write its
mandate, give it skills, extend it with tools, schedule background work. "The Root
programs the channel."

Two candidate readings, deliberately not resolved yet because nothing depends on it today:

- a distinct agent with no mouth, or
- **just another loop** — a configuration pass on a cadence, like every other loop.

Park it. When enough chats exist that configuring them by hand is annoying, the answer
will be obvious. What matters now is that configuration is **file writes into a git repo**,
so whichever it turns out to be, the substrate already supports it.

### Knowledge base

**One.** One wiki, one graph, shared by every chat and every source.

Split by kind, not by owner:

- **Graph** — things with values. A person, an org, a document, a date, a status, a
  number. Closed hand-written schema; the model fills it and never extends it.
- **Wiki** — judgement in prose. Who someone is, how they behave, what to watch out for,
  what is still assumed.

Every fact and every page carries **provenance**: which source, which chat, which message.

---

## Three subsystems

The correction that matters most. These are **separate**, and conflating them is what
broke the old repo.

### 1. Ingestion — builds knowledge, never speaks

Sources → observations → knowledge. Runs on cadences, layered:

- per-chat digest — what happened in this conversation
- cross-chat digest — what happened across everything this week
- media annotation — what this image or document actually shows
- entity and page upkeep — the wiki, the graph, the generated regions

**email-pa is literally this subsystem, already proven, for an email source.** Nothing in
it involves speaking, which is exactly why it worked.

### 2. Speaking — one speaker per chat

- **Reads** the global knowledge base: part of it as initial context (digests, `now`,
  index), the rest through tools.
- **Writes only its own local wiki.** Its own understanding of its own conversation.
- Never writes global knowledge directly.

### 3. Promotion — local becomes global

On a cadence, a separate pass walks the chats' local wikis and folds what belongs into the
global knowledge base, with provenance.

This is the seam that lets the speaker stay fast and lets the shared knowledge stay
coherent — a live agent under time pressure can never corrupt what every other chat reads.

---

## Local and global memory

Knowledge is global. **A speaker's own understanding of its own chat is local.**

```
wiki/                       GLOBAL — written by ingestion and promotion only
  index.md  now.md
  people/  orgs/  topics/
  ontology/

chats/<slug>/
  chat.md                   mandate
  skills/                   this chat's skills
  transcript.jsonl
  wiki/                     LOCAL — the speaker's own, written by the speaker
    now.md                  this chat's state
    notes/                  what it noticed, awaiting promotion
```

A speaker's initial context is small and known: `identity.md`, its own `chat.md`, its own
local `now.md`, the global `now.md` and `index.md`, and the transcript tail. Everything
else is a tool call.

**[open]** Whether the speaker writes its local wiki *during* a turn, or whether even that
is deferred to a background pass. Doing it inline is simpler; deferring it is faster.

### Loop

A trigger and the work it causes. Loops stack; they do not block each other.

**From outside, no loop is visible.** A person in a chat sees one entity. They never see a
background pass running, a second agent, or a job landing — only Ambient, which happens to
have an interior.

Candidates: a message arrives · an email arrives · media lands (annotate) · daily ·
weekly · dream/synthesis · a long job.

---

## Global and local

The distinction that makes the whole thing work. Both levels exist for most things:

| | Global | Local (per chat) |
|---|---|---|
| identity | `identity.md` | `chat.md` — adds to it |
| skills | `skills/` | `chats/<slug>/skills/` — shadows by name |
| state | `wiki/now.md` — where Ambient stands | `chats/<slug>/now.md` — where this thread stands |
| index | `wiki/index.md` | this chat's own notes |
| knowledge | the wiki and the graph | — knowledge is never local |

Knowledge is the one thing that is only ever global. Everything else has both levels.

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

So the backfill is not a nice-to-have. **The architecture has to support ingesting from an
account Ambient does not live on, without pretending it was there.**

What that requires:

1. **Source modes.** Aaron's personal number is `backfill` — read, learn, never speak.
   Ambient's own number is `live`.
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

- Ambient is one entity; it is not Aaron.
- **Aaron is the principal.** Everyone else is a third party.
- Sources have modes: `ingest` (never speaks) and `speak`.
- Aaron's personal WhatsApp is `ingest`, continuously. His email later, the same.
  Ambient's own number is `speak`. **Ambient never acts on Aaron's number.**
- Ingestion is governed by an **allowlist**, opt-in per conversation.
- One knowledge base. Provenance on everything.
- Identity composes: global always, local adds, local never replaces.
- Three separate subsystems: ingestion, speaking, promotion.
- Local memory per chat; global knowledge shared.
- Configuration is file writes in a git repo.

## Open

**[open] The job.** What is Ambient *for*, in one sentence, to someone who has never seen
it? "Knows things and replies in chats" is a capability, not a job. email-pa's sentence —
"email-fed business intelligence, one folder per business" — is why every decision in it
holds together. This is the last big one.

**[open] Inline or deferred local writes.** Does the speaker update its local wiki during
a turn, or does a background pass do it?

**[open] Disclosure.** Storage is one base, settled. Speech is not: something learned in a
private thread must not surface in a work group. Mandate concern per chat, provenance
rule, or an eval that catches leaks? Becomes real the day the mouth arrives.

**[parked] Root** — distinct agent, or just another loop. Nothing depends on it yet.
