# INTAKE — scope

Scoped 2026-08-16 against the real iOS account database at
`~/projects/whatsapp-agent-tui/.proof-private/ios/whatsapp.db` (10 MB, the principal's own
WhatsApp, already paired). **This is a scope, not a spec.** It records what the data
actually is and what that forces; the spec comes after the open questions are answered.

---

## The finding that shapes everything

`whatsappd` holds two stores, and they do not cover the same time.

| Store | Span | Volume | Carries media refs |
|---|---|---|---|
| **Mirror** — `wa_messages` | **2022-06-27 → 2026-08-15** (4 years) | 2,739 messages | **No** |
| **Accepted log** — `wa_accepted_batches` | **2026-08-05 → 2026-08-15** (10 days) | 3,440 events, 273 of them messages | **Yes** |

The mirror is WhatsApp's own history sync, projected into rows. The accepted log is the
daemon's event stream, and only covers the days the daemon has been running.

**So the two operations `product.md` already names are not a stylistic split — they read
different stores.**

- **History import** (one-time) reads the **mirror**. Four years, no media.
- **Continuous ingestion** (ongoing) reads the **accepted log**, with `seq` as a monotonic
  cursor. Media refs present.

That is a much stronger justification than the one we had, and it means the two paths
cannot share a reader.

## What is actually in the account

```
wa_contacts         1,560     wa_chats            913     wa_groups          143
wa_contact_aliases  2,417     chats with messages 408     (362 DM · 46 group)
wa_messages         2,739     wa_accepted_batches 3,440
media blobs on disk   266
```

Messages by year: **2022: 23 · 2024: 79 · 2025: 169 · 2026: 2,468.** Ninety percent is this
year. The four-year span is real but nearly empty before 2026.

Message kinds:

```
text 1,869 · unsupported 298 · image 266 · video 142 · audio 78 · revoked 45
sticker 22 · document 16 · poll 1 · location 1 · contacts 1
```

**The graph is rich; the conversation history is thin.** 913 chats and 1,560 contacts
against 2,739 messages — roughly three messages per chat, and half the chats have no
messages at all. Day one, Ambient can know *who everyone is, which groups exist, who is in
them, and what someone is called across several identifiers*. It cannot know what was said
before 2026.

That is a correction to `thesis.md`'s cold-start claim, which assumed years of conversation.
It is true of people, not of conversations — and the people half may be the more useful one.

## Shapes

```
wa_messages          account_id · chat_id · message_id · timestamp · data_json
  data_json          accountId · chatId · messageId · sender{} · ref{chatId,fromMe,id}
                     · fromMe · timestamp · receipts[] · reactions[] · kind · rawType
                     · text            (text only)
                     · context         (text only — replies/quotes)
wa_chats             account_id · chat_id · data_json{isGroup, subject, lastMessageAt}
wa_contacts          account_id · contact_id · data_json{nativeIds[], displayName, imgUrl}
wa_contact_aliases   account_id · native_id · contact_id
wa_groups            account_id · group_id · data_json{subject, participants[]}
wa_accepted_batches  account_id · seq · from_revision · revision · events_json · patch_json
  event kinds        update 1,672 · contact 1,135 · message 273 · conversation_sync 245
                     · last_seen 40 · connected 34
```

Blobs: `.whatsappd-media/<accountHash>/<sha256>.bin`. The old repo addressed them as
`media:v1:<sha256>` refs taken from the **accepted log**, never from the mirror.

## What INTAKE produces

Raw only. No interpretation, no knowledge, no model call.

- `chats/<slug>/transcript.jsonl` — one line per message, both directions
- blob refs on the messages that have them; bytes in the content-addressed store
- the identity material — contacts, aliases, groups — landed somewhere KNOWLEDGE can read
- a durable cursor per source, so a restart neither replays nor skips

`home` owns every path. `channel` asks for a chat's `transcript()` and `media()` grants; it
never builds a path.

## Decisions taken

- **Use `whatsappd`; do not rebuild.** It is 14,705 lines, 198 merged PRs, and already
  Aaron's. `channel` hides it behind Ambient's own interface, so replacing it later is one
  module. Rebuilding on `baileys` would mean rediscovering the durable operation queue, the
  accepted log, account leases and the media store.
- **Pair fresh, and keep the existing database as a baseline.** The fresh pairing is the
  only thing that empirically answers "can more history be pulled"; the old database turns
  the answer into a measurement rather than an impression.

## Open questions — answered 2026-08-16

### 1. Can more history be pulled? **YES — and the first answer here was wrong.**

**Retracted 2026-08-16.** This section first concluded "no, both knobs are at maximum",
reading only `syncFullHistory` and the browser identity. That was shallow research and the
principal's own scepticism was correct: he knows his phone holds far more than 2,739
messages.

`syncFullHistory` is only the **initial dump WhatsApp volunteers on connect.** Paging
backwards is a separate, explicit operation — and `whatsappd` already exposes it:

```ts
// packages/whatsappd/src/session.ts:246
requestHistory(
  anchor: { readonly ref: MessageRef; readonly timestamp: number },
  opts?: { readonly count?: number },     // defaults to 50, the protocol maximum (ADR-0010)
): Promise<{ requestId: string }>
```

It is a first-class **durable operation** (`runtime/operation-executor.ts:110`), not a
side-channel. You anchor on the oldest message you hold and ask for fifty more, repeatedly.

The old repo had a `historyBackfillLimit` config key (`multipleOf(25)`), so it paged — but
boundedly, and 2,739 messages across 913 chats says it paged shallowly or not per-chat.

**So the ceiling is not WhatsApp's. It is how hard we drive `requestHistory`.** How deep it
actually reaches is now an empirical question, and it is the subject of the spike below.

#### Qualified again, same day — and this is the settled position

`whatsappd`'s own `docs/architecture/history-semantics.md` already ran this experiment on a
real account whose **primary is an iPhone**: `requestHistory` submitted 7 times, delivery
acknowledged every time, **0 answered**. Count, chat type and phone state were all varied
without effect. Upstream [Baileys #2452](https://github.com/WhiskeySockets/Baileys/issues/2452)
splits by primary-phone platform — reproduced on iOS, reported working on Android.

**The principal's real account is the iPhone one.** So:

- The paging mechanism **exists** — my first answer was wrong.
- The ceiling is **not** how hard we drive it — my second answer was wrong too.
- **The ceiling is the phone.** An iOS primary does not answer on-demand history requests.

Two wrong answers in opposite directions, both from reading one layer and stopping. The
lesson is in the standing correction at the foot of this document, and it now has a second
instance: `whatsappd` had already measured this and written it down.

**Expect INTAKE to be a one-time mirror read, not a long-running backfill.** The spike runs
a few hundred requests rather than seven to make that a confident zero rather than an
inherited one.

**Consequence:** every conclusion downstream of "the history is thin" is provisional. The
cold-start correction in `thesis.md` may itself need correcting once the spike reports.

### 2. Is historical media addressable? **YES — this answer was also wrong.**

**Retracted 2026-08-16.** The claim below rested on `history.ts` defaulting to
`noDownloader`. That is only the **pure-test default parameter**. The real socket wires a
live downloader:

```ts
// packages/whatsappd/src/baileys/socket.ts:471
const makeDownload = mediaDownloader(sock, logger);
// :538
toMessagingHistoryEvents(payload, selfAddress(sock), makeDownload)
```

History-synced messages therefore carry a working `media.download()`. The gap of **524
media messages against 266 blobs on disk** is almost certainly "the downloader was never
driven" rather than expiry — and that is now the spike's primary question, because unlike
the history question it is expected to *succeed*.

#### Corrected a third time 2026-08-16 — the gap is 63, not 258

**The "266 blobs" was one of two blob stores.** The baseline holds two disjoint
content-addressed trees, and every earlier count saw only the first:

```
.proof-private/ios/.whatsappd-media/<account>/<sha>.bin        266
.proof-private/ios/media/.whatsappd-media/<account>/<sha>.bin  495
                                       distinct shas, 0 overlap  761   (975 MB)
```

Counting files was the wrong instrument anyway — **761 blobs against 524 media messages**,
because 300 of them belong to no message in the mirror. The message row states its own
media state, and that is the measurement:

| `media.state` | count | carries |
|---|---|---|
| `stored` | **461** | `media:v1:<sha>` — **all 461 resolve to a file on disk, 0 missing** |
| `failed` | **63** | no ref at all; `reason: download_failed` for every one |

So **the gap is 63, and it was never 258.** Media is in far better shape than this document
has said at any point.

**And the 63 are `NoHandle`, not `Failed`.** No media row in the mirror retains a
`mediaKey` or a `directPath` — not the 63 failures, and not the 461 successes either:

```sql
SELECT state, SUM(mediaKey IS NOT NULL), SUM(directPath IS NOT NULL), COUNT(*) …
failed   0  0   63
stored   0  0  461
```

The projection discards the handle once it has used it. That places all 63 in the
**NoHandle** row of the media table below — *"we never recorded how to fetch it"* — and it
means the remedy is **not** the retry that `Failed` implies. Nothing in the mirror can
re-fetch them. They return only if WhatsApp *redelivers the message* with a fresh handle,
which is precisely what the `requestHistory` pass tests. **Media recovery and history depth
are therefore the same question, not two.**

*Method: `media.state` histogram over the baseline, plus a ref→disk join across both stores.
The baseline was copied out and queried; the original was never opened for writing.*

#### The original, wrong reasoning

`baileys/history.ts` defaults the download thunk to `noDownloader`:

```ts
makeDownload: (raw: WAMessage) => DownloadThunk = noDownloader
```

So history-synced messages carry no ref. It is a *default parameter*, not a hard rule — a
caller could pass a real downloader — so this is a lever, not a wall. But the volume makes
it moot:

```
media messages by year:   2022: 2 · 2024: 11 · 2025: 15 · 2026: 496
```

**496 of 524 media messages are from this year.** Twenty-eight historical items across four
years. Not worth engineering for.

### 3. What are the 298 `unsupported` messages? **Mostly protocol noise.**

```
protocolMessage 167 · reactionMessage 50 · unknown 26 · templateMessage 17
secretEncryptedMessage 15 · pollUpdate 7 · album 6 · interactive 4 · botForwarded 3 · pinInChat 1
```

**167 (56%) are `protocolMessage`** — system traffic, ignore. **50 are reactions**, which
already appear on their target message's `reactions[]` array, so they are duplicates rather
than lost content. The remaining ~81 are long-tail types.

**Verdict: ignore the class.** Record the count so the wiki can say what was skipped; do not
build parsers for the tail.

### 4. How many voice notes are historical? **Eleven.**

```
audio by year:   2024: 5 · 2025: 6 · 2026: 67
```

67 of 78 are from this year and have refs. **Eleven unfillable holes across four years.**
Record them as unreadable; do not chase them.

### 5–6. Deferred, and now less certain

Whether identity is ingested alongside conversations, and whether the mirror is read after
the first import, both depend on how much conversation history the spike recovers. If
paging reaches years back, the transcripts stop being secondary.

### 5–6 (original note)

Whether identity (1,560 contacts, 2,417 aliases) is ingested as well as conversations, and
whether the mirror is read at all after the first import, are now design choices rather than
unknowns — the data needed to decide them is in this document.

## What this is likely to move in SKELETON

One revision was budgeted when the home layout was decided without data. Candidates:

- **The chat ↔ source binding** (`source`, `peer`) — flagged in advance as most likely.
- **Where identity lands.** Contacts, aliases and groups are per-account, not per-chat, and
  the current layout has no home for account-level material that is not knowledge.
- **Slugs.** 913 chats, many of them groups with emoji and punctuation in the subject. The
  rule is `^[a-z0-9][a-z0-9-]{0,63}$` and something has to derive a slug from a subject —
  or chats are addressed by id and the slug is chosen by a human when a chat is adopted.

## Gate — draft

1. History import over the iOS mirror produces one `transcript.jsonl` per allowlisted chat,
   message counts matching the source exactly.
2. Running it twice changes nothing — idempotent on `message_id`.
3. Continuous ingestion advances a durable cursor; a kill mid-batch replays nothing and
   skips nothing.
4. An empty allowlist ingests nothing at all.
5. Media that has a ref lands in the blob store, addressed by hash, deduplicated.
6. Messages with no reachable media are recorded as such — never silently dropped, never
   implied to have been read.
7. `vp check`, `vp test`, `pnpm shape` green; `fallow dupes` no worse than 0.0%.

---

## Before the spec: a research pass and a spike

Agreed 2026-08-16, after the history finding. **Do not write the spec until this reports.**

The one wrong answer above was wrong because it was research by grep. Three of the four
"answered" questions rest on measurements taken from a database produced by a session whose
provenance we do not trust, and the fourth was simply mistaken.

### The spike

Pair fresh into a clean home, keep the existing database untouched as a baseline, and drive
the mechanisms deliberately:

1. **Page one chat to exhaustion.** Take a known high-traffic conversation. Call
   `requestHistory` in a loop, anchoring on the oldest message held, until it stops
   yielding. **Measure: how many messages, how far back, how many requests, how long.**
2. **Then page a second chat**, to learn whether depth is per-chat or account-wide.
3. **Drive media download explicitly.** The account holds 524 media messages and only 266
   blobs on disk — so even recent media is not fully downloaded. Find out whether that gap
   is the downloader never being driven, a failure, or an expiry.
4. **Voice notes specifically.** The principal reports several high-traffic chats each
   holding more voice notes than the 78 counted account-wide. Establish whether they arrive
   with paged history and whether their audio downloads.

### What it must produce

A number for each: messages recovered, oldest timestamp reached, requests needed, blobs
downloaded, voice notes recovered. Plus the cost — wall-clock and any rate limiting hit.

### Why it comes before the spec

INTAKE's shape depends entirely on the answer. If paging reaches years back, INTAKE is a
long-running, resumable, rate-limited backfill job over 913 chats, and that is a different
piece of software from a one-time read of a mirror table. **The spike decides which one we
are building.**

### Standing correction

`requestHistory` was in `whatsappd` all along and this document said the opposite. Read the
source before concluding a capability is absent — and when the principal says a measurement
contradicts what he knows about his own data, the measurement is the thing to doubt.

---

## The allowlist — derived, not enumerated

Settled 2026-08-16 with the principal, against the real account. **Not every chat is
ingested. 913 exist; roughly 31 matter today.**

### The rule

1. **Seed by name and topic, never by volume.** Volume ranking is wrong here — it surfaced
   `NewBee 🐝 Programmer` (658 messages, 24% of the corpus, a community the principal barely
   participates in and where **0 of 22 speakers are nameable**) while missing
   `THE CALL ADVISORY` entirely. Sync is thin and uneven, so message counts measure what
   WhatsApp happened to give us, not what matters.
2. **Expand to the people.** Every person who speaks in a seed group, and their DM.
   Measured: 20 seed groups yield 11 distinct speakers, and **all 11 have a DM** with the
   principal. The expansion is small, connected, and the only way to reach the people —
   237 DMs are nameless, and a nameless DM is identified by who its owner is *elsewhere*.
3. **Exclude `status@broadcast`.** 444 messages, 16% of the whole corpus, and not a chat.

### The seed today

```
THE CALL · THE CALL Team · THE CALL UX/UI · THE CALL ADVISORY
The Call - Weekly Checkins · Bug Reports · EXTERNAL DEV · INTERNAL DEV
Capxul Devs · Capxul April Launch
light:   Cpx · Check-ins
dropped: STORAGE · THE CALL DEV TEAM (no longer exists)
same:    Paynest IS Capxul Devs — renamed, one chat, not two. Corrected by the
         principal 2026-08-16; the earlier list double-counted it.
in:      the ~7 `X <> Capxul` partnership groups — settled, see the close of scoping below
```

### Two findings this depends on

**WhatsApp Communities are not modelled.** `wa_chats` carries only
`accountId · chatId · isGroup · lastMessageAt · subject`; `wa_groups` only
`accountId · groupId · participants · subject`. There is no parent, no community, no
linked-group field. "The Call is a community containing these groups" is **knowledge, not
data** — it must be inferred from names, told to Ambient, or asked. Which is the argument
for the queue below.

**Group participants are absent from history, but fetchable live.** 142 of 143 groups store
an empty `participants` array. That is a Baileys/protocol limit on the *history* path, not a
`whatsappd` gap — `toHistoryParticipants` maps them whenever they arrive, and
`groupMetadata(jid)` on a live socket returns membership. **One live call per seed group
recovers real membership**, which is strictly better than inferring it from who spoke. Add
it to the spike.

## The non-decidable queue

A product primitive, not an edge case. Established by measurement across both spikes:

| Residue | Count |
|---|---|
| People with no name anywhere | 207 |
| Identifier merges with no witness in traffic | 769 of 853 |
| DMs with no name | 237 |
| Community membership | not in the data at all |

None of this is a defect. It is what the source genuinely does not contain, and **no amount
of cleverness resolves it** — the principal simply has not saved those numbers, and WhatsApp
does not record which groups belong to a community.

So Ambient needs **a place for what it cannot decide, surfaced for the principal to settle
in a sentence.** Some of it an agent can resolve by reading intelligently and asking in the
chat; the rest has to be flagged and left.

This is `email-pa`'s `[assumed]` marker plus its generated *"Open questions — things a
person could settle in a sentence"* page, arrived at independently, from different data, in
a different domain. Two independent derivations of the same primitive is the strongest
evidence available that it is real. See
[../../history/research/email-pa-teardown.md](../../history/research/email-pa-teardown.md) §8.

---

## Settled at the close of scoping (2026-08-16)

**Partnership groups are in.** The `X <> Capxul` cluster — Sereel, Honeycoin, Base,
Blockradar, PT, Prembly, TCS — joins the seed. ~19 groups plus the DM expansion.

### Identity: record the provenance whatsappd discards

`whatsappd` merges identifiers into people and keeps no record of why
(`runtime/projection.ts:165-216` — transitive merge, `contactId = reachedIds[0]`, loser
deleted). Measured: **84 of 853 multi-identifier merges are witnessed** by a message
carrying both forms; **769 rest on the store's word alone**, and the alias table turns out
to mirror `nativeIds` rather than corroborate it.

They are probably correct. But *probably correct and uncheckable* compounds — every fact
Ambient later attaches to a person inherits the uncertainty silently.

So:

1. A person carries `identifiers[]`, each marked **`witnessed`** or **`asserted`**.
2. `asserted` is used, not quarantined — it only means a claim resting on it can say so.
3. **Never merge automatically from here.** Propose with evidence; confirm. `email-pa`'s
   rule, now with a measured reason rather than an instinct.
4. The genuinely sharp cases — 4 pushname-drift, 3 multi-lid, 18 ghost identifiers — go to
   the non-decidable queue. Dozens, not hundreds.

### Media: four states, each a declared error

WhatsApp does not store media; the CDN holds an encrypted blob and the message holds the
key. Two independent things can therefore be missing, and each is a distinct failure with a
distinct remedy — so each is a named value in `types.ts`, never a silent gap
([../../rules/errors.md](../../rules/errors.md)):

| State | What is wrong | Recoverable |
|---|---|---|
| **NoHandle** | the mirror row carries no `mediaKey`/`directPath` — we never recorded how to fetch it | no — our gap |
| **Expired** | key held, CDN has dropped the blob (404/410) | no — time |
| **Failed** | handle good, blob present, the fetch broke | **yes — retry** |
| **NeverDriven** | everything present, nobody asked | **yes — the expected case** |

A Media doc records *which*, so the knowledge base can say "this image existed and could not
be read, for this reason" rather than implying it looked and saw nothing. The same
discipline as `[assumed]`: record the uncertainty rather than hide it.

---

## The spike reported (2026-08-16, 05:23 wall clock)

Fresh pairing, reconnect on the stored credential, one chat paged to exhaustion.
**Baseline byte-identical afterwards. Zero refusals, zero throttles.**

### 1. `requestHistory` is NON-ZERO on an iPhone primary — the day's most important result

```
chat 120363428464069244@g.us
  recovered  419 messages      requests 17, of which 9 answered
  reached    2026-07-12        251s      then 8 consecutive silent replies
```

The credential confirms the primary is an iPhone (`creds.platform = "iphone"`), so this is
the case `whatsappd/docs/architecture/history-semantics.md` documents as silent. **It is not silent.** §1's settled
position stands corrected a third time, and this is the one that changes the build.

**But the depth is weeks, not years.** 419 messages reached back about five weeks and then
stopped dead — the mirror already held messages to 2022-06-27. Paging deepens a chat's
*recent* history; it does not open the archive. INTAKE is therefore a resumable,
rate-limited backfill **with a bounded floor**, not an unbounded one — and 17 requests for
9 answers, at ~28s each, is the cost line.

### 2. Media downloads — and expiry is real but rare

```
attempted 29   landed 26 (8.9 MB)   already had 1   failed 2
                                    of those 2: 1 EXPIRED/GONE, 1 transport failure
```

Only the 29 messages *redelivered this run* could be attempted, because the mirror keeps no
handle (see §2's third correction). Media is fetchable when it arrives with a fresh handle,
one blob in twenty-nine had already expired on WhatsApp's side, and **the 63 `NoHandle`
messages remain unrecovered** — reaching them means paging their own chats.

### 3. A passive reconnect adds almost nothing

420 delivered, 293 novel — but the sources say where they came from:

```
on_demand = 9 batches      unknown = 1
```

Every one of the 420 arrived through `requestHistory`. The 60-second settle window after
`online` yielded **one** message. **Reconnecting does not backfill; asking does.**

### Corrected by a second run the same day — `requestHistory` is a gap-filler, not a drill

Run 5 paged one chat and got 9 answers; run 6 paged two chats, from the mirror's own
oldest, and got **0 answers in 16 requests**. The difference is not the chat and not the
platform:

| | run 5 | run 6 |
|---|---|---|
| Initial history sync | **never completed** — killed mid-sync by the spin bug | **completed first**: 4,474 delivered, 3,704 novel, `source: "recent"` |
| `requestHistory` | 9 answered, 419 recovered | **0 answered, both chats stalled** |

**`requestHistory` returns what the initial sync has not already delivered, and nothing
more.** Run 5 had a hole to fill; run 6 had none. The reachable ceiling is identical either
way — it is a property of the account, not of how you ask.

So §1's "the history ceiling is the phone" was closer to right than run 5 made it look. The
capability exists and answers; it just cannot exceed the sync window.

### What the account actually contains

The mirror was never "2,739 messages back to 2022". Measured across the baseline:

| Per-chat history span | Chats (5+ msgs) | Messages |
|---|---|---|
| 1 year or more | **0** | 0 |
| 3–12 months | 6 | 66 |
| 1–3 months | 6 | 216 |
| **1–4 weeks** | 12 | **1,168** |
| under 1 week | 18 | 476 |

The 2022 date is one outlier chat. The busiest group holds **11 days**; the busiest DM holds
**5**. And the corpus is concentrated to a degree that settles the allowlist argument:

- **505 of 913 chats hold zero messages** (408 DMs, 97 groups) — empty shells.
- Of the 407 with any, **365 hold 1–4 messages**.
- **5 chats hold 1,170 messages — 43% of the corpus.** Fifteen chats hold 69%.

### Media and voice, from the run that actually had handles

A completed sync delivers media handles in bulk — 569 queued, against 29 in run 5:

```
attempted 728   landed 343 (315.6 MB)   already had 10   failed 375
failures: 353 transport ("FAILED"), 22 EXPIRED/GONE
voice notes landed 112        voice notes seen, 2026: 387
```

**The principal was right about voice notes.** The mirror counts 78 account-wide; a
completed sync surfaced **387 in 2026 alone**, and 112 downloaded. Question 2 of the spike
brief is answered, and the mirror's audio count was never the real number.

The 353 transport failures are **not** expiry — only 22 were. They need one retry pass
before any conclusion; a 48% failure rate on a live CDN is more likely throttling than loss.

### Still open — do not write these up as answered

- **The 353 transport failures.** Not classified as expiry, never retried. Until a retry
  pass runs, the media story has a 48% hole in it.
- **Group membership.** The `groupMetadata(jid)` call added to the spike at the close of the
  allowlist section was not exercised.
- **Whether a second, later sync deepens the window.** Every measurement here is one link on
  one day. Whether the reachable window slides forward and strands the middle — the question
  that decides whether INTAKE must run on a cadence — is untested.

### What it cost to learn

Three bugs in the spike, each of which produced a confident wrong number before it was
found: a `while (drainers < 4)` top-up loop that spun the process at 96% CPU and blocked
`whatsappd`'s event pipeline so the session could never reach `online`; a blob count taken
from the working copy instead of the baseline; and a file count used where a state histogram
was the right instrument. **The first was diagnosed as a protocol fault (515) and was not
one** — the sampler's stack decided it, not the reading. Same lesson as §1 and §2, third
occurrence in two days: *measure the layer you are accusing.*

---

## Pairing and first sync are one screen

Added 2026-08-16, out of the spike. **This is the first genuinely user-facing surface
Ambient has**, and it arrived by accident: `pair.ts` rendered its QR to the terminal, to
`qr.txt`, and to a `qr.html` it opened in a browser — built as a spike convenience, and it
turned out to be the shape the CLI needs.

A QR printed to a terminal is unscannable the moment the output is piped, and stale within
about twenty seconds. Every user of Ambient pairs once; this is the whole of their first
impression.

The principal, watching the spike pair and then sit there:

> *"it's syncing now but nothing's happening on the screen."*

**The socket knows all of it. Nothing renders it.** That is the entire defect.

### What the screen must show

1. **A QR that refreshes itself** as the code rotates, without a reload.
2. **Live status** — waiting → scanned → authenticating → syncing.
3. **Sync progress** — chats seen, messages arriving, oldest date reached.

### Every one of those is already a typed value

This is not new instrumentation; it is a subscription that nobody has written. `whatsappd`
already publishes each state the screen needs
(`packages/whatsappd/src/model/status.ts`):

| Screen state | The value it renders |
|---|---|
| waiting, with a live code | `phase: "pairing"`, `pairing.step: "challenge_live"` — carries `qr` **and `expiresAt`**, which is the refresh clock |
| scanned | `pairing.step: "restart_pending"` — WhatsApp confirmed, the expected 515 restart is pending |
| authenticating | `phase: "connecting"` / `phase: "authenticated"`, `sync.step: "draining"` |
| syncing, with a bar | `sync.step: "syncing"`, carrying `progress` |
| counts and oldest-date | the `conversationSync` batches, which is where the chats, contacts and messages actually arrive |
| stalled, not dead | `phase: "backing_off"` — carries `reason`, `retryAttempt`, `nextRetryAt` |
| dead, re-pair | `phase: "logged_out"` / `"suspended"` |

The `backing_off` and `logged_out` rows matter as much as the happy path: a first sync that
hits a retry currently looks identical to one that has hung, which is exactly the complaint.

### How it gets built

Per [../../rules/artefacts.md](../../rules/artefacts.md) it is **designed with `impeccable`,
not improvised** — theme-aware, self-contained, a local file. The rule exists because the
one artefact that skipped it was called *"absolute garbage"*, and this surface has a far
lower tolerance than a report: it is the first thing a user ever sees, and it is what they
stare at while nothing appears to happen.


---

## Measured 2026-08-17 — the mechanism, settled

The spike questions from the previous handoff are answered. Method and evidence are in
`.spike-private/history/page-*.{log,json}`; the decision they produced is
[ADR 003](../../adr/003-history-import-is-an-archive.md).

### Live paging works, and reaches one year

Driven against `Capxul Devs` with the **phone locked**, on a whatsappd patched for
[#207](https://github.com/AaronAbuUsama/whatsappd/issues/207):

```
168 requests · 165 answered · 2 silent · 0 refusals
7,908 messages recovered (the mirror held 15)
oldest reached 2025-08-17 — exactly 364 days
terminated on WhatsApp's own "nothing older", correlated to the exact request
```

**The loop that works**, per [ADR-0010](../../../../whatsappd/docs/adr) in whatsappd:

```
1  walk the STORED MIRROR to its oldest message for this chat   <- the step everyone skips
2  anchor = that message's { ref, timestamp }
3  requestHistory(anchor, { count: 50 })
4  wait for a conversationSync batch with source "on_demand"
5  messages?  -> re-anchor on the new oldest, repeat
6  EMPTY batch whose requestSessionId === your requestId  -> EXHAUSTED, stop
7  nothing    -> silence; back off and retry. NEVER read as exhausted.
```

**Constraints:** ~48 messages per reply — a real server cap, proven twice (`count: 200`
with a 45s drain window still returns 48). ~2.7s per request; a 13k chat is ~12 minutes.
**Rate limiting is silent and recovers**: after ~220 requests in an hour the account
returned 6 consecutive silences, then answered normally minutes later. No error, no refusal.

**Unsettled:** the 364-day boundary rests on **one chat**. A phone-awake arm was run and is
**inconclusive** — its silences coincided with rate limiting.

### The archive is more complete than the protocol

| | Live paging | Archive export |
|---|---|---|
| Reach | 7,908, back 364 days | **13,117, back 19 months** |
| Media | 343 of 728 fetched first-pass | **1,139 files in the zip** |
| Needs | credential, socket, lease | **a file** |

Format verified against 19,607 lines — see ADR 003 for the grammar and the
`<attached: NNNNNNNN-TYPE-date-time.ext>` marker convention.

### Corrections to the sections above

Assert these over anything earlier in this document:

1. **"The history ceiling is the phone / iOS never answers."** Wrong — 165 of 168 answered.
2. **"requestHistory only fills an interrupted sync."** Wrong — it pages a fully-synced
   account for a year.
3. **"The ceiling is ~3 months."** Wrong — 364 days.
4. **"The media gap is 258."** Wrong — **63**. Two disjoint blob stores made a file count
   the wrong instrument; `media.state` is the measurement (461 `stored`, 63 `failed`). No
   message retains a `mediaKey`, so the 63 are `NoHandle` — redelivery only, never retry.
5. **"Voice notes are 78."** Wrong — 387 in 2026 alone; the with-media export carries 95 as
   actual bytes.
6. **The 515 stream error was never the cause of anything.** A `while (drainers < 4)` spin
   in the spike blocked whatsappd's event pipeline so `synced` could never be applied.

Each was asserted confidently and each came from reading one layer and stopping. **Three
times the principal said a measurement contradicted what he knows about his own account,
and three times he was right.**
