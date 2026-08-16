# Ambient — the thesis

The front door. `product.md` is the model; `kernel.md` is the lessons and mechanics.

---

## The sentence

**Ambient is a persistent agent you hire, onboard, and extend — it lives in your
WhatsApp, learns your world from your history, and works as one consistent colleague
across every conversation you put it in.**

The shortest true version: **you onboard it by giving it your chat history.**

---

## The metaphor is hiring, and it is load-bearing

Not "a bot", not "a framework", not "an app". You hire someone.

| Hiring a person | Ambient |
|---|---|
| They arrive knowing nothing | A fresh install with an empty knowledge base |
| You catch them up — who everyone is, what's going on | It ingests your message history and builds the wiki |
| You put them in the right rooms | You add it to chats; each chat gets a mandate |
| They behave differently with a customer than with the team | Same entity, per-chat mandate and skills |
| They take on more as they prove themselves | New tools, new skills, unbounded tasks |
| They get better the longer they're there | The knowledge base compounds |
| You can ask what they think they know, and correct them | The wiki is markdown you can open and edit |

Every design decision in this system should be checkable against that table. If a feature
doesn't map to something you'd expect of a colleague, it probably shouldn't exist.

It scales along that axis too: PA → apprentice → colleague. Same system, more trust, more
tools, more autonomy. Nothing about the architecture has to change to move along it.

---

## The category, and where Ambient sits in it

There is now a class of persistent, chat-resident agents — Claude in Slack, and a growing
set of open and commercial equivalents. The shape is familiar: an agent that lives in a
group conversation, that anyone in the room can address.

Ambient is that class. It is **not** trying to be a differentiated protocol or a new
framework. What distinguishes it is a set of opinions:

**1. It is situated, not summoned.**
It is not invoked per task. It is *present*, and it decides whether to speak. Silence is a
first-class outcome. A colleague who replies to every message in a group chat is not a
colleague.

**2. It accumulates.**
A context window is not memory. Ambient's understanding is a knowledge base that grows
from everything it sees and gets more useful the longer it runs. This is the whole
product — the agent loop is commodity, the accumulated understanding is not.

**3. It is one entity across many chats.**
Not a bot per channel. One identity, one voice, one knowledge base, many jobs. The bug
group, the internal thread, the customer conversation, the accountant — four jobs, one
colleague. The per-chat mandate **adds** to the identity; it never replaces it.

**4. Its knowledge is inspectable and correctable.**
Markdown in folders. Opens in Obsidian. Tracked in git. You can read what it thinks it
knows, see where each claim came from, and fix it by editing a file. Nothing is trapped
in a vector store or a proprietary graph.

**5. It is opinionated, not general.**
Purpose-built as an assistant with a principal. Primarily WhatsApp, because that is where
the conversations actually are. Email secondary. Not a platform for building agents —
a specific agent, built well.

**6. It is extensible at runtime, by writing files.**
A new chat, a new mandate, a new skill, a new tool — all file writes into a git repo. No
deploy, no schema migration, no code change. That is what makes "give it more to do"
cheap enough to actually happen.

**7. It knows who it works for.**
Aaron is the principal. Everyone else in any conversation is a third party. That single
fact settles tone, trust, escalation, and what it may do unasked.

---

## What it actually does

**Ambient is not Aaron.** It has its own number. It knows what he knows, works with him,
and never speaks as him.

It:

- reads what arrives, continuously, across every conversation it is allowed to see
- builds one accumulated understanding of the world — who people are, what organisations
  do, what is outstanding, what changed
- is present in chats where it has a mandate, and answers there as itself
- takes open-ended, unbounded tasks and works them off the conversation thread
- extends: new tools, new skills, eventually code
- surfaces what it is unsure about instead of guessing

---

## The whole product

### Three subsystems, deliberately separate

Conflating these is what broke the previous attempt.

**1. Ingestion — builds knowledge, never speaks.**
Sources → observations → knowledge. Layered cadences: per-chat digests, cross-chat weekly
digests, media annotation, entity and page upkeep. `~/email-pa` is this subsystem, already
proven, for an email source — and it worked precisely *because* nothing in it could speak.

**2. Speaking — one speaker per chat.**
Reads the global knowledge base — part as initial context, the rest through tools. Writes
only its own local wiki. Never writes global knowledge directly, so a live agent under time
pressure can never corrupt what every other chat reads.

**3. Promotion — local becomes global.**
On a cadence, a separate pass folds the chats' local wikis into the shared knowledge base,
with provenance.

### Sources

Somewhere knowledge arrives from. Each has a mode:

| Mode | Meaning | Today |
|---|---|---|
| `ingest` | read continuously, never speak | Aaron's personal WhatsApp; his email later |
| `speak` | read and speak | Ambient's own WhatsApp number |

Two distinct operations, both real:

- **History import** — a one-time pass over what already exists. This is the thing that
  makes a fresh install useful on day one.
- **Continuous ingestion** — the ongoing feed. Never stops.

Every source is governed by an **allowlist**: opt-in, conversation by conversation.
Nothing is ingested by default.

Everything a source produces carries **provenance** — which source, which chat, which
message. One knowledge base, but it always knows where a fact came from, and Ambient never
claims to have witnessed a conversation it was only told about.

### Memory: global and local

```
identity.md                 who Ambient is. always. never overridden.

wiki/                       GLOBAL — written by ingestion and promotion only
  index.md                  one judgement-line per page; this is retrieval
  now.md                    where Ambient stands, generated, never edited
  people/  orgs/  topics/
  ontology/
    schema.yaml             closed, hand-written; the model fills it, never extends it
    graph.jsonl             things with values — append-only

chats/<slug>/
  chat.md                   the mandate: who is here, what this chat is for
  skills/                   scoped to this chat
  transcript.jsonl
  media/
  wiki/                     LOCAL — the speaker's own understanding of this conversation
    now.md
    notes/                  awaiting promotion
```

Two rules hold the memory together:

- **The graph holds facts; the wiki holds judgement.** Values, dates, refs and statuses go
  in the graph under a closed schema. Everything requiring an opinion goes in prose.
- **Knowledge is only ever global.** Everything else — identity, skills, state — exists at
  both levels, with local adding to global rather than replacing it.

### Loops

A trigger and the work it causes. They stack and do not block each other.

A message arrives · an email arrives · media lands · per-chat digest · weekly synthesis ·
promotion · a long job.

**From outside, no loop is visible.** A person in a chat sees one entity. They never see a
background pass, a second agent, or a job landing — only Ambient, which happens to have an
interior.

### Configuration is files

A chat, its mandate, its skills, its tools: all files in a git repo. Every configuration
change is a commit; undo is a revert. Whether that configuration is eventually written by
a distinct Root agent or by another loop is **parked** — nothing depends on it yet, and
the substrate supports either.

---

## Why this is buildable now when it wasn't before

The previous attempt built the mouth first: durable queues, leases, four agent kinds, a
bespoke context builder, an EAV memory graph — 15.2k lines, and what it said was
embarrassing. The knowledge arrived last, as an afterthought, and was queried with
`LIKE '%q%'`.

email-pa did the opposite and it worked: build the knowledge, prove it by operating it by
hand, automate last. Its wiki is coherent because nothing in it could speak.

So the order is settled:

1. Ingestion tools. **Already have step one** — whatsappd is working and paired.
2. Build the knowledge base out of real history, from OpenKnowledge templates.
3. **Operate it by hand.** Claude Code in the folder, running skills, until they are good.
4. Encode the skills; automate the loops with Pi.
5. Then the mouth.

And the harness is not ours to invent. `@oh-my-pi/pi-coding-agent` already ships the agent
loop, file tools, skills, sessions, and — critically — context management and compaction.
The previous attempt hand-built a worse version of all of it. **Give Pi a full loop.**

---

## The cold start problem, and why it shapes v0.1

email-pa was handed a year of real email. That is why its wiki is any good — it had
something to be about.

Ambient's own number is a test line with nothing canonical on it, and its one real group is
poisoned from testing. The real history — a CTO across several companies, bugs, actual
business, hundreds of people tracked across years of chats — lives on **Aaron's personal
WhatsApp**.

That is the year-of-email equivalent, and it is the only path to a knowledge base worth
having on day one. Which is why `ingest`-mode sources, an allowlist, and provenance are not
future features. They are v0.1.
