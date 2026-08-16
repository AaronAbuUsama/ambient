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
THE CALL · THE CALL DEV TEAM · THE CALL Team · THE CALL UX/UI · THE CALL ADVISORY
The Call - Weekly Checkins · Bug Reports · EXTERNAL DEV · INTERNAL DEV
Capxul Devs · Capxul April Launch · Paynest
light:   Cpx · Check-ins
dropped: STORAGE
open:    the ~7 `X <> Capxul` partnership groups
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
