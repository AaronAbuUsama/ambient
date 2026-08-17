# Ambient — the lexicon

One word, one meaning. This file **defines** words; it never **decides** anything. Where a
word carries a decision, the definition points at the document that owns it.

Ambient is one context, so there is one lexicon and no `CONTEXT-MAP.md`.

The rule that governs this file, and what it must never become, is
[docs/rules/language.md](docs/rules/language.md).

---

## Language

### The system

**Ambient**:
One entity with one identity and one accumulated understanding. Present in many Chats,
never a different entity in each.
_Avoid_: the bot, the assistant, the agent (an Agent is a different noun below).

**Principal**:
The one privileged human an Ambient instance works for. Everyone else in any Chat is a
third party.
_Avoid_: owner, user, Aaron (the architecture must not assume a name).

**Chat**:
One conversation Ambient is present in. It has a folder on disk, and the folder is the
whole grant.
_Avoid_: conversation (that is the Source's own word — see Peer), room, thread, channel
(`channel` is a module).

**Speaker**:
Ambient present in one Chat, doing that Chat's job. Composed of the global identity, the
Chat's Mandate, the Chat's skills and the Knowledge base.
_Avoid_: the mouth (acceptable in prose about the area, not as the noun).

**Mandate**:
What one Chat is for. Two halves: a machine-readable half of capability configuration, and
a prose half.
_Avoid_: prompt, system prompt, persona, config (the machine half is `config.yaml`).

**Root**:
The agent whose job is the system itself — creating Chats, writing Mandates, configuring
Agents. Its form is parked; its job is settled.
_Avoid_: admin, orchestrator, supervisor.

**Agent**:
A configured background worker with its own folder, model, MCP list and scope. The Speaker
never runs a long job; it hands off to one.
_Avoid_: worker, subagent, job (a Job is one run of an Agent).

**Loop**:
A trigger and the work it causes. Loops stack and do not block each other. From outside a
Chat no Loop is visible.
_Avoid_: cron, scheduler, pipeline.

**Knowledge base**:
The one OpenKnowledge project shared by every Chat and every Source. Knowledge is never
local to a Chat.
_Avoid_: memory, wiki, store, database, vector store.

**Area**:
One named unit of roadmap work, tracked in [docs/design/roadmap.md](docs/design/roadmap.md).
An Area is not a module and does not map one-to-one onto modules.
_Avoid_: phase, milestone, epic, sprint.

### Sources, and reading them

**Source**:
Somewhere knowledge arrives from. Every Source has a Mode and a Shape.
See [docs/design/product.md](docs/design/product.md).
_Avoid_: integration, connector, provider, account (an Account is WhatsApp's own noun).

**Mode**:
What a Source is allowed to do: `ingest` reads and never speaks; `speak` reads and speaks.
_Avoid_: direction, permission, role (a Role is a model profile — see `config.yaml`).

**Shape**:
How a Source is read: a **Live account** or an **Archive**.
_Avoid_: type, kind (`kind` is the Source's medium — `whatsapp`, `email`).

**Live account**:
A paired WhatsApp Account read over a socket. Can be `ingest` or `speak`.
_Avoid_: socket, session, connection, the daemon (`whatsappd` is the dependency, hidden by
the `channel` module).

**Archive**:
A file the Principal exported from WhatsApp. Always `ingest`, never speaks. Two file
shapes: a `.txt`, or a `.zip` holding `_chat.txt` plus flat media files.
_Avoid_: export, dump, backup, history file.

**History Import**:
The one-time operation that reads an Archive. Settled by
[ADR 003](docs/adr/003-history-import-is-an-archive.md).
_Avoid_: **backfill** — the word named two different operations and produced four wrong
answers in one session. Also avoid: initial sync, seeding.

**Continuous Ingestion**:
The ongoing operation that reads a Live account. Never stops.
_Avoid_: backfill, sync, polling, streaming.

**Reader**:
A thing that turns one Source Shape into Messages. Exactly two exist: one for an Archive,
one for a Live account. A Reader produces values and writes nothing.
_Avoid_: parser (only part of what a Reader does), importer, adapter (an Adapter is the
code word for a thing filling a seam — see [docs/rules/modules.md](docs/rules/modules.md)).

**Peer**:
The Source's own identifier for one conversation, bound to a Chat by that Chat's
`config.yaml`.
_Avoid_: chat id, jid, room id.

**Allowlist**:
The set of a Source's conversations that are in scope. Opt-in, conversation by
conversation. Empty means nothing is read.
_Avoid_: whitelist, filter, scope (Scope is an Agent's remit).

**Cursor**:
A durable position in a Source, so a restart neither replays nor skips.
_Avoid_: offset, checkpoint (`checkpoint` is an OpenKnowledge verb), watermark.

### What a read produces

**Message**:
One thing somebody said in one conversation, as a value, before anything interprets it.
_Avoid_: event, record, item, row.

**Transcript**:
One file per Chat. One Message per line. It grows with traffic, which is why `home` never
parses it.
_Avoid_: log, history, messages file.

**Write path**:
The one thing that turns Messages from any Reader into a Transcript and Blobs. Two
Readers, one Write path — [ADR 003](docs/adr/003-history-import-is-an-archive.md).
_Avoid_: writer, sink, ingest pipeline.

**Receipt**:
A durable account of one completed operation: what source it used, what it changed, and
what it could not read. History Import's Receipt is specified in
[docs/planning/import/spec.md](docs/planning/import/spec.md).
_Avoid_: log, report, provenance (Provenance is a fact's known/witnessed distinction).

**Blob**:
Media bytes, stored once and addressed by hash, global across every Chat.
_Avoid_: attachment, file, asset, media (Media is the interpretation of a Blob).

**Media state**:
Why a Blob is or is not readable. Four declared failures — `NoHandle`, `Expired`,
`Failed`, `NeverDriven` — recorded in [docs/planning/intake/scope.md](docs/planning/intake/scope.md).
_Avoid_: error, status, missing.

**Provenance**:
Whether Ambient **knows** a fact or **witnessed** it. A fact from an Archive is known, not
witnessed. Ambient must never claim presence it did not have.
_Avoid_: source (Source is a noun above), origin, attribution.

**Identifier claim**:
Whether a link between two identifiers for one person is `witnessed` by traffic carrying
both, or merely `asserted`. Measured: 84 of 853 merges are witnessed.
_Avoid_: match, merge, alias link.

**Non-decidable queue**:
The place for what Ambient cannot settle, surfaced for the Principal to answer in a
sentence. A product primitive, not an edge case.
_Avoid_: error queue, dead letter queue, TODO list.

### Time in an Archive

**Wall clock**:
A local date and time with no offset and no zone. What an Archive writes for every
Message.
_Avoid_: timestamp, date, local time.

**Instant**:
One unambiguous point in time, as a UTC epoch. What a Live account carries and what a
Transcript needs.
_Avoid_: timestamp, epoch, UTC time.

**Zone**:
An IANA timezone name, such as `Africa/Accra`. Never a fixed offset: a fixed offset cannot
represent daylight saving.
_Avoid_: offset, UTC offset, timezone (as a number).

**Marker**:
The text an Archive writes where media bytes are present in the same `.zip`, of the form
`<attached: NNNNNNNN-TYPE-date-time.ext>`.
_Avoid_: attachment reference, media ref (a Blob ref is a hash).

**Placeholder**:
The text an Archive writes where media existed but the bytes were not exported, such as
`image omitted`. Measured on one chat: 1,131 of 1,139.
_Avoid_: stub, omitted media, missing file.

---

## What this file is not

| It is not | That lives in |
|---|---|
| the product model, or what each noun owns | [docs/design/product.md](docs/design/product.md) |
| which modules exist and which way they depend | [docs/design/seams.md](docs/design/seams.md) |
| a rule | [docs/rules/](docs/rules/) |
| a decision | [docs/adr/](docs/adr/), amended per [decisions.md](docs/rules/decisions.md) |
| a schema, a path, or a config key | [docs/planning/skeleton/spec.md](docs/planning/skeleton/spec.md) |

The code words — **module, interface, implementation, depth, seam, adapter, leverage,
locality** — are not redefined here. They belong to the `codebase-design` skill and are
enforced by [docs/rules/modules.md](docs/rules/modules.md).
