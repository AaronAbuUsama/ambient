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

### Answered by S2a — and it retracts a number this repo has repeated all day

Evidence: [`findings/06`](findings/06-media-failure-classification.md), and the base rate below
was re-run here rather than taken on the spike's word.

**The claim, as it has stood since 2026-08-16:** *"attempted 728, landed 343, failed 375 — of
which 353 transport failures and 22 EXPIRED/GONE"*, and from it, *"expiry is real but rare."*

**It is noise, and it is provably noise.**

*Instrument: substring counts over the 375 failure keys in `.spike-private/history/summary.json`,
2026-08-18, with a nonsense token as a control.*

```
failure records                     375
  contains "404"                     14   3.7%
  contains "410"                      8   2.1%
  contains "777"  (control)          14   3.7%     <- identical to 404
  contains "313"  (control)          16   4.3%     <- MORE than 404
  labelled EXPIRED/GONE               22           == 14 + 8
  records carrying an HTTP status      0
```

The spike regexed the raw error message, which carries the **signed CDN URL and no status**, so
`404` and `410` were matching digit substrings inside a URL. A meaningless token matches at the
same rate. **`whatsappd`'s real classifier — an HTTP status off Baileys' Boom — landed at
`f225ee6`, 2026-08-17 10:58 UTC, the day *after* the run.**

**Correct reading: 375 unclassified failures.** Not 353 plus 22.

| # | Answer | From |
|---|---|---|
| 40 | **Today's classifier is real and status-derived**, not string-matched: `expired` (404/410), `throttled` (429), `unavailable` (5xx), `unknown` (no status, or anything else including 403). Only `throttled` and `unavailable` are retryable. | [06](findings/06-media-failure-classification.md) |
| 41 | **But under Shape B we would not see it.** The runtime discards the classified error in a bare `catch {}`, so a media failure reaches a durable record as `failed` with `download_failed` and **no status at all**. Calling `download()` directly keeps the typed error; going through the runtime does not. | [06](findings/06-media-failure-classification.md) |
| 42 | **There is no media rate limiting anywhere.** `pacer.ts` has exactly one call site and it is outbound `send`. Media is serial *by accident* — a `for … await` loop inside `accept()` — with no cap, no gap, no backoff and no retry. That is the likeliest mechanism behind a 48% failure rate on a live CDN. | [06](findings/06-media-failure-classification.md) |
| 43 | **Retry from stored state stays type-impossible**, and the documented "transparently re-uploads expired media" **never fires** — Baileys gates it on a field the error object does not carry. Only redelivery recovers a blob. | [06](findings/06-media-failure-classification.md) |
| 44 | **`S2b`'s experiment is now concrete**, and it is one run rather than a fishing trip: drain the same media set **twice, paced and unpaced**, reading the typed error. **If the failure rate collapses under a ~200 ms gap, it was throttling.** Bucket on `reason` and status; write no signed URLs to disk. | [06](findings/06-media-failure-classification.md) |

**What this costs the design.** Decided 41 is a genuine constraint on the shape already chosen:
Shape B routes media through the runtime, so Ambient sees `failed` and not *why*. Either `ingest`
accepts that a failure is unclassified, or `channel` wraps the download itself. **That belongs in
step 4**, with the `transcript` corrections from `S1`.

**And the standing lesson fired again, on me.** *State the instrument with every number.* The
instrument here was a regex over a signed URL, nobody wrote that down, and the number was
repeated in four reports to the principal before anyone asked what produced it.

### Answered by S1 — the Write path, measured 2026-08-18

The first thing that has ever produced a `from: "live"` line. Synthetic values, a temp home, no
socket, `~/.ambient` untouched. Evidence: [`findings/05`](findings/05-live-line-write-path.md);
throwaway code in `.spike-private/live-line/`, gitignored and uncommitted.

| # | Answer | Instrument |
|---|---|---|
| 35 | **It accepts a Live line.** 1,000 synthetic lines round-tripped through `openHome → chat.transcript() → writeTranscript → readTranscript`: **1000/1000 value-identical**, nothing dropped or coerced. | the spike, 2026-08-18 |
| 36 | **Batch size is the whole performance story, and it is now a number.** 372,721 lines/s batched — 50,000 lines in 134 ms, 284.1 B/line — against **10 lines/s** one line at a time, because `writeTranscript` reloads the entire file per call. An account-sized ingest is **≈37 min at batch 1 and 2.12 s at batch 1,000.** | the spike, M1 Pro, Node v24.19.0, APFS |
| 37 | **The Archive-shaped dedup key holds for Live lines** — the sharp case is safe. The Live key is the message id, so two messages with identical text in the same millisecond stay two lines. | `internal/key.ts`, exercised |
| 38 | **Every failure is a value.** 8 of 8 induced failures returned `{problems: […]}`; nothing threw. A torn last line self-heals on the next write. | the spike |
| 39 | **Reactions are an append-only log, never collapsed to state.** Add, change, another reactor and removal are four lines; a removal appends `emoji: null` and supersedes nothing. | the spike |

### Three defects in shipped code, and the design claim they falsify

**All three are Live-only and none has ever fired**, because nothing has ever produced a Live
line — so nothing on disk is corrupted. They become real the day INGEST ships, which is what
running a spike before a pairing is for.

*Verified by reading [`transcript/service.ts`](../../../src/modules/transcript/service.ts)
directly, not taken from the spike's word.*

| # | Defect | Where |
|---|---|---|
| **D2** | **Silent data loss, reported as success.** `merged` requires `from === "archive"` on **both** sides, so for a Live line it returns `incoming` unconditionally. A re-delivered line whose media is `NeverDriven` **overwrites** a stored line whose media was `Stored` with a hash — and the call reports `written: 0`, which reads as "nothing happened". | `service.ts:12` |
| **D1** | **Every replay rewrites the whole file.** Change detection is `JSON.stringify(stored) !== JSON.stringify(next)`, and the stored side comes from the deserialiser while the incoming side comes from the caller. **Key order alone sets `changed`** — measured on 638 of 1,000 lines, because `types.ts:77` declares `text` before `msgKind` and `store.ts:171` rebuilds them the other way round. | `service.ts:65` |
| **D6** | **A lost write, with both callers told they succeeded.** `load()` … `replace()` is a read-modify-write with no lock; an append landing between them is gone. | `service.ts:65`, `:73` |

D1 and D6 compound and are **one fix**. A fourth, smaller: two copies of one message id **inside
a single batch** are both written — correct for an Archive, where two identical messages in one
second really are two messages, and wrong for a Live account, where a repeated id is always a
re-delivery.

**The design claim this falsifies.** [`design.md`](./design.md) § Interfaces says `transcript`
is **unchanged** — *"`transcript` gains nothing, and that is the headline."* **That is now
false**, and the correction belongs in step 4, where the spec is written and the design is
re-read against the answers. `transcript` gains work: the merge rule must cover Live, change
detection must stop being key-order-sensitive, and either the write becomes safe against a
concurrent caller or `ingest` must establish that it is the only one.

### Answered by the principal — the boundary I had wrong

| # | Answer | Closes |
|---|---|---|
| 33 | **Keep `whatsappd`'s own store and read from it.** Shape B. The recommendation was accepted on the ground that `accepted(accountId, afterSeq)` is the seam `whatsappd`'s own ADR-0014 calls *"the Ambient Brain boundary"*, and that the mirror is not overhead — it **is** the dedup, the ordering buffer and the paging anchor. | `G6` |
| 34 | **The Transcript and the WhatsApp interface are two different things, and I had conflated them.** The Transcript is **knowledge material** — it exists so a knowledge base can be built, and it may hold messages from an account Ambient does not even live on. **`whatsappd`'s mirror is the actionable store** — sending, reacting, editing, revoking. They are not two copies of one thing; they are two stores with two jobs. | the `LiveMessage` "defect" |

### Which retracts the defect I reported one message earlier

I reported that `LiveMessage` carrying neither `fromMe` nor the key participant was **a hole in
the line format**, because a message Ambient wrote down could never be acted on.

**That was wrong, and the error was mine: I assumed one store had to serve both jobs.**

*Instrument: `MessageRecord` in `whatsappd/packages/whatsappd/src/runtime/contracts.ts` — its
identity is `(accountId, chatId, messageId)` and it carries `ref: MessageRef` in full.*

A Transcript line carries `id`, and `chatId` is the Chat folder it sits in. **`(chatId, id)` is
already the key into the mirror**, and the mirror holds the complete `MessageRef`. Nothing is
missing. Acting on a message is a mirror read, and the Transcript never needed to be able to do
it.

**And the two answers reinforce each other.** Under Shape C there would be no mirror, so the
hole would have been real and the fields would have been necessary. Keeping `whatsappd`'s store
is what makes the Transcript free to be *only* knowledge material.

**No ADR 004 amendment is owed.** The line shape stands as designed.

**One thing this does put on the record for step 4:** the two-store split is a product statement
and it currently lives nowhere. [`product.md`](../../design/product.md) is its home —
[`language.md`](../../rules/language.md)'s one-statement-one-home table decides that, not this
file.

### Answered by R4 — the adapter, 2026-08-18

The principal's own idea, and it deserved the pass: `whatsappd` takes a pluggable
`WhatsAppBackend`, so if ours wrote our format directly, the second database and the whole
paging step would disappear. Full evidence, cited `file:line`, in
[`findings/04`](findings/04-ambient-backend-adapter.md).

| # | Answer | From |
|---|---|---|
| 27 | **It is a genuine third-party interface, and a write-only store is viable.** The runtime makes exactly two internal data-store calls during a pair-and-sync — `accept()` and `claim()`. `snapshot`, `messages` and `read` are handed *outward*, never called inward, so an adapter that cannot answer them is legal **provided we never build a `WhatsAppClient`.** | [04](findings/04-ambient-backend-adapter.md) |
| 28 | **`ref` can be our own SHA-256.** Exactly one function anywhere parses a ref, and it lives inside `fileMediaStore`; the only validation is a non-empty string. `blobs.put` already streams with backpressure and returns a hash. | [04](findings/04-ambient-backend-adapter.md) |
| 29 | **`fileStore()` is usable unchanged for the credential** — one `store.json`, 0700/0600, atomic rename, serialized. Point it at a `Place` and Decided 24 is satisfied with no new code. | [04](findings/04-ambient-backend-adapter.md) |
| 30 | **But the adapter relocates the mapping step rather than deleting it**, and it costs three things `whatsappd` already does: message **dedup** (the keyed mirror read *is* the dedup), the **out-of-order buffer** for an edit or revoke that arrives before its target, and the **`requestHistory` anchor**, which needs each chat's oldest stored message. | [04](findings/04-ambient-backend-adapter.md) |
| 31 | **`whatsappd` already built a seam for Ambient, and it is the other one.** `accepted(accountId, afterSeq)` has **zero production call sites** in that repo — its ADR-0014 names it *"the Ambient Brain boundary"*, and its standing decisions say Ambient follows accepted batches. The design we were about to bypass is the one its author intended us to use. | [04](findings/04-ambient-backend-adapter.md) |

### The defect R4 found in a file this Slice was not going to touch

*Instrument: `grep -n "fromMe\|keyParticipant" src/modules/transcript/types.ts` — no matches —
against `MessageRef` in `whatsappd/packages/whatsappd/src/model/outbound.ts`, 2026-08-18.*

To react to, edit, revoke or page back from a message, WhatsApp requires a `MessageRef`:

```
MessageRef = { id, chatId, fromMe, participant? }
```

`LiveMessage` in [`transcript/types.ts`](../../../src/modules/transcript/types.ts) carries
`id`, and `chatId` is implicit in the file path. **It carries neither `fromMe` nor the key
participant.**

**So a Live line read back out of our own Transcript cannot be turned into a `MessageRef`** —
Ambient could never react to, edit, revoke or page back from a message it had written down.
This is true **whatever backend we choose**; it is a hole in the line shape, not in the
plumbing.

It is the *"hard to change later"* case exactly: the Transcript is append-only and already
13,134 lines. Two fields cost nothing now and cost a migration later.
[ADR 004](../../adr/004-transcript-line-is-a-union-on-provenance.md) gains an amendment at
step 4 — never a silent rewrite, per [decisions.md](../../rules/decisions.md).

**Found before a line of code was written, by designing the caller.** That is the argument for
Design being step 2.

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

| 32 | **A fresh pairing is available on demand.** Confirmed 2026-08-18 after the credential measurement above: the one-shot stays one-shot, but it is no longer scarce. This unblocks `S2` — which needs a live socket — and keeps the `full` history sync on the table even though Decided 22 removed its necessity. | unblocks `S2` |

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

R4  research   ANSWERED         — findings/04-ambient-backend-adapter.md  -> Decided 27-31,
                                  and one defect in transcript/types.ts that no backend fixes

S1  spike      now              — Push a recorded batch of Live-shaped values through the
                                  EXISTING `writeTranscript` path against a temp home, and
                                  measure lines/second and bytes. No credential, no socket.
                                  Nothing has ever produced a Live line; this is what proves
                                  the Write path accepts one before a pairing is spent.
                                  Sharpened by R1/R2: also time a durable write against the
                                  30 s lease TTL, and exercise a handler that REJECTS —
                                  whatsappd has no test for a slow or throwing
                                  conversationSync handler, so ours is the only evidence.

S1  spike      ANSWERED         — findings/05-live-line-write-path.md -> Decided 35-39,
                                  and three defects in shipped transcript code

S2a spike      ANSWERED         — findings/06-media-failure-classification.md -> Decided
                                  40-44. The 22-versus-353 split was a regex over signed URLs

S2b spike      after S2a        — the retry pass itself. Needs a live socket and the principal
                                  at a phone, so it is HITL, not AFK.

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

G5  grilling   DISSOLVED        — there is no Cursor. Reading current state has no position
                                  to remember. See design.md § The caller, corrected 2026-08-18.

G7  grilling   design.md § The caller
                                — The caller refuses on `peer: ""`, and the account holds 1,506
                                  chats. How does a Chat get bound to one of them — by hand in
                                  config.yaml, and if so what lists them so a jid can be found?
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

**Cleared 2026-08-18 by the mirror correction.** Three of the five patches below existed only
because the design read the event log; reading current state dissolves them. What is left is one
question that graduated, and one measurement that settled itself.

| Patch | Now |
|---|---|
| **Where account-level material lands** — contacts, aliases, groups | **Out of scope, and already durable.** The mirror holds them (`WhatsAppSnapshot` carries `chats`, `contacts`, `contactAliases`, `groups`) and the mirror is the actionable store — Decided 34. KNOWLEDGE reads it when KNOWLEDGE exists. INGEST writes Transcript lines and Blobs and stops. |
| **Which of the four Media states a live failure is** | **Dissolved for INGEST.** Under a mirror read nothing is downloaded by us: `DurableMedia` is already `stored` with a ref or `failed` with a reason. What remains is a **mapping**, not a question — `stored` → `Stored`, `failed` → one of ours. Small enough to settle in the spec. |
| **Gap-filling after an outage** | **Dissolved.** If `whatsappd`'s store has a gap, closing it is `whatsappd`'s business — `requestHistory` against its own mirror. We re-read whatever is there. |
| **Whether the reachable window slides forward** | **Dissolved, same reason.** It is a question about `whatsappd`'s history depth, never about our projection. |
| **The Peer binding** | **Graduated to a question.** See `G7` below — it is now on the critical path, because the caller refuses on `peer === ""`. |

### The participants conflict, settled by measurement

*Instrument: `json_extract` and `json_type` over `wa_groups.data_json` in a copy of the baseline,
2026-08-18.*

```
groups 143 · key absent 0 · stored as an array 143 · empty 142 · with members 1
```

[intake/scope.md](../intake/scope.md)'s *"142 of 143 groups store an empty `participants` array"*
is **correct**. `R3`'s source-reading inference that the key should be **absent** is **wrong** —
the projection writes an empty array.

**Worth recording because it points the other way from the standing lesson.** Usually the
measurement is the thing to doubt. Here the measurement held and a careful read of the source
did not, because reading what a type *permits* is not reading what a projection *writes*.

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
