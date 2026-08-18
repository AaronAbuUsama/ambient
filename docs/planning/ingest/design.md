# INGEST — design

Step 2 of [`slices.md`](../../rules/slices.md), and **the first time this step has run.**
Written against [`scope.md`](./scope.md) with `T1`, `S1`, `S2` and `G1`–`G3` still open —
which is the point: a design that waits for certainty is the circular dependency this step
was added to break.

**No production code was written.** Every block below is a sketch to be thrown away and
rewritten at step 5.

Its worked-example twin is [IMPORT's design](../import/design.md), reconstructed after the
fact. This one is ahead of the code, which is the order the rule now requires.

---

## The two shapes, and the caller that kills one

`channel` must bind to one of `whatsappd`'s two surfaces. The bar in
[`seams.md`](../../design/seams.md) is met — written through by many callers *and* hard to
change later — so it is designed twice, as two callers.

### Shape A — Ambient subscribes to the socket and writes from the handler

```ts
// channel/service.ts, sketch
const session = createSession({ auth: qrAuth(), store: fileStore(credentials.path) });
session.subscribe({
  async conversationSync(batch) {                 // ~4,800 messages, ×7
    const lines: TranscriptLine[] = [];
    for (const m of batch.messages) {
      const bytes = m.media ? await m.media.download() : undefined;   // ← serial, CDN-bound
      const put = bytes ? await blobs.put(bytes) : undefined;
      if (put && "problems" in put) throw new Error("blob refused");  // ← see below
      lines.push(toLine(m, put));
    }
    const write = await transcript.writeTranscript(place, lines);
    if ("problems" in write) throw new Error("transcript refused");   // ← and here
  },
});
await session.start();
```

**Two `throw`s, and neither is optional in this shape** — a handler's only channel for
failure is its return value, and the surrounding contract has no failure arm. That alone
breaks [`errors.md`](../../rules/errors.md). But the fatal part is what the throw *does*:

> A handler rejection is not swallowed and not logged: it is routed around the reconnect
> branch to `failTerminal`. The batch is dropped and the session dies. Since the full-sync
> request rides the pairing registration node, reconnecting cannot re-ask.
> — [`findings/02`](findings/02-handler-backpressure.md), `scope.md` Decided 16

So in Shape A, **one refused blob out of ~43,000 messages destroys the remaining batches of a
sync that can never be requested again.** And the queue holding the un-accepted remainder is
unbounded and in memory ([`findings/01`](findings/01-durable-full-sync.md), Decided 13), so
its depth is set by serial CDN round-trips (Decided 14).

### Shape B — `whatsappd` owns durability; Ambient tails its log

```ts
// verb 1 — spend the one-shot. Ambient writes NOTHING here.
const backend = libsqlBackend({ url: `file:${store.path}`, accountId, media: fileMediaStore(...) });
const runtime = createWhatsAppRuntime({ accountId, backend, openSession: (creds) => ... });
await runtime.start();                     // the sync lands in libsql, per batch, per transaction
await quiet(runtime);                      // ...and we watch it arrive
await runtime.stop();

// verb 2 — map the durable log into Transcript lines. No credential. Replayable forever.
const batches = await backend.data.accepted(accountId, cursor.seq, 256);
```

**Shape B is what the caller keeps**, and the reason is one sentence: *the fragile,
unrepeatable half now does the least possible work.* Ambient's mapping, its Blob store, its
Transcript format and every bug in them are moved **behind** a durable boundary, where a crash
costs a re-read instead of an account's history.

| | Shape A | Shape B |
|---|---|---|
| Where the one-shot lands | Ambient's Transcript, via a handler | `whatsappd`'s libSQL log, per batch, per transaction |
| A refused Blob costs | **the remainder of the sync, permanently** | one re-read |
| A bug in our mapper costs | the same | re-run verb 2 |
| Ambient code inside the fragile window | mapper, `blobs`, `transcript`, dedup | **none** |
| Can the write be re-run? | no — one-shot per credential | **yes, from `seq`, forever** |
| Failure as a value ([errors.md](../../rules/errors.md)) | impossible — the seam only takes a throw | yes |
| Extra dependency | none | `@libsql/client` |
| Extra durable state | none | one libSQL file + whatsappd's media tree |

**What killed Shape A is not elegance, it is Decided 13, 14 and 16 together.** Its cost is one
database file and one peer dependency. That is the trade, stated plainly, and it is
[ADR 005](#alternatives) below.

---

## The caller

**Corrected 2026-08-18.** The first version of this file read `whatsappd`'s **event log** by
`seq`, and grew a Cursor, a resume position and a backfill-versus-live distinction out of it.
All three were artefacts of reading the wrong store. The principal's correction:

> *"WhatsApp D connects the account, it handles history, it gets everything into a database, and
> you just take from the database. Why does it need to even care about catching up?"*

**The mirror is current state.** `MessageRecord` already carries `reactions`, `receipts`,
`editedAt`, a `revoked` arm and `media: DurableMedia`
(`whatsappd/…/runtime/contracts.ts:131-133`, `:156`, `:181`), and `WhatsAppSnapshot` hands over
`chats`, `contacts`, `contactAliases` and `groups` in one call. There is no position to
remember, because there is no stream to be behind.

*The full read path is being re-established from source in
[`findings/07`](findings/07-backends-and-the-mirror-read.md); the sketch below is written
against the contracts as read at `97e4d60` and is marked where that research decides it.*

### `ambient ingest --into <slug>`

```ts
// cli/internal/commands/ingest.ts — argv → args, render the outcome. NOTHING ELSE.
const chat = home.chats().find((found) => found.slug === args.slug);
if (chat === undefined) {
  return message(false, `Chat "${args.slug}" does not exist; run \`ambient chat add\` first`);
}
const bound = chat.read();                              // Chat | HomeProblem
if ("problems" in bound) return message(false, describeHome(bound));

// the two ways INGEST could read a conversation nobody opted into
if (bound.peer === "") {
  return message(false, `Chat "${args.slug}" has no peer; set it in its config.yaml`);
}
if (!bound.source.allow.includes(bound.peer)) {
  return message(false, `Peer not in source "${bound.source.name}" allow list; nothing was read`);
}

const transcript = chat.transcript();                   // Place | HomeProblem
if ("problems" in transcript) return message(false, describeHome(transcript));
const store = home.source(bound.source.name).store();   // Place | HomeProblem
if ("problems" in store) return message(false, describeHome(store));
const media = home.source(bound.source.name).media();   // Place | HomeProblem
if ("problems" in media) return message(false, describeHome(media));

const report = await ingest.runIngest({                 // IngestReport | IngestFailure
  store, media, account: bound.source.name, peer: bound.peer,
  transcript, blobs: home.blobs,
});
return "problems" in report
  ? message(false, report.problems.map(ingest.describe).join("; "))
  : message(true, ingest.summarise(report, args.slug));
```

**The whole diff from the previous version is one deleted line:** `chat.cursor()` is gone, and
with it `home`'s new `ChatHandle.cursor` grant, `internal/cursor.ts`, a durable write, a row of
the crash table and two open questions.

### And inside `ingest`, which is where the correction actually shows

```ts
// import/service.ts's sibling. Owns the ORDER of the writes and nothing else.
const mirror = await channel.openMirror({ store, media, account });  // Mirror | ChannelFailure
if ("problems" in mirror) return { problems: [{ _tag: "ChannelRefused", … }] };

// ONE Peer, paged to exhaustion. No socket, no lease, no runtime.        ← findings/07 confirms
const lines: TranscriptLine[] = [];
for await (const page of channel.messagesFor(mirror, peer)) {
  for (const record of page) {
    const stored = record.media?.state === "stored"
      ? await blobs.put(await channel.bytesOf(mirror, record.media.ref))
      : undefined;
    if (stored && "problems" in stored) return { problems: [{ _tag: "BlobRefused", … }] };
    lines.push(toLine(record, stored));                 // MessageRecord → LiveMessage
  }
}

const write = await transcript.writeTranscript(transcriptPlace, lines);   // one call, batched
return "problems" in write
  ? { problems: [{ _tag: "TranscriptRefused", … }] }
  : { written: write.written, skipped: write.skipped, … };
```

**Three things the corrected shape settles that the old one asked about:**

| Was a question | Now |
|---|---|
| `G5` — what the Cursor is | **There is no Cursor.** Nothing to remember |
| Backfill versus live | **Neither exists.** There is current state, and you copy it |
| `G3` — when the sync is done | **Not load-bearing.** Re-run later and you get whatever is there. Only `pair`'s own lifetime matters, and that is `whatsappd`'s business |

**One thing it does not settle, and it is real.** `writeTranscript` is called **once with every
line**, because `S1` measured 372,721 lines/s batched against 10 lines/s one at a time. At
account scale that is one array of ~43,000 values in memory. Fine at this size, measured, and
named here so nobody discovers it later.

## Call graph


```
src/main.ts                          resolves $AMBIENT_HOME and the progress sink,
  │                                  prints, exits. The only file that reads the
  │                                  environment, and the only one that writes to it.
  └─ cli.run(argv, root, zone, say)
       ├─ cli.pair                   argv → args. Renders progress and the outcome. NOTHING ELSE.
       │    ├─ internal/account.ts   the Source must be in config.yaml, and `home` grants
       │    │    ├─ home.read()          both its Places. Shared by all three Live verbs.
       │    │    ├─ home.source(n).store()   a Place — the libSQL file. `cli` never builds a path.
       │    │    └─ home.source(n).media()   a Place — whatsappd's own media tree.
       │    ├─ home.source(n).converge()  the directory exists before a credential lands
       │    └─ channel.pair          ← THE OPERATION. Owns the credential and the one-shot.
       │         └─ internal/pair.ts
       │              ├─ whatsappd.libsqlBackend        durable: log + mirror + media
       │              ├─ whatsappd.createWhatsAppRuntime  claims the lease BEFORE WhatsApp
       │              ├─ runtime.start()                the sync lands, per batch, per transaction
       │              └─ the quiet rule                 online + no batch for quietMs,
       │                                                else SyncIncomplete with its counts
       │
       ├─ cli.peers                  argv → args. Renders the table. NOTHING ELSE.
       │    ├─ internal/account.ts   as above
       │    └─ channel.openMirror → mirror.peers()   ← one read(), one revision. NO WRITES.
       │
       └─ cli.ingest                 argv → args. Renders the outcome. NOTHING ELSE.
            ├─ home.chats()          find the Chat, or refuse and name `chat add`
            ├─ chat.read()           peer + the resolved Source, for the two refusals
            ├─ chat.transcript()     a Place.
            ├─ internal/account.ts   as above
            └─ ingest.runIngest      ← THE OPERATION. Owns the order of the writes.
                 ├─ channel.openMirror        no socket, no lease, no runtime
                 ├─ mirror.read(peer)         paged to exhaustion, oldest first. NO WRITES.
                 ├─ internal/media.ts ×N      mirror.bytes → blobs.put, per line
                 └─ transcript.writeTranscript  the one Write path, idempotent, ONE call
```


| Step | Owner | Why not somewhere else |
|---|---|---|
| argv → args, and the progress string's *placement* | `cli` | the only module that has ever seen a command line |
| every path | `home` | ADR 001's escrow rule. A `Place` is branded, so none can be fabricated |
| the credential, the lease, and the one-shot | `channel` | it is the module that *"hides `whatsappd` entirely"* ([seams.md](../../design/seams.md)). Nothing else may name `libsqlBackend` |
| a Peer → Live values | `channel` | reading a Live account is its sentence in `seams.md`. **It returns values and writes nothing** — the same rule as `archive` |
| the Source name → two Places | `cli/internal/account.ts` | all three Live verbs do it identically. Written once, because written three times it was already 51 duplicated lines |
| **the order of the writes** | `ingest` | `channel` reads, `transcript` appends, `blobs` stores — none knows the others exist. Identical argument to `import`, and it is the one IMPORT got wrong first |
| the outcome string | `ingest.summarise` · `channel.summarisePair` | `cli`'s README forbids it building strings; the destination arrives as a label |

**Why `ingest` is a second module and not a bigger `channel`.** Run the deletion test against
the code above, not a guess: delete `ingest` and its ~90 lines of ordered, failure-prone
writes land in `channel`, which would then depend on `blobs` and `transcript` — and
`seams.md`'s dependency graph has `channel ─> transcript` only, with `channel` sitting beside
`archive` as a Reader. **Both Readers produce values; the operation writes.** Collapsing them
makes `channel` the composition owner, which is exactly the 176-line defect one module over.

---

## Interfaces

Read back off the caller. Nothing here was invented ahead of a call site.

| Module | Public interface | Call site above |
|---|---|---|
| `cli` | `run(argv, root, zone, say?) → Outcome`. **+ `Say`**, a progress sink the composition root supplies — `pair` holds a socket for minutes and shows a code someone must scan, and `cli` still does not print. Three new handlers | `main.ts` |
| `home` | **+** `source(name) → SourceHandle` with `store: Grant` · `media: Grant` · `plan` · `converge`; **+** `sources()`. **No `ChatHandle.cursor`** — there is no Cursor | `cli/internal/account.ts` |
| `channel` | **built.** `pair(req)` · `openMirror(account) → Mirror` with `peers · read · bytes · close` · `describe` · `describeProgress` · `summarisePair`. Plus [`testing.ts`](../../../src/modules/channel/testing.ts), a seeded account with no credential | `cli.pair`, `cli.peers`, `ingest/service.ts` |
| `ingest` | **built.** `runIngest(req) → Promise<IngestReport \| IngestFailure>` · `describe(p) → string` · `summarise(r, into) → string` | `cli.ingest` |
| `transcript` | **changed — corrected 2026-08-18.** `S1` found three Live-only defects in it, none of which had ever fired because nothing produced a Live line. Ticket [`01`](./issues/01-transcript-survives-a-live-line.md) fixes them | `ingest/service.ts` |
| `blobs` | **unchanged.** `openBlobs(root) → put · get · exists` | `ingest/service.ts` |

**`transcript` was going to gain nothing. It does now** — and finding that out cost one spike rather than one corrupted Transcript. `LiveMessage`, `LiveReaction`,
`LiveWho` and `LiveMedia` have existed since IMPORT with **no producer** — measured
2026-08-18, `grep -rn 'from: "live"' src/`, four hits, all declarations or the deserialiser.
`ingest` is the caller that makes them real and closes the one empty middle column in
[IMPORT's conformance table](../import/design.md).

**`ChannelRead` is values, never bytes.** It carries `LiveMessage`/`LiveReaction` values plus,
per media line, a `ref` into whatsappd's own media store — so `ingest` can stream bytes into
`blobs` without `channel` ever touching Ambient's Blob store.

**Failures, each a distinct remedy so each is its own value:**

```
ChannelProblem  = Unpairable      the credential was refused or the QR expired
                | Claimed         another writer holds this account's lease
                | StoreUnwritable the libSQL file could not be opened or migrated
                | SyncIncomplete  the runtime stopped before it went quiet  ← the dangerous one

IngestProblem   = ChannelRefused    could not read the durable log
                | BlobRefused       a Blob could not be stored
                | TranscriptRefused the Transcript could not be appended to
                | CursorUnwritable  the lines are written but the Cursor is not — NOT durable
```

---

## Alternatives

### Shape C — Ambient supplies the backend, and there is no second database

Raised by the principal after reading the two above, and it is the better instinct: `whatsappd`
does not require libSQL. `WhatsAppBackend` is five independently replaceable contracts, so ours
could write our format directly.

```ts
// channel/internal/backend.ts — sketch
const ambientBackend = (places: { credential: Place; blobs: Place; chats: Place }): WhatsAppBackend => ({
  credentials: fileStore(places.credential.path),        // usable UNCHANGED — Decided 29
  media: {
    async write({ source }) {
      const put = await blobs.put(source);               // our own store, our own hash
      if ("problems" in put) throw new Error(...);       // <- the contract demands a throw
      return { ref: put.hash, byteLength: put.bytes };   // ref IS the sha256 — Decided 28
    },
    async open({ ref }) { return blobs.get(ref); },
  },
  data: {
    async accept(accountId, events, fencingToken) {
      const lines = events.flatMap(toTranscriptLines);   // OUR MAPPER, INSIDE accept()
      await transcript.writeTranscript(placeFor(chatId), lines);
      return { accountId, seq: ++seq, revision, events, patch };
    },
    async claim() { /* one durable integer */ },
    async accepted() { throw new Error("not a client"); },   // never called — Decided 27
    async read() { throw new Error("not a client"); },       // never called — Decided 27
  },
  leases: …, operations: …,
});
```

**What makes it legal**: the runtime makes exactly two internal data-store calls during a
pair-and-sync, `accept()` and `claim()`. Everything else is handed outward for an application
to use, and we would not be building one.

**What it costs, and it is not the code above.** Three things `whatsappd` does for free stop
being free:

| Lost | Why it exists | What we would have to store |
|---|---|---|
| **Message dedup** | the keyed mirror read *is* the dedup — a replayed message changes no record | a durable `(chatId, messageId)` seen-index |
| **Out-of-order buffering** | an edit or revoke can arrive before the message it targets | a pending-updates buffer |
| **The `requestHistory` anchor** | paging back needs each chat's oldest stored message | per chat, `{id, fromMe, keyParticipant, timestamp}` |

Plus a per-account counter triple — fencing token, `seq`, revision. **So "no second database"
is not what Shape C buys.** It buys *our* small store instead of *their* complete one.

**And it puts our mapper back inside the fragile window.** `accept()` is called by the runtime;
if it throws, that is the same terminal path that killed Shape A. Shape B's entire argument was
that our code sits *behind* a durable boundary. Shape C moves it back in front.

**One more thing, and it is the one that decides it for me.** `accepted(accountId, afterSeq)`
has **zero production call sites** in `whatsappd`. Its own ADR-0014 calls that method *"the
Ambient Brain boundary"*, and its standing decisions say Ambient follows accepted batches.
**The seam we were about to bypass was built for us.**

### The three, graded

| Axis | A · write from the handler | B · tail the accepted log | C · our own backend |
|---|---|---|---|
| **Floor-first** — does it ship the real thing now | ❌ ships a loss | ✅ ships it | ⚠️ ships it plus three reimplementations |
| **Reversibility** | ❌ a lost sync is not reversible | ✅ delete a file, re-run | ⚠️ our store's format becomes load-bearing |
| **Blast radius** | one module, catastrophic failure | one module + a peer dep | `channel` **and** a store we now own |
| **Correctness** | ❌ needs `throw` for control flow | ✅ failures stay values | ⚠️ the media contract demands a `throw` at the boundary |
| **Fit** | ✗ fights the library | ✅ **the seam its author built for us** | ✗ bypasses that seam and rebuilds behind it |
| **Parallelizability** | — | build the mapper against a seeded log, no socket | same, plus a store to build first |
| **Risk** | — | `libsqlBackend` is the shipped, tested path | **no third-party backend has ever been built, and the conformance suite is not published** |

**Decided 2026-08-18: B.** The principal accepted the recommendation. The paragraph below is
kept as the reasoning that produced it.

**Recommendation: B.** C is a genuinely better *instinct* — fewer moving parts is the right
thing to reach for — and it is only wrong because of a fact neither of us knew before R4: the
mirror is not overhead, it *is* the dedup, the ordering buffer and the paging anchor. Deleting
it means writing all three.

**C becomes right if** the answer to *"is backfill a different thing from live"* turns out to be
that INGEST never pages back and never needs the anchor. Two of the three costs are then gone,
and only the seen-index remains. That is why this is put to the principal rather than settled.

**ADR 005 — `channel` binds to `whatsappd`'s durable runtime, not to a raw session.** The two
callers are above; the grading table is above; what killed Shape A is
[`findings/01`](findings/01-durable-full-sync.md) and
[`findings/02`](findings/02-handler-backpressure.md) together, not taste.

It is hard to reverse — it puts a second durable store on disk and a peer dependency in
`package.json` — and it is written through by every later Live-account slice, so it meets
`seams.md`'s two-clause bar. **The ADR is written at step 4**, once `G4` and `G5` below are
answered; writing it now would record a decision whose shape is still open, which is the
mistake ADR 003 amendment 2 exists to correct.

**Not designed twice, and why:** `ingest`'s shape is settled by precedent, not by argument —
it is `import` with a different Reader, and the one thing it owns is the order of the writes.
Two shapes for it would be theatre.

---

## Corrected at step 5 — what the build changed

`design.md` is written before the code and corrected by it. Five things moved, and each
is already reflected above:

| Was designed | Is built | Why |
|---|---|---|
| `channel.readFrom(req)` returning a `ChannelRead` | `openMirror(account) → Mirror`, with `peers · read · bytes · close` | The view is valid only inside `backend.data.read`'s callback, so one call per answer is the only shape that keeps a page and its snapshot at one revision. A handle with an explicit `close` is `archive`'s precedent, one module over. |
| four `ChannelProblem` arms | five — **`Unpaired`** added | `libsqlBackend` **creates** the file it is pointed at. Without this check, reading an unpaired account succeeds, reports zero conversations, and leaves an empty database that looks exactly like a paired account with nothing in it. Gate row 3 is the assertion. |
| `LiveReaction` as a third arm of `TranscriptLine` | reaction **state on `LiveMessage`** | The mirror is current state, so there is no reaction event to write. [ADR 004 amendment 1](../../adr/004-transcript-line-is-a-union-on-provenance.md#amendments). |
| `cli.run(argv, root, zone)` | `+ say?: Say` | `pair` shows a code someone has to scan and then holds for minutes. An outcome delivered at the end is no use, and `cli` still must not print — so the composition root hands in the sink. |
| the Places resolved in each handler | `cli/internal/account.ts` | Three handlers doing it identically measured **51 duplicated lines** across three clone groups. |

Two things the design predicted and the build confirmed: **`ingest` is a second module**
(its handler is 61 lines against `import`'s 74, and `cli` did not become the composition
owner), and **`transcript` needed the three fixes** ticket `01` made.

---

## Seam delta

Rows for [`seams.md`](../../design/seams.md), written here, before any module is scaffolded —
`new-module` refuses a module with no row, which is why IMPORT needed a ticket 00.

| Module | Owns | Depends on | Effect |
|---|---|---|---|
| `channel` | **amended.** A Live account Reader and a bound destination. The credential, the pairing, the account lease, the one-shot full sync, and reading the durable log from a `seq`. **Hides `whatsappd` entirely** — nothing else names `libsqlBackend`, `createWhatsAppRuntime` or a `MessageRecord`. Produces values; **writes no Ambient state**. | `home` (Places), `transcript` (types only) | no |
| `ingest` | **new.** The Continuous Ingestion operation — read from the Cursor, store Blobs, append the Transcript, advance the Cursor. **Owns the order of those writes and what a crash between them leaves.** | `channel`, `blobs`, `transcript`, `home` (a Place) | no |

Two lines change in the dependency graph:

```
cli ─────────────> home, import, channel, ingest
ingest ──────────> channel, blobs, transcript, home (a Place)
channel ─────────> home (a Place), transcript (types only)     [no longer a bare Reader arrow]
```

---

## Test seams and conformance

The highest useful seam per arrow, and what each observes.

| Public symbol | Production caller | Test seam |
|---|---|---|
| `channel.pair` | `cli/…/commands/pair.ts` | `channel.test.ts` — `whatsappd/testing`'s `createTestWhatsAppSession` against a temp libSQL file. **No credential** |
| `channel.readFrom` | `ingest/service.ts` | `channel.test.ts` — a seeded source log in, Live values out |
| `channel.describe` · `describeProgress` · `summarisePair` | `cli/…/commands/pair.ts` | `channel.test.ts` — the rendered string |
| `ingest.runIngest` | `cli/…/commands/ingest.ts` | `ingest.test.ts` — a temp home, a seeded log, real files |
| `ingest.summarise` · `describe` | the same handler | `ingest.test.ts` |
| `home.source(n).store()` · `.media()` | both handlers | `home.test.ts` |
| `chat.cursor()` | `cli/…/commands/ingest.ts` | `home.test.ts` |
| **`transcript`'s `from: "live"` variants** | **`ingest/service.ts`** | `transcript.test.ts` |

**The last row is the one that was empty**, and filling it is the reason `ingest` exists as a
named caller rather than as code inside a handler.

**`whatsappd/testing` is what makes this testable without a credential** — a driver that feeds
events into a session with no socket. It is the seam that keeps `T1`'s one-shot for the one
run that needs it.

---

## State and failure sequence

**Required**: INGEST has durable writes. And the two verbs are asymmetric in the only way that
matters, which is the argument for splitting them.

### `ambient pair` — one credential, one chance

| # | Write | A crash immediately after leaves | The next run |
|---|---|---|---|
| 1 | the credential, into `wa_auth` | a linked device with an empty log | reconnects and logs in — **and cannot re-request the sync** |
| 2 | per batch: media bytes, then **one transaction** carrying the source-log row, the mirror upserts and the revision | `seq` gapless up to the last committed batch. Everything delivered but not yet accepted is **gone** | resumes nothing |
| 3 | the lease release | a lease held until its 30 s TTL expires | acquires after the TTL |

**There is no recovery row, and that is not an omission.** `seq` is gapless and monotonic, so
what landed is intact and readable — but the remainder of a full sync cannot be re-requested,
because the request rides the pairing registration node
([`findings/01`](findings/01-durable-full-sync.md) §5). **Recovery means re-pairing, which
spends another of four device slots.** That is `G3`.

**The lease is the second way to lose a batch.** Its TTL defaults to 30 s, renewed at half —
so a stall longer than that has its next batch rejected
([`findings/02`](findings/02-handler-backpressure.md)). Nothing Ambient writes during verb 1
is the reason: **the whole point of Shape B is that we are not in that window.**

### `ambient ingest` — every failure costs a re-read

| # | Write | A crash immediately after leaves | The next run |
|---|---|---|---|
| 1 | Blobs | orphan Blobs, content-addressed, harmless | re-hashes to the same names |
| 2 | Transcript lines | lines with no record that they were written | **re-reads the mirror and writes them again; `writeTranscript` is idempotent on the message id** |

**Two rows, not three.** The Cursor was the third, and it is gone. What replaces it is that the
mirror is still there — a crash costs a re-read of something that has not moved, which is the
whole reason the durable boundary sits where it does.

**A revoke can arrive on the same record as the message it revokes**
([`findings/03`](findings/03-sync-payload.md)), and `editedAt`, reactions and receipts are all
state on the record rather than events — so a Chat is mapped whole and written in one call. That
is also what `S1`'s measurement demands: 372,721 lines/s batched against 10 one at a time.

## Branch points

**Empty, and that is the gate.** Every branch point this file raised was a `grilling` question
in [`scope.md`](./scope.md), and step 3 answered or dissolved all of them. They are collapsed
below rather than deleted, because *what a decision beat* is part of the decision.

| Was | Now | Killed by |
|---|---|---|
| **1 · Where the Source's store lives** — a fourth `home` unit, or one property like `home.blobs` | **A fourth unit.** `home.source(name).store()` / `.media()`, inside `~/.ambient`. `home.blobs` is a property precisely because *"the root has no name to be wrong"*, and a Source **does** have a name that can be wrong | the principal, Decided 24 |
| **2 · What the Cursor is** — a file, a field on the line, or nothing | **Dissolved. There is no Cursor.** The question existed only because this design read the event log by `seq`. Reading current state has no position to remember | the principal: *"why does it need to even care about catching up?"* |
| **3 · When a one-shot sync is done** | **Dissolved as a design question, and survives as one operational rule**: never exit on a guess. `pair` stops on the protocol's own completion, and otherwise holds and prints where it got to. It is not load-bearing for `ingest`, which can simply be re-run | the mirror correction |
| — | **New, and answered**: how a Chat is bound to a Peer. By hand, from `ambient peers <source>` | the principal, Decided 54–55 |

**One question this file raised was itself an artefact.** *Backfill versus live* is not a
distinction the API has: there is one read of current state, and "am I caught up" is a property
of a number rather than a second operation. Recorded because the design asked it and the asking
was the error.

## What follows

The frontier is empty and [`spec.md`](./spec.md) is written. The build tickets are
[`issues/`](./issues/), numbered in dependency order:

```
00 seam rows + @libsql/client ──> 02 ambient pair ──> 03 ambient peers ──┐
                                                                        ├──> 04 ambient ingest
01 transcript survives a Live line ─────────────────────────────────────┘
```

**`00` and `01` are startable now, in parallel.** `00` writes no code and exists because
`new-module` refuses a module with no `seams.md` row; `01` needs nothing because `transcript`
already has one.
