# KNOWLEDGE — scope

Mapped 2026-08-20, step 1 of [`slices.md`](../../rules/slices.md). **It decides nothing.** It
records what is on disk, what the existing modules already settle in their types, and what
this Slice must not get wrong — so that
[`design-slice`](../../../.agents/skills/design-slice/SKILL.md) has something to build a
shape against and the principal has something to react to.

**Fact and inference are separated on purpose.** A number measured today is marked
*measured* with its instrument. A number carried in from an earlier document keeps its date
and its source. A thing reasoned to is marked *inferred* and is never in the same sentence
as a measurement.

---

## Destination

**The one knowledge base stops being empty, and Ambient writes it itself.** `knowledge`
reads and writes markdown with typed frontmatter, reached through a `Place` from `home`;
`ambient ontology lint · next · index · query` reads the `schema.yaml` SKELETON already
ships; a mechanical pass turns the real material into documents at `status: unreviewed`;
and reasoning passes are then run **by hand** — Claude Code plus the principal — until they
are good enough to be written down as skills.

**OpenKnowledge is a format we conform to and a viewer, not a dependency.** Nothing spawns
`ok`. [ADR 007](../../adr/007-knowledge-is-files-not-a-client.md).

Reaching the end of this Slice looks like: `~/.ambient/knowledge/` holding documents about
people who actually exist in 18 months of real conversation, a queue that says what still
needs judgement, the home under git so those documents have a history, and at least one
pass run by hand often enough to know what it should say.

**What it must never get wrong**, in the order the damage is unrecoverable:

1. **Claim presence it did not have.** Every one of the 13,134 lines on disk is
   `from: "archive"` — *known*, never *witnessed*. `Person.source: enum(history|witnessed)`
   is the field that carries it and it is required, not optional.
   [ADR 003](../../adr/003-history-import-is-an-archive.md) decision 5,
   [CONTEXT.md](../../../CONTEXT.md)'s **Provenance**.
2. **Merge two identities mechanically.** The collisions are already in the data, not
   hypothetical — see *What is on disk today*.
   [knowledge-flow.md](../../design/knowledge-flow.md): *"Do not merge identities — propose
   with evidence."*
3. **Break the format.** The whole trade in ADR 007 is that conformance is free. A document
   the OpenKnowledge app will not open costs the Slice its one external check, and it is
   falsifier 1 of that ADR.
4. **Automate a pass before it is good by hand.**
   [roadmap.md](../../design/roadmap.md): *"HARNESS automates what KNOWLEDGE proved by
   hand — building it earlier means guessing at passes that do not exist yet."*
5. **Treat an unprocessed voice note as a degraded entry rather than a hole.** 703 lines are
   media with empty text. An entry that reads as thin is worse than one that reads as
   missing, because only the second one gets fixed.

## Decided

One line per answer, pointing at whatever holds the detail. Nothing here is re-litigated.

| # | Answer | Held by |
|---|---|---|
| 1 | **Entities are OpenKnowledge documents with typed frontmatter. There is no separate graph store.** The ontology carries over; the store does not. | [product.md](../../design/product.md), [knowledge-flow.md](../../design/knowledge-flow.md) |
| 2 | **The ontology tool is a validator, a queue and an indexer — never a CRUD layer.** OpenKnowledge already is one. | [knowledge-flow.md](../../design/knowledge-flow.md) |
| 3 | **The knowledge base is addressed over MCP, never by path**, and no code here spawns `ok`. | [knowledge.md](../../rules/knowledge.md) |
| 4 | **`home` already enforces 3 in the type.** `Parsed` is a closed union of six filenames and *"anything under `knowledge/` cannot be named here"*; `Home` exposes `blobs` and `db` as Places and grants for chats, agents and sources — **and no knowledge grant at all**. | [`home/internal/disk.ts:72`](../../../src/modules/home/internal/disk.ts), [`home/types.ts:210`](../../../src/modules/home/types.ts) |
| 5 | **`schema.yaml` is already parsed and typed.** `readSchema` returns `Schema = { types: SchemaType[] }`, each field carrying its form and whether it is optional. KNOWLEDGE **consumes that value**; it does not re-read the file. | [`home/internal/schema.ts:55`](../../../src/modules/home/internal/schema.ts), [`home/types.ts:111`](../../../src/modules/home/types.ts) |
| 6 | **Closed field vocabulary, open type space.** Users add types; users cannot add field forms. Enforced by one regex, and by `doctor` today. | [`schema.ts:24`](../../../src/modules/home/internal/schema.ts), [skeleton/spec.md §3.4](../skeleton/spec.md) |
| 7 | **External data is decoded at the boundary by an Effect `Schema`.** Accepted, both falsifiers answered, and `effect@4.0.0-rc.110` is already a dependency. Frontmatter read out of OpenKnowledge is external data. | [ADR 006](../../adr/006-schema-is-the-parse-boundary.md) and its amendment 1 |
| 8 | **`knowledge` already has a [seams.md](../../design/seams.md) row**, so `new-module` will not refuse it: *"The OpenKnowledge project and the ontology. **Hides the OK MCP client.**"* | [seams.md](../../design/seams.md) |
| 9 | **One knowledge base, no partitions, and the speaker never writes it directly** — a quality decision, not a concurrency one. | [product.md](../../design/product.md), Settled |
| 10 | **Media blobs are global and content-addressed; interpretations are documents**, keyed by the same hash. Chat folders hold references only. | [product.md](../../design/product.md), Settled |
| 11 | **`media` and `knowledge` may want a shared notion of "a document produced from evidence". Do not extract it until both exist.** Only one of them will exist at the end of this Slice. | [seams.md](../../design/seams.md), Provisional |

### What is on disk today — measured 2026-08-20

*Instrument: `wc -l`, `grep -c` and `grep -o | sort | uniq -c` over
`~/.ambient/chats/capxul-devs/transcript.jsonl`, and `file -b --mime-type` over
`~/.ambient/blobs/`. The home was read and never written. Every count below is **measured**
unless it says otherwise.*

| | |
|---|---|
| Transcript | **13,134 lines** — 13,083 `kind: "message"`, 51 `kind: "event"` |
| Provenance | **13,134 of 13,134 are `from: "archive"`.** INGEST proved the Live path against copies, so nothing live was ever written to the real home |
| Span | **14/02/2025 → 17/08/2026 — 18 months**, consistent with [ADR 003](../../adr/003-history-import-is-an-archive.md)'s claim that an export holds 19 months where the live protocol reaches 364 days |
| Chats | **one**, `capxul-devs` |
| Blobs | **980 distinct hashes**, referenced by 1,164 lines |
| Knowledge base | `~/.ambient/knowledge/` holds `.ok/` and `.okignore` and **zero documents** |

**People — 14 distinct `who.label`, and the identity collisions are already in the data.**

Labels are anonymised here per [artefacts.md](../../rules/artefacts.md); the real ones stay
on the machine. The distribution and the collisions are what matter and both survive it.

| Label | Lines | |
|---|---|---|
| `P1` | 4,476 | |
| `P2` | 3,277 | |
| `P3` | 2,016 | |
| `P4` | 1,290 | differs from `P5` **only by a leading `~ `** |
| `P5` | 196 | |
| `P6` | 592 | |
| `P7` | 515 | |
| `P8` | 391 | differs from `P1` by a leading `~ ` **and a trailing emoji** |
| `P9` | 215 | |
| `P10` | 120 | |
| `P11` | 24 | |
| `P12` | 8 | |
| `—` | 8 | an AI assistant, not a person *(inferred)* |
| `—` | 6 | the group itself, carried on system events *(inferred)* |

**Two collisions in fourteen labels, and neither is fuzzy.** `P4`/`P5` differ by two
characters of prefix; `P1`/`P8` by a prefix and a decoration. WhatsApp writes `~ ` in front
of a pushName it has not verified against a contact, so the pair is one human seen through
two channels — which is **inferred**, and is exactly the judgement
[knowledge-flow.md](../../design/knowledge-flow.md) reserves for a reasoning pass.

The count of 14 is measured. That it is **12 labels over roughly 10 humans** is inferred.

**The Archive carries a label and nothing else.** `ArchiveMessage.who` is
`{ readonly label: string }`, annotated *"A display label, never an Address."* `LiveWho`
carries `id`, `mode: "lid" | "pn"`, `alt` and `pushName`. So of the four facts
`knowledge-flow.md` says a mechanical stub records — *number/lid, display name, first seen,
chats seen in* — **only display name is available from 100% of the material now on disk**,
and `Person.numbers: text[]` has no source.
[`transcript/types.ts:22`](../../../src/modules/transcript/types.ts) and
[`:64`](../../../src/modules/transcript/types.ts).

**No Archive line has an identifier.** `ArchiveMessage` carries `wall`, `at`, `zone` and
`who.label`; `LiveMessage` carries `id`. `Commitment.source_message: text` is a **required**
field in the shipped `schema.yaml` with nothing to put in it for any line we hold.
[`transcript/types.ts:95`](../../../src/modules/transcript/types.ts).

**703 lines are a media reference with empty text** — 5.4% of the Transcript, and
individually a hole rather than a thin entry. Blob types over a 200-blob sample: 112 JPEG,
45 WebP, **25 Ogg voice notes**, 9 MP4, 3 PNG, 3 PDF, 1 HEIC, 1 unidentified.

**The six shipped types do not fit the material evenly.** *Instrument: case-insensitive
`grep -c` over raw JSONL lines — it over-counts, because a match inside a URL or a quoted
reply counts, and it under-counts nothing. It is a presence probe, not a census.*

| Shipped type | What the corpus actually holds |
|---|---|
| `Commitment` | **dense** — 188 `I'll`, 153 `I will`, 79 `on it`, 31 `will do`, 14 `by tomorrow`, 4 `EOD` |
| `Organization` | **dense** — Capxul 798, Paynest 343, Base 279, Xelmar 109 |
| `Person` | 14 labels, ~11 humans *(inferred)* |
| `Media` | 980 blobs |
| `Chat` | one |
| `Issue` | **21 distinct GitHub issue/PR links across 18 months**, 24 mentions. *Instrument: `grep -oE 'https://github\.com/[^/ ]+/[^/ ]+/(issues\|pull)/[0-9]+'`, exact, and blind to any issue named by number alone.* **See the correction below — this number does not mean what this map first said it meant.** |

This is the same shape as the finding that produced the design — [knowledge-flow.md](../../design/knowledge-flow.md) counted email-pa at Price 1353, Document 206, Organization 18, Person 4 — but the **distribution is different**, and `Commitment` is the dense one.

**Correction, 2026-08-20 — an inference this map got wrong.** It first read the 21 issue
links as evidence that `Issue` is a mis-shaped type. That does not follow: the count
measures *GitHub mentioned inside WhatsApp*, and the principal has since stated that
**GitHub is itself a Source** — two of them, alongside the two WhatsApp Sources. A type fed
by its own Source is not sized by how often the other Sources happen to name it. The
measurement stands; the inference is withdrawn.

**And GitHub is nowhere in the model.** `Source.kind` is `"whatsapp" | "email"`
([`home/types.ts:79`](../../../src/modules/home/types.ts)), `config.yaml` declares two
WhatsApp Sources, and [product.md](../../design/product.md) names WhatsApp and email. Not a
problem for this Slice, which reaches one Archive; it is a gap in
[product.md](../../design/product.md) and [CONTEXT.md](../../../CONTEXT.md), recorded here
so it does not stay only in a conversation.

### One defect found while tracing, not yet confirmed

**Ambient ships an MCP server declaration that appears unable to reach its own knowledge
base.** The global config template defines `openknowledge` as `command: ok, args: [mcp]`
with no path ([`templates.ts:32`](../../../src/modules/home/internal/templates.ts)); every
chat and agent template ships `mcp: [openknowledge]`
([`:122`](../../../src/modules/home/internal/templates.ts),
[`:146`](../../../src/modules/home/internal/templates.ts)); `McpServer` is
`{ name, command, args, env }` with **no `cwd`**
([`home/types.ts:85`](../../../src/modules/home/types.ts)); and a chat's `cwd` is settled as
its own folder, which is a **sibling** of `knowledge/`, not an ancestor. Measured:
`~/.ambient/chats/capxul-devs/` contains `config.yaml`, `imports/`, `mandate.md`,
`transcript.jsonl` and no `.ok/`.

`ok --help` lists `--cwd <path>` as a global option and `ok mcp --help` takes no project
argument, which is **read**, not measured. Whether project resolution is really by working
directory, and what `ok mcp` does when started somewhere with no `.ok/`, is dispatched as
part of `R1`. **Nothing is concluded here** — it is recorded so the design cannot miss it.

## Answered by the frontier — 2026-08-20, same day

`R1` and `R2` were dispatched behind the alignment gate. The principal then re-opened the
slice's premise, and `R3`, `R4` and `R5` went out to answer it. All five reported. The full
evidence, every claim labelled `[read]` / `[measured]` / `[inference]`, is in
[`findings/`](findings/).

| # | Answer | From |
|---|---|---|
| 13 | **`knowledge` writes the files. Nothing spawns `ok`.** OpenKnowledge is a format and a viewer. | [ADR 007](../../adr/007-knowledge-is-files-not-a-client.md) |
| 14 | **The automation the dependency was for does not exist.** A `write` produces exactly the frontmatter passed; four `edit`s added no `created`, `updated`, `modified` or `title`. | [`findings/03`](findings/03-ok-mcp-tool-inventory.md) |
| 15 | **"Use the MCP" means "run a daemon."** With `OK_MCP_AUTOSTART=0` and no server, **12 of 14 tools failed**, `exec` included. One call spawns a per-project server that idles out after 30 minutes. | [`findings/03`](findings/03-ok-mcp-tool-inventory.md) |
| 16 | **The format is free.** `ok preview` and `ok lint` passed a document in a directory with **no `.ok/` at all**; `ok start` served six plain-`fs` documents; a file written by `fs` appeared in OK's API and backlink cache in **6 seconds**; our frontmatter round-tripped byte-identically. | [`findings/04`](findings/04-straight-tools-cost.md) |
| 17 | **All five verbs are 326 code lines.** `lint + next + index` plus the shared read and the interface is **250 on the nose** — [knowledge-flow.md](../../design/knowledge-flow.md)'s estimate held exactly. Runtime over 1,200 documents: read 220ms, lint 2ms, next 0.3ms, index 8ms, query 0.6ms. | [`findings/04`](findings/04-straight-tools-cost.md) |
| 18 | **Attribution was never OpenKnowledge's to give.** `principal.json` carries `"source": "git-config"` and lifts its name and email from `git config`. Its own attribution answers which of four client channels wrote a file — a different, smaller question than `source: enum(history\|witnessed)`. | [`findings/03`](findings/03-ok-mcp-tool-inventory.md) |
| 19 | **History is the home's own git** — and **`~/.ambient` is not a git repo.** It carries a `.gitignore` excluding `blobs/` and `state.db`, and no `.git`. *Instrument: `git -C ~/.ambient rev-parse --is-inside-work-tree` → `fatal: not a git repository`.* | ADR 007, principal |
| 20 | **`exec` is OpenKnowledge's only enumeration path**, mandated by its own STOP rule, returning parsed frontmatter free. `search` caps at `max: 100` with no wildcard — `search("*")` over 504 documents returned *"No matches"*. Moot for the write path; it is why the MCP is a poor **read** path too. | [`findings/01`](findings/01-ok-mcp-read-surface.md) |
| 21 | **OpenKnowledge's own `lint` already does closed-vocabulary validation** via `contentRules.frontmatter.schemas`, with four gaps: severity always `warning`, output caps at 10 files × 10 diagnostics, `appliesTo` is a path glob not a `type:` discriminator, and it never names the offending key. Ours is 81 code lines and has none of them. | [`findings/01`](findings/01-ok-mcp-read-surface.md), [`04`](findings/04-straight-tools-cost.md) |
| 22 | **There is no Draft and `install` is not a review gate** — *"its own folder IS the skill (there is no draft state)"*. A skill written by plain `cat` is adopted as fully managed. `product.md:381` was wrong on both clauses. | [`findings/02`](findings/02-ok-skills-draft-and-install.md) |
| 23 | **The current MCP revision is `2026-07-28`**, in which `initialize` is deleted — `InitializeRequest`, `SessionId`, `SubscribeRequest`, `PingRequest` all have **zero** occurrences in the normative schema. OpenKnowledge 0.55.2 runs that handshake and holds sticky session state the revision forbids. | [`findings/05`](findings/05-mcp-spec-and-the-tool-boundary.md) |
| 24 | **The spec takes no position on tool-versus-MCP.** It defines a wire protocol between two processes and has no concept of an in-process tool. The principal's split — regular tools for what Ambient builds, MCP for user-added extension — cannot be wrong on the spec. | [`findings/05`](findings/05-mcp-spec-and-the-tool-boundary.md) |
| 25 | **Four of the six shipped types earn their place; none has a field list that fits.** `Commitment` is the densest and worst-shaped — of 8 real commitments in one traced window, **0** had a self-contained `what`, **0** had a date, **0** closed explicitly. `Person.numbers` has **10 possible values corpus-wide and all ten are conference dial-ins**, while 43 email addresses appear in text with no field to hold them. | [`findings/06`](findings/06-what-the-corpus-holds.md) |
| 26 | **`Meeting` is the missing type**, and it is exactly what an email assistant never needs — email gets a calendar as its own structured Source; WhatsApp has only prose. 134 conference-link messages, 43 distinct join links, 12 mechanical call records. Then `Account`; `Transaction` was proposed and **rejected** as email-pa's `Price` trap in a new domain. | [`findings/06`](findings/06-what-the-corpus-holds.md) |
| 27 | **The mechanical/reasoning line runs backwards in two places.** Which participant is the Principal is answerable by `grep` — *"You deleted this message."* appears on exactly **1** label ×25 against *"This message was deleted."* on **6** labels ×36, zero overlap — and the schema has nowhere to store it. Sticker-versus-screenshot is answerable by parsing a header. *Verified in the main session, not taken on trust.* | [`findings/06`](findings/06-what-the-corpus-holds.md) |
| 28 | **Wall clock is a guess, not arithmetic.** All 13,134 lines carry `zone: "Africa/Accra"` — the **exporter's** zone — against 16 self-reported locations spanning UTC+0 to +4, with **731 relative expressions against 19 absolute dates**. Resolving *"tomorrow"* to a date is reasoning. *Verified: `grep -o '"zone":"[^"]*"' \| sort \| uniq -c` → one value, 13,134.* | [`findings/06`](findings/06-what-the-corpus-holds.md) |
| 29 | **The 5.4% hole figure was mostly punctuation.** **381 of 703** holes are 512×512 WebP stickers, all captionless — strip them and it is **2.5%**. Hand-reading 78 media references across 600 messages, **0 of ~33 threads became unrecoverable**. The dark case is precise: **10 stretches in 18 months of two or more consecutive voice notes — 22 messages, 0.17%.** *Verified: 223 WebP blobs, **207** at 512×512 by VP8 header parse; `file` reports no WebP dimensions on this machine, so it was the wrong instrument.* | [`findings/06`](findings/06-what-the-corpus-holds.md) |
| 30 | **The closed field vocabulary has four limits the material exposes** — no `enum[]`, no time-of-day, no numeric form, no `ref` target constraint. | [`findings/06`](findings/06-what-the-corpus-holds.md) |

### Three defects, and two shapes the spike found

**Two defects on the MCP write path**, both now moot and both recorded because they are why
the decision went the way it did. `write` **silently drops empty arrays** — `aliases: []`
and `numbers: []` were passed and neither reached disk, leaving a `Person` missing two
required fields, which is the normal shape of a mechanical stub. And OpenKnowledge's
conventional `tags:` key is a **forbidden property** under `schema.yaml`'s closed vocabulary.

**One defect that still matters**, because the viewer stays: a non-atomic hand edit
registers a **phantom document** in OpenKnowledge's permanent removal ledger — measured with
`sed -i ''`, and reproducible by any atomic temp-file write. **Our writes must land as a
single `rename`.**

**Two shapes**, both found by a failing assertion in the spike, neither about validation:

- **A type does not give you its folder.** `Person` → `person/`, never `people/`. The
  mapping is declared, not derived.
- **Identity is `(type, name)`, not a path.** "Do not overwrite" by filename silently
  duplicates.

### What `design-slice` must resolve — carried, not asked

Neither is a question for the principal. Both are shape, and both are recorded here so step
2 cannot miss them.

**An Agent holds one skill; the plan needs many.** `AGENT_ENTRIES` is
`["agent.yaml", "SKILL.md"]` and `Agent.skill` is a single `string`
([`home/types.ts:124`](../../../src/modules/home/types.ts)), while a Chat gets a `skills`
**directory**. `namesItem` flags any undeclared entry, so `agents/<name>/skills/` would be
reported by `doctor` today. The knowledge-maker is an Agent and its passes become skills, so
this moves: `AGENT_ENTRIES`, `Agent.skill`, the template, and the unit read.

**`digest` reads "the window" and nothing says what a window is.**
[knowledge-flow.md](../../design/knowledge-flow.md) names the cadences —
*"per-chat digest, cross-chat weekly synthesis"*, [product.md](../../design/product.md) —
so the **layering is settled and is not a fork**. What is unset is the window's size, and it
is the one parameter the backfill cannot start without.

### `G2` is dissolved, not answered

It asked whether `ambient ontology query` belonged in this Slice, on the grounds that its
one example — *"commitments due < 2026-08-23 group by owner"* — was plausibly the whole
250-line budget. **It is 29 code lines and runs in 0.6ms over 1,200 documents.** The
question was a budget question and the budget turned out not to be scarce. Whether the hand
passes *need* aggregate reads is now a design matter, not a scoping one.

## Open

Each line carries an **id**, a **kind**, and what it waits on. `now` means dispatchable this
minute.

```
G1  grilling  now                        — Does KNOWLEDGE close before MEDIA?
G3  grilling  design.md § B3             — How much may the mechanical pass know?
G4  grilling  design.md § B4             — Does a knowledge claim have to cite its message?
```

**All three now anchor into something.** `G3` and `G4` were `after design` at the map and
each is now a heading in [`design.md`](./design.md) carrying its candidate shapes as code —
which is the whole reason step 2 runs before the frontier.
[`design-slice`](../../../.agents/skills/design-slice/SKILL.md): *"a `grilling` question that
cannot name a block of `design.md` is not finished."*

**Three remain, and all three are the principal's.** Eight were opened: six closed by
research, one dissolved by measurement, one — `T1` — answered by reading 14.63% of the
corpus.

**`G1` · grilling · now.** Does KNOWLEDGE close before MEDIA? The roadmap says MEDIA *"must
precede trusting the knowledge base"* but may land any time after IMPORT. **`T1` changed the
numbers this rests on**: the hole figure is **2.5%** once stickers are excluded, no thread in
the sampled 600 messages became unrecoverable, and the genuinely dark case is 22 messages —
**0.17%**. What is damaged is the *entity*, not the thread. Either this Slice stubs them at `status: unprocessed` and closes with a base it
does not yet trust, or the destination is wrong and MEDIA comes first. This decides what
*done* means.

**`G3` · grilling · [`design.md` § B3](./design.md).** How much does the mechanical pass
allow itself to know? Three shapes are written out there as code. The map framed this as
*"is a label-only Person acceptable"*; `T1` reframed it, because a script **can** prove which
participant is the Principal and `schema.yaml` has no field for the fact. The live question
is whether an Archive-built Person may carry something the ontology cannot hold — and if so,
whether the schema grows now.

**`G4` · grilling · [`design.md` § B4](./design.md).** Does a knowledge claim have to cite
the exact message it came from? Four shapes there, and one is **measured dead**: a
synthesized `${at}-${label}` key collides on 37 pairs. The real question the design surfaced
is whether the unit of provenance is a *message* at all, or the **window** a pass read —
which is what `digest` actually consumes.

## Fog

Real, in scope, and not yet sharp enough to phrase as a question. The test is whether it can
be *stated* precisely now, never whether it can be answered.

**One group chat is not a year of email.** The finding the whole design rests on came from
206 Documents and 18 Organizations across many counterparties. This is a single engineering
group, one organisation's orbit, 14 labels. Whether an ontology shaped against a sample of
one survives the second Source is not a question yet — and the principal has now named four
Sources, two of them GitHub, so the second Source is closer than this map assumed.

**What the derived index is for.** Its cost objection is gone — `index` is 36 code lines and
`query` 29. What remains is the question underneath: [knowledge-flow.md](../../design/knowledge-flow.md)
justifies it as answering *"every open commitment due before Friday, grouped by owner"*, but
`next` is already the queue, and nobody has yet run a pass that wanted an aggregate.

**What a "pass" is, as a unit of work.** `digest`, `synthesis` and `consolidate` are named
with cadences and a sentence each. What one run reads, what it may write, and how it knows
it is finished are undescribed — and the typed receipt that would answer it belongs to
HARNESS, which is out of scope. May dissolve entirely once one pass has been run by hand.

## Out of scope

Ruled beyond the destination. **Never graduates** — anything here comes back as its own
Slice or not at all.

- **MEDIA itself** — speech-to-text, vision, extraction. `○ off-path` and its own Slice.
  `G1` decides how KNOWLEDGE behaves in its absence; it does not pull it forward.
- **`now` as a live fold.** It folds over typed run receipts, and receipts arrive with
  HARNESS.
- **The consolidation loop.** A cadence needs LOOPS.
- **Automating any pass.** HARNESS, and building it now is the old repo's mistake.
- **The speaker, and disclosure.** `[open]` in [product.md](../../design/product.md); it
  *"becomes real the day the mouth arrives."*
- **An MCP server of our own.** Still the stated end goal, and still later — nothing
  consumes one yet, and ADR 007 makes it a smaller problem by removing the client it would
  have replaced.
- **GitHub as a Source.** Named by the principal, absent from the model, and not reachable
  from one Archive. Recorded above as a gap in [product.md](../../design/product.md).
- **A second Source or a second chat.** One Archive is what the roadmap says unblocks this.

## Gate — the map's own

[`slices.md`](../../rules/slices.md) step 1 is met when every open question is either kinded
or in the fog.

| Row | State |
|---|---|
| Destination named, and what it must never get wrong | ✅ five, ordered by unrecoverable damage |
| Every open question carries an id, a kind and what it waits on | ✅ four — 1 `task`, 3 `grilling` |
| Fog is stated, not pre-cut into questions | ✅ three patches |
| Out of scope agreed, not asserted | ✅ agreed at the alignment gate, 2026-08-20 |
| `research` dispatched only behind the gate | ✅ `R1`–`R2` after the chart `y`; `R3`–`R5` after the principal re-opened the premise |
| Nothing decided by the map itself | ✅ the one decision this Slice has taken is the principal's, recorded as [ADR 007](../../adr/007-knowledge-is-files-not-a-client.md) |
| Every number names its instrument | ✅ inline, including the one **inference this map withdrew** |

The next step is [`design-slice`](../../../.agents/skills/design-slice/SKILL.md) — **not**
grilling. `G3` and `G4` wait on it by construction; `T1` and `G1` do not require it but are
better asked with a shape on the table.
