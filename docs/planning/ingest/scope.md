# INGEST — scope

Mapped 2026-08-18, step 1 of [`slices.md`](../../rules/slices.md). **It decides nothing.** It
records what is on disk, what `whatsappd` actually exposes, and what this Slice must not get
wrong — so that [`design-slice`](../../../.agents/skills/design-slice/SKILL.md) has something
to build a shape against and the principal has something to react to.

The previous INGEST map was deleted on purpose. It was written under the old five-step rule,
before Design was a step, and four of its five `grilling` questions asked whether something
was in the Slice — sizing work nobody had designed. Nothing below is inherited from it;
every number here names the instrument that produced it.

**Fact and inference are separated on purpose.** A number measured today is marked *measured*
with its instrument. A number carried in from an earlier document keeps its date and its
source. A thing reasoned to is marked *inferred* and is never in the same sentence as a
measurement.

---

## Destination

**A paired WhatsApp Live account produces Transcript lines and Blobs in the same home IMPORT
writes to, through the same Write path — and keeps producing them, behind a durable Cursor,
so a restart neither replays nor skips.** Raw only: no interpretation, no knowledge, no model
call.

Reaching the end of this Slice looks like: a credential paired **once**, its one-shot full
sync **landed on disk and countable against the source**, `ambient` reading a conversation it
never imported, and a `channel` module that hides `whatsappd` entirely.

**What it must never get wrong**, in the order the damage is unrecoverable:

1. **Lose the one-shot.** A full history sync rides the registration node and can be asked
   for exactly once per credential ([ADR 003](../../adr/003-history-import-is-an-archive.md)
   amendment 2). A tool that reads 43,334 messages into memory and exits has destroyed them.
   That already happened once, to that exact number.
2. **Claim presence it did not have.** A fact from a history batch is *known*, never
   *witnessed* — ADR 003 decision 5, and [CONTEXT.md](../../../CONTEXT.md)'s **Provenance**.
3. **Duplicate or contradict what IMPORT already wrote.** 13,134 Transcript lines exist on
   disk today and every one of them is `from: "archive"`.
4. **Read a conversation nobody opted in to.** An **Allowlist** is opt-in per conversation and
   empty means nothing is read.

## Decided

One line per answer, pointing at whatever holds the detail. Nothing here is re-litigated.

| # | Answer | Held by |
|---|---|---|
| 1 | **History Import reads an Archive. Continuous Ingestion reads a Live account.** | [ADR 003](../../adr/003-history-import-is-an-archive.md), decisions 1–2 |
| 2 | **Two Readers, one Write path.** Neither Reader writes on its own. | ADR 003 decision 4, [seams.md](../../design/seams.md) |
| 3 | **That is measured, not reasoned.** A live reader that does not durably write lost 43,334 messages when its process exited — 2026-08-17, `pair-page` run, home `proofs/verify-091339`. | ADR 003 amendment 2 |
| 4 | **A full sync is one-shot per credential**, and `verify-091339` has spent its one. | ADR 003 amendment 2 |
| 5 | **The Archive/Live boundary is a cut, never a merge.** The Readers share neither sender identity nor media text, so key matching would invent both misses and matches. | ADR 003 amendment 3 |
| 6 | **`transcript` already declares the Live line shapes** — `LiveMessage`, `LiveReaction`, `LiveWho`, `LiveMedia`. | [`transcript/types.ts`](../../../src/modules/transcript/types.ts) |
| 7 | **`channel` already has a `seams.md` row** — *"read a Live account → Message values; send, pre-bound to one Chat. **Hides `whatsappd` entirely.**"* — so `new-module` will not refuse it. | [seams.md](../../design/seams.md) |
| 8 | **`home` already grants the two Places `channel` needs** — `chat.transcript()` and `chat.media()`, both annotated `→ channel`. `channel` never builds a path. | [`home/types.ts`](../../../src/modules/home/types.ts) |
| 9 | **Use `whatsappd`; do not rebuild.** 12,522 lines of TypeScript already Aaron's, hidden behind one module so replacing it later is one seam. | [intake/scope.md](../intake/scope.md) |
| 10 | **Media has four declared states**, each a distinct remedy: `NoHandle`, `Expired`, `Failed`, `NeverDriven`. | [CONTEXT.md](../../../CONTEXT.md), [intake/scope.md](../intake/scope.md) |
| 11 | **The Allowlist is derived, not enumerated** — seed by name and topic, expand to the people who speak there, exclude `status@broadcast`. | [intake/scope.md](../intake/scope.md) |
| 12 | **The pairing screen's values already exist as typed `whatsappd` statuses**; nothing renders them. Scoped out below, not forgotten. | [intake/scope.md](../intake/scope.md) |

### Answered by the frontier — 2026-08-18, same day

`R1`, `R2` and `R3` were dispatched AFK at the top of this map and all three reported.
Their answers are Decided; the full evidence, cited `file:line` against `whatsappd` at
`97e4d60`, is in [`findings/`](findings/).

| # | Answer | From |
|---|---|---|
| 13 | **Durability is per batch, and the un-durable backlog is unbounded.** One `messaging-history.set` → one `conversation_sync` → one `accept()` → **one libSQL write transaction**. Above that sits an in-memory FIFO that orders but never coalesces and never backpressures. Everything WhatsApp has delivered and whatsappd has not yet accepted **dies with the process** — and Baileys has already acked each chunk, so none of it comes back. | [01](findings/01-durable-full-sync.md) |
| 14 | **Media is downloaded and stored inside acceptance, strictly serial, unthrottled.** Deferring it is type-impossible: a `DurableMedia` is `stored` with a ref or `failed` with a reason, decided there. So **the depth of that unbounded queue is set by CDN round-trip time**, one message at a time. | [01](findings/01-durable-full-sync.md) |
| 15 | **`seq` is gapless and monotonic; `revision` moves independently.** A second process can read the accepted log by `seq` while the writer holds the lease — WAL read transaction, fencing gates `accept()` only. Untested cross-*process* here: every repo test is same-process. | [01](findings/01-durable-full-sync.md) |
| 16 | **A handler rejection is terminal, and the batch is dropped.** Not swallowed, not logged, routed around the reconnect branch to `failTerminal`. Since the full-sync request rides the pairing registration node, reconnecting cannot re-ask — **so one rejected batch loses the whole remainder.** | [02](findings/02-handler-backpressure.md) |
| 17 | **No timeout can reach a running handler**, and on a fresh full-history pairing `syncGraceMs` is never armed at all. A slow consumer buys memory pressure and a late `online`, not a stall. | [02](findings/02-handler-backpressure.md) |
| 18 | **The runtime path adds a second way to lose a batch**: the account lease defaults to a 30 s TTL, and a handler that outruns it has its batch rejected. It also unsubscribes *before* it stops the session. | [02](findings/02-handler-backpressure.md) |
| 19 | **`authoritative_replacement` is never produced.** All five sources are hardcoded `{mode: "upsert"}`; whatsappd's own projection *throws* on the replacement branch. **An append-only consumer has no retraction to handle** — the only delete anywhere is contact-record consolidation, never a message. | [03](findings/03-sync-payload.md) |
| 20 | **A history batch's `updates[]` can carry a revoke for a line in the same batch.** Easy to miss: it is the batch's fifth member and it also carries receipts, reactions, edits and poll votes. | [03](findings/03-sync-payload.md) |
| 21 | **`live: false` is reliable.** `live: true` is produced at exactly one site, inside the `type === "notify"` guard, and offline catch-up arrives as `conversation_sync` with `source: "unknown"` — never on the plain message handler. | [03](findings/03-sync-payload.md) |

**Together 13, 14 and 16 are the shape of the risk**, and they are worse than the sum: a
serial, unthrottled media download sets the queue depth, an unbounded queue holds
un-durable messages, and any single rejection inside it is terminal and unrepeatable. The
guardrail *"do not spend a pairing on a tool that does not durably write"* now has a
mechanism under it rather than an instinct.

### Answered by the principal — 2026-08-18, after reading the design

| # | Answer | Closes |
|---|---|---|
| 22 | **The Archive is the full-history source; the Live account is the current one.** An Archive of a chat carries that chat's *whole* history — the oldest Instant on disk is where the group began, not where the export truncated. It is less reliable per message (a display label, no message id, a Wall clock), and that is the trade it exists to make. So the Live account **never needs to reach back**, and ADR 003 amendment 3's cut now has a reason rather than only a rule. | `G1` |
| 23 | **INGEST is a mirror. It is done when it has mirrored.** Not one Chat, not the seed. `whatsappd` already holds the messages; the job is to get it the full history and then put that on disk in our folder-and-JSONL shape. | `G2` |
| 24 | **The credential lives inside `~/.ambient`.** | `G4` |
| 25 | **Device slots are not a constraint** — one can be freed on demand. The one-shot is still one-shot; it is simply no longer scarce. | `T1` |
| 26 | **Explore an Ambient backend adapter before accepting the paging design.** `whatsappd` takes a pluggable `WhatsAppBackend`; if ours can write our format directly, the second database and the paging step both disappear. Dispatched as `R4`. | opens `R4` |

**One question the principal asked back, and it is now his to be answered on:** *is backfill a
different thing from live ingestion, or the same thing at a different position?* It is not in
Open below because it is a **shape** question — it belongs to `design.md`, and the answer is
owed to him rather than by him.

### What is on disk today

*Instrument: `find`, `wc -l`, and `JSON.parse` over every line of
`~/.ambient/chats/capxul-devs/transcript.jsonl`, 2026-08-18.*

```
chats                      1                  capxul-devs
transcript lines      13,134                  archive/message 13,083 · archive/event 51
                                              live/*                0
oldest Instant                                2025-02-14T16:06:10Z
newest Instant                                2026-08-17T07:31:27Z    <- the cut point
span                     549 days
Zone                                          Africa/Accra, uniform
media on lines                                Stored 1,139 · NoHandle 25
blobs                    980                  files under ~/.ambient/blobs
chat config                                   source: personal · peer: ""
global source `personal`                      kind whatsapp · mode ingest · allow: []
```

**Two of those lines are the whole reason this Slice is next.** `peer: ""` and `allow: []`
mean no Live account is bound to anything, and nothing would be read if one were.

### Two credentials already exist, and one of them is live

*Instrument: `sqlite3` table listing and `COUNT(*)` over copies of both files, 2026-08-18.
Read only; `.spike-private/` is gitignored personal data and nothing from it is committed.*

```
.spike-private/history/account/whatsapp.db
   wa_auth                3749        <- a LIVE linked-device credential
   (no other tables)                  <- and NO message store at all

.spike-private/history/account-stale-192151/whatsapp.db
   wa_auth                4997        <- superseded when the copy above reconnected
   wa_messages            2739        <- a real mirror, the thin 2026 one
   wa_chats                913
   wa_contacts            1560
   wa_accepted_batches    3440
```

**So the pairing question has a measured answer.** One file holds a live credential and no
data; the other holds real data and a dead credential. Reconnecting advances the linked
device's key state, which is why they are disjoint.

| To do this | A fresh pairing is | Why |
|---|---|---|
| Receive live traffic from now on | **not needed** | `account/` is a live linked device |
| Reach back ~364 days by `requestHistory` | **not needed** | measured 165 of 168 answered, 2026-08-17 |
| Ask for a `full` history sync | **needed** | the request rides the pairing registration node, and both credentials have spent theirs |

**And Decided 22 removes the last row's purpose.** If the Archive is the full-history source,
the Live account only has to cover what follows it — so INGEST may need **no new pairing at
all.** That is a consequence of the principal's own answer, and it is the largest
simplification available to this Slice.

### The defect this Slice closes

*Instrument: `grep -rn 'from: "live"' src/`, 2026-08-18. Four hits, two of them the type
declarations.*

```
src/modules/transcript/types.ts:72          the LiveMessage declaration
src/modules/transcript/types.ts:88          the LiveReaction declaration
src/modules/transcript/internal/store.ts:146   the deserialiser
src/modules/transcript/internal/store.ts:172   the deserialiser
```

**Only `transcript`'s own deserialiser ever builds a Live line.** Nothing originates one —
which is the empty middle column in [IMPORT's conformance table](../import/design.md), and
the row named at the foot of [`slices.md`](../../rules/slices.md) as the automation most
worth having. INGEST is the caller that makes those types real.

### What `whatsappd` exposes, traced

*Instrument: read of `~/projects/whatsappd/packages/whatsappd/src/index.ts` and the modules it
names, 2026-08-18, at `97e4d60` on branch `codex/fix-release-verify`. Read only — another agent
works in that tree.* **It is not a dependency of this repo yet:** `package.json` has `yaml` and
`yauzl` and nothing else.

There are **two surfaces**, and which one `channel` binds to is the shape question step 2 owns:

| | `createSession` | `createWhatsAppRuntime` + `libsqlBackend` + `fileMediaStore` |
|---|---|---|
| Durable | **nothing** | accepted source log + current mirror + media store |
| Cursor | none | `AcceptedWhatsAppBatch.seq`, *"a source consumer's cursor"* |
| Lease | none | `AccountLease` with an ordered `fencingToken`; two workers per account fail closed |
| Media | `MediaHandle.download()`, expires | `DurableMedia` — `stored` with a `ref`, or `failed` with a reason |
| What the spikes used | **this one** | never exercised |

The values that would become Transcript lines are already protocol-free types:
`InboundMessage` (a closed union with an `unsupported` catch-all), `WhatsAppAddress`
(`{id, mode: "lid" | "pn", alt?}` — which is exactly `LiveWho`), `ConversationSyncBatch`
carrying `chats`, `contacts`, `messages` and a `ConversationSyncContext` naming its `source`
as one of `initial_bootstrap · recent · on_demand · full · unknown`.

**The interface `channel` has to hide is small; the operational contract underneath it is
not.** That gap is what the three research questions below are about.

## Open

Each carries an **id**, a **kind** and **what it waits on**. `now` means dispatchable this
minute.

```
R1  research   ANSWERED         — findings/01-durable-full-sync.md   → Decided 13, 14, 15
R2  research   ANSWERED         — findings/02-handler-backpressure.md → Decided 16, 17, 18
R3  research   ANSWERED         — findings/03-sync-payload.md        → Decided 19, 20, 21

T1  task       ANSWERED         — slots are not a constraint; one can be freed. And the
                                  measurement above shows a live credential already exists,
                                  so INGEST may need no pairing at all. → Decided 25

R4  research   now              — Can Ambient implement whatsappd's WhatsAppBackend so the
                                  runtime writes our JSONL and Blobs directly, with no second
                                  database and no paging step?
                                  → findings/04-ambient-backend-adapter.md

S1  spike      now              — Push a recorded batch of Live-shaped values through the
                                  EXISTING `writeTranscript` path against a temp home, and
                                  measure lines/second and bytes. No credential, no socket.
                                  Nothing has ever produced a Live line; this is what proves
                                  the Write path accepts one before a pairing is spent.
                                  Sharpened by R1/R2: also time a durable write against the
                                  30 s lease TTL, and exercise a handler that REJECTS —
                                  whatsappd has no test for a slow or throwing
                                  conversationSync handler, so ours is the only evidence.

S2  spike      after T1, S1     — The 353 transport failures against 22 expiries (2026-08-16,
                                  one run): does a retry pass clear them, or are they loss?
                                  Needs a live socket, so it costs a slot.

G1  grilling   design.md § State and failure
                                — Live lines OLDER than 2025-02-14T16:06:10Z: written, or is
                                  the Archive authoritative for its own span? The Cursor is
                                  seq-ordered, not time-ordered, so this is a filter in
                                  `channel.readFrom` or it is nothing.

G2  grilling   design.md § The caller
                                — `--into <slug>`, one Chat at a time, is what the caller
                                  sketch does. The alternative is a verb with no `--into`
                                  that walks every Chat whose Peer is in `allow`. One is
                                  provable now; the other is what the seed needs.

G3  grilling   design.md § Branch point 3
                                — Nothing can signal that a one-shot sync is finished:
                                  silence and exhaustion are indistinguishable. A quiet
                                  window that is too short ends it early, and early is
                                  unrecoverable. Who makes that call — a timer, or you?

G4  grilling   design.md § Branch point 1
                                — A Source's credential, log, mirror and media are
                                  per-Source and the home has nowhere for them. A fourth
                                  `home` unit alongside chat and agent, or one property like
                                  `home.blobs` with `channel` joining the name itself?

G5  grilling   design.md § Branch point 2
                                — What the Cursor is: a file beside the Transcript, `seq`
                                  carried on the Transcript line, or no Cursor at all —
                                  re-read the log every run and let the Write path dedup.
```

**Eight remain; two are startable now** — `T1` and `S1`. The three `research` questions
answered the same day they were fired, which is what AFK and parallel is for. `S2` waits on a
fact (`T1`) and on the Write path being proven (`S1`).

**`G4` and `G5` did not exist before step 2**, and that is the step working: they are places
the shape depends on something undecided, found by writing the caller. Every `grilling` line
now names a block of [`design.md`](./design.md), which is
[`slices.md`](../../rules/slices.md)'s step-2 gate — a question that cannot name one either
belongs back here in the map, or means the design stopped early.

## Fog

Real, in scope, **not yet sharp enough to phrase**. Not pre-cut into question-sized pieces —
one patch may graduate into several questions, or none.

- **Where account-level material lands.** Contacts, aliases and groups are per-account, not
  per-Chat, and the home layout has nowhere for account-level material that is not knowledge
  ([intake/scope.md](../intake/scope.md) named this as the likeliest SKELETON revision).
  `R3` narrowed it: a `full` batch's contacts carry `{id, nativeIds, displayName?}` and
  nothing else, and group rosters never arrive on the history path at all — they come from
  `groups.upsert` or a live `groupMetadata(jid)` call.
  **A conflict is open and is not being resolved silently:** [intake/scope.md](../intake/scope.md)
  records *142 of 143 groups storing an empty `participants` array*, and `R3` finds from source
  that the key should be **absent**, because whatsappd reads a plural field the proto does not
  have. One of the two is wrong. It costs one query against the baseline to settle and nothing
  downstream turns on it yet, so it stays here rather than becoming a question.
- **Which of the four Media states a live failure is, and when a retry is right.** `Expired`,
  `Failed` and `NeverDriven` are declared in [CONTEXT.md](../../../CONTEXT.md) and none of the
  three has ever had a producer. The question is not phraseable until a blob fails through our
  own code rather than through a spike's.
- **Gap-filling after an outage.** ADR 003 keeps `requestHistory` as the way Continuous
  Ingestion fills a gap; the roadmap's INGEST row does not name it. Whether the first pass owes
  a gap-filler at all depends on what the Cursor turns out to be.
- **Whether the reachable window slides forward and strands the middle.** Every depth
  measurement is one link on one day. This is the question that decides whether INGEST must run
  on a cadence — and it cannot be phrased until `R1` says what a *second* sync would even do.
- **The Peer binding.** `peer: ""` on the one Chat that exists, against 1,506 chats in the
  account (2026-08-17). Whether a Chat is bound by hand, by a derived slug, or by adoption
  reaches back into SKELETON's layout.

## Out of scope

Ruled beyond the destination. **Never graduates** — this is a scoping act, not a step on the
route.

| Ruled out | Why, and where it goes instead |
|---|---|
| **Speaking** — `mode: speak`, `session.send`, the Speaker | The roadmap's INGEST row is *"Raw only"*. MOUTH. |
| **Interpretation** — STT, vision, extraction, entities, the knowledge base | MEDIA and KNOWLEDGE. INGEST produces Transcript lines and Blobs and stops. |
| **Ambient's own scheduling** — triggers, cadences, the job runner, the `work` module | LOOPS, and it is where Effect lands. `whatsappd`'s **own** `AccountLease` is INGEST's to *use*, never to rebuild. |
| **Identity merging and the non-decidable queue** | KNOWLEDGE. INGEST records `witnessed`/`asserted` as it finds them and merges nothing. |
| **The pairing screen** | INGEST's destination is durable lines on disk. Every value the screen renders is a `whatsappd` status that already exists, so the screen can land any time after — and a screen cannot be built against a sync that has not been proven to write. The worked surface is kept in [intake/scope.md](../intake/scope.md); it is not lost, only later. |
| **Re-opening ADR 003** | History Import reads an Archive. Amendment 2 closed reach as an argument *by choice, not by evidence* — read that paragraph before being tempted. |

---

## Gate — the map's own

Not the Slice's gate; the Slice's gate is written at step 4. This is
[`slices.md`](../../rules/slices.md) step 1's: **the destination is named, and every open
question is either kinded or in the fog.** Both hold.

**Step 2 is done** — [`design.md`](./design.md) holds the caller, the call graph, the
interfaces read off it, the seam delta for `channel` and `ingest`, both state-and-failure
sequences and three branch points. The next step is **3, working the frontier**, and the five
`grilling` questions now each have a block of code to be asked in front of.
