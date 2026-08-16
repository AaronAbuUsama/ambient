# Ambient — the thesis

The front door. `product.md` is the model; `kernel.md` is the lessons and mechanics;
`research/open-knowledge.md` is what the knowledge substrate already gives us.

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
| You catch them up — who everyone is, what's going on | It ingests your message history and builds the knowledge base |
| You put them in the right rooms | You add it to chats; each chat gets a mandate |
| They behave differently with a customer than with the team | Same entity, per-chat mandate, skills and tools |
| They take on more as they prove themselves | New tools, new MCPs, new skills, unbounded tasks |
| **They write down how they do things, and you sign it off** | **It authors skills as Drafts; installing one is a review gate** |
| They get better the longer they're there | The knowledge base compounds — and so do the skills |
| They hand the long jobs to someone else | Long-running work goes to a background agent, off-thread |
| You can ask what they think they know, and correct them | The knowledge base is markdown you can open and edit |

It scales along that axis: PA → apprentice → colleague. Same system, more trust, more
tools, more autonomy. **Nothing about the architecture has to change to move along it** —
and that is the test any proposed feature should pass.

**It compounds on two axes, not one.** Knowledge is what it knows. Skills are how it
works. Both accumulate, and the second is the one people usually forget.

---

## The category, and where Ambient sits in it

There is now a class of persistent, chat-resident agents — Claude in Slack, and a growing
set of open and commercial equivalents. The shape is familiar: an agent that lives in a
group conversation, that anyone in the room can address.

Ambient is that class. It is **not a heavyweight protocol or framework** — it is a
specific assistant, built well, with opinions:

**1. It is situated, not summoned.**
Not invoked per task. It is *present*, and it decides whether to speak. **Silence is a
first-class outcome — this is canon.** A colleague who replies to every message in a group
chat is not a colleague.

**2. It accumulates — knowledge and skills both.**
A context window is not memory. Ambient's understanding grows from everything it sees, and
its skills — how it actually operates in each context — are revised on the job. The agent
loop is commodity; the accumulated understanding and the accumulated skill are not.

**3. It is one entity across many chats.**
Not a bot per channel. One identity, one voice, one knowledge base, many jobs. The bug
group, the internal thread, the customer conversation, the accountant — four jobs, one
colleague. The per-chat mandate **adds** to the identity; it never replaces it.

**4. Its knowledge is inspectable, correctable, and co-writable.**
The knowledge base is an **OpenKnowledge** project: a markdown-CRDT store over MCP where
humans and agents write the same documents concurrently, every change attributed, every
factual claim required to cite a source that lives inside the base. You can read what it
thinks it knows, see where each claim came from, and fix it by editing a file. Nothing is
trapped in a vector store or a proprietary graph.

**5. It is opinionated, not general.**
Purpose-built as an assistant with a principal. Primarily WhatsApp, because that is where
the conversations actually are. Email secondary.

**6. It is extensible at runtime — by the agent *and* by the user.**
A new chat, a new mandate, a new skill, a new MCP, a new background agent: all
configuration files, hot-reloaded, no deploy and no daemon restart. **This is not only for
Aaron.** Other people will run their own Ambient, most of them not engineers, and they
must be able to plug in their own MCPs and stand up their own background agents by editing
something legible.

**7. It knows who it works for.**
The principal is one privileged human; everyone else in any conversation is a third party.
That single fact settles tone, trust, escalation, and what it may do unasked.

---

## What it actually does

**Ambient is not its principal.** It has its own number. It knows what they know, works
with them, and never speaks as them.

It:

- reads what arrives, continuously, across every conversation it is allowed to see
- builds one accumulated understanding — who people are, what organisations do, what is
  outstanding, what changed
- is present in chats where it has a mandate, and answers there as itself
- takes open-ended, unbounded tasks and hands the long ones to background agents
- extends: new tools, new MCPs, new skills, new background agents — at runtime
- surfaces what it is unsure about instead of guessing

---

## The whole product

### The stack

```
OpenKnowledge   knowledge substrate — storage, retrieval, writes, attribution,
                conflicts, skills, templates, lint, versions, provenance rules
Pi              the agent loop — tools, context management, compaction, sessions
whatsappd       the channel — pairing, inbound accepted log, durable outbound

Ambient         the glue — sources, ingestion, loops, mandates, capabilities,
                the speaker, run receipts, jobs
```

**We build the fourth row.** A large part of what looks like product surface is already
solved one row up; see `research/open-knowledge.md` before designing anything that touches
knowledge, skills, or provenance.

### Two halves

**Ingestion — builds knowledge, never speaks.**
Sources → observations → knowledge. Layered cadences: per-chat digests, cross-chat weekly
synthesis, media annotation, entity and page upkeep. `~/email-pa` is this half, already
proven, for an email source.

**Speaking — one speaker per chat.**
Reads knowledge as initial context and through tools. Decides whether to speak. Emits a
structured receipt every run. **It does not write shared knowledge directly** — not
because CRDT couldn't take the write, but because a time-pressured speaker writes worse
pages than a considered pass does. Consolidation is a cadenced loop, one of many.

### Sources

| Mode | Meaning | Today |
|---|---|---|
| `ingest` | read continuously, never speak | the principal's personal WhatsApp; their email later |
| `speak` | read and speak | Ambient's own WhatsApp number |

Two distinct operations, both real: **history import** (a one-time pass over what already
exists — what makes a fresh install useful on day one) and **continuous ingestion** (the
ongoing feed). Every source is governed by an **allowlist**: opt-in, conversation by
conversation, nothing by default.

### A chat is a folder, and the mandate has two halves

The split that matters: **machine-readable configuration, and prose.**

- **Machine-readable** — which tools this speaker has, their scope, which MCPs, which
  background agents it can hand off to. Legible enough that a non-engineer can read and
  change it; structured enough that the Root can write it.
- **Prose** — what this chat is for, who is here, how to behave.

Both live in the chat's folder alongside its own skills. Both are hot-reloaded: adding a
capability never requires a restart.

### Background agents

The speaker never runs a long job itself. It hands off.

A background agent is a configured thing — an MCP, a skill, a scope — that the Root (or
the user) can create at runtime: a Linear agent, a calendar agent, a coding agent that
executes a ticket the speaker filed. Some are handed to a specific chat; some run
unattended and feed the knowledge base. **Same paradigm as everything else: a folder, a
config file, a skill.** Grokkable, inspectable, editable by hand.

### Loops

A trigger and the work it causes. They stack and never block each other.

A message arrives · an email arrives · media lands · per-chat digest · weekly synthesis ·
consolidation · configuration · a long job.

**From outside, no loop is visible.** A person in a chat sees one entity. They never see a
background pass, a second agent, or a job landing — only Ambient, which happens to have an
interior.

### Configuration is files

Chats, mandates, capabilities, background agents, skills: all files in a git repo, all
hot-reloaded. Skills specifically go through OpenKnowledge's own gate — an agent authors a
**Draft**; `install` makes it live. Self-evolution with a review boundary.

Whether configuration is eventually written by a distinct Root agent or by another loop is
**parked** — nothing depends on it yet and the substrate supports either.

---

## Why this is buildable now when it wasn't before

The previous attempt built the mouth first: durable queues, leases, four agent kinds, a
bespoke context builder, an EAV memory graph — 15.2k lines, and what it said was
embarrassing. The knowledge arrived last, as an afterthought, queried with `LIKE '%q%'`.

email-pa did the opposite and it worked — **because it had one thing to focus on.** Not
because it lacked a mouth; because nothing competed with getting the knowledge right.

So the order:

1. Ingestion tools. **Step one already exists** — whatsappd is working and paired.
2. Build the knowledge base out of real history, as an OpenKnowledge project.
3. **Operate it by hand.** Claude Code in the folder, running skills, until they are good.
4. Encode the skills; automate the loops with Pi.
5. Then the mouth.

And the harness is not ours to invent. Pi already ships the agent loop, file tools, skills,
sessions, and context management and compaction. The previous attempt hand-built a worse
version of all of it. **Give Pi a full loop.**

---

## The cold start problem, and why it shapes v0.1

email-pa was handed a year of real email. That is why its knowledge base is any good — it
had something to be about.

Ambient's own number is a test line with nothing canonical on it, and its one real group is
poisoned from testing. The real history — a CTO across several companies, bugs, actual
business, hundreds of people tracked across years of chats — lives on the principal's
personal WhatsApp.

That is the closest thing to the year-of-email equivalent, and the only path to a knowledge
base worth having on day one. Which is why `ingest`-mode sources, the allowlist, and
provenance are not future features. They are v0.1.

**Corrected on contact with the real account (2026-08-16).** The assumption was years of
conversation. The measurement is 1,560 contacts, 913 chats, 143 groups and 2,417 aliases
against only 2,739 messages, ninety percent of them from this year. A linked device gets
history from roughly the point of linking. So the cold start is solved for **people** and
not for **conversations** — Ambient can know who everyone is and how they relate, but not
what was said before 2026. That may be the more useful half; it is not the half we
predicted. See [../planning/intake/scope.md](../planning/intake/scope.md).
