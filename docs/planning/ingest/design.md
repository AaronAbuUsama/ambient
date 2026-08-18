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

Two verbs, and the split is a **consequence** of Shape B rather than a preference — they have
different lifetimes, different failure costs and different preconditions.

### `ambient pair --source <name>` — spends the one-shot

```ts
// cli/internal/commands/pair.ts — argv → args, render the outcome. NOTHING ELSE.
const global = home.read();                                   // Global | HomeProblem
if ("problems" in global) return report(global.problems);
const source = global.sources.find((s) => s.name === args.source);
if (source === undefined) {
  return message(false, `No source "${args.source}" in config.yaml`);
}

const store = home.source(args.source).store();               // Place | HomeProblem
if ("problems" in store) return message(false, describeHome(store));
const media = home.source(args.source).media();               // Place | HomeProblem
if ("problems" in media) return message(false, describeHome(media));

const paired = await channel.pair({                           // PairReport | ChannelFailure
  store, media, account: args.source,
  onProgress: (p) => write(channel.describeProgress(p)),      // ← the ONLY thing cli does live
});
return "problems" in paired
  ? message(false, paired.problems.map(channel.describe).join("; "))
  : message(true, channel.summarisePair(paired, args.source));
```

**`cli` renders a progress line and nothing else.** `onProgress` takes an already-formatted
value from `channel`, so `cli` never learns what a batch is — the same rule that made
`import.summarise` own its own string.

### `ambient ingest --into <slug>` — maps the durable log into Transcript lines

```ts
// cli/internal/commands/ingest.ts
const chat = home.chats().find((found) => found.slug === args.slug);
if (chat === undefined) {
  return message(false, `Chat "${args.slug}" does not exist; run \`ambient chat add\` first`);
}
const bound = chat.read();                                    // Chat | HomeProblem
if ("problems" in bound) return message(false, describeHome(bound));
if (bound.peer === "") {
  return message(false, `Chat "${args.slug}" has no peer; set it in chats/${args.slug}/config.yaml`);
}
if (!bound.source.allow.includes(bound.peer)) {
  return message(false, `Peer not in source "${bound.source.name}" allow list; nothing was read`);
}

const transcript = chat.transcript();                         // Place | HomeProblem
if ("problems" in transcript) return message(false, describeHome(transcript));
const cursor = chat.cursor();                                 // Place | HomeProblem   ← branch point 2
if ("problems" in cursor) return message(false, describeHome(cursor));
const store = home.source(bound.source.name).store();         // Place | HomeProblem
if ("problems" in store) return message(false, describeHome(store));
const media = home.source(bound.source.name).media();         // Place | HomeProblem
if ("problems" in media) return message(false, describeHome(media));

const report = await ingest.runIngest({                       // IngestReport | IngestFailure
  store, media, account: bound.source.name, peer: bound.peer,
  transcript, cursor, blobs: home.blobs,
  after: bound.source.mode === "ingest" ? undefined : undefined,   // mode gates SPEAK, not reads
});
return "problems" in report
  ? message(false, report.problems.map(ingest.describe).join("; "))
  : message(true, ingest.summarise(report, args.slug));
```

**Two refusals before any I/O**, and both are in the sketch on purpose: an empty `peer` and a
Peer absent from `allow` are the two ways INGEST could read a conversation nobody opted into —
destination row 4 of [`scope.md`](./scope.md).

**The caller does not grow arms.** Each verb is parse → resolve Places → one call → render.
That is the deletion test run against code rather than a guess, which is the mistake
[`walkthroughs/import.md`](../../walkthroughs/import.md) exists to record.

---

## Call graph

```
src/main.ts                          resolves $AMBIENT_HOME, prints, exits. The only file
  │                                  that reads the environment.
  └─ cli.run(argv, root, zone)
       ├─ cli.pair                   argv → args. Renders progress and the outcome. NOTHING ELSE.
       │    ├─ home.read()           the Source must exist in config.yaml
       │    ├─ home.source(n).store()   a Place — the libSQL file. `cli` never builds a path.
       │    ├─ home.source(n).media()   a Place — whatsappd's own media tree.
       │    └─ channel.pair          ← THE OPERATION. Owns the credential and the one-shot.
       │         ├─ whatsappd.libsqlBackend        durable: source log + mirror + media
       │         ├─ whatsappd.createWhatsAppRuntime  claims the lease BEFORE opening WhatsApp
       │         ├─ runtime.start()                the sync lands, per batch, per transaction
       │         └─ internal/quiet.ts              when is a sync done? ← branch point 3
       │
       └─ cli.ingest                 argv → args. Renders the outcome. NOTHING ELSE.
            ├─ home.chats()          find the Chat, or refuse and name `chat add`
            ├─ chat.read()           peer + the resolved Source, for the two refusals
            ├─ chat.transcript()     a Place.
            ├─ chat.cursor()         a Place.                  ← branch point 2
            ├─ home.source(n).store()  a Place.
            └─ ingest.runIngest      ← THE OPERATION. Owns the order of the writes.
                 ├─ channel.readFrom          seq → Live values, Peer-filtered. NO WRITES.
                 ├─ blobs.put              ×N  bytes out of whatsappd's media store
                 ├─ transcript.writeTranscript  the one Write path, idempotent
                 └─ internal/cursor.ts        seq, written LAST
```

| Step | Owner | Why not somewhere else |
|---|---|---|
| argv → args, and the progress string's *placement* | `cli` | the only module that has ever seen a command line |
| every path | `home` | ADR 001's escrow rule. A `Place` is branded, so none can be fabricated |
| the credential, the lease, and the one-shot | `channel` | it is the module that *"hides `whatsappd` entirely"* ([seams.md](../../design/seams.md)). Nothing else may name `libsqlBackend` |
| `seq` → Live values | `channel` | reading a Live account is its sentence in `seams.md`. **It returns values and writes nothing** — the same rule as `archive` |
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
| `cli` | `run(argv, root, zone) → Outcome` — unchanged; two new handlers | `main.ts` |
| `home` | **+** `source(name) → SourceHandle` with `store: Grant` · `media: Grant`; **+** `ChatHandle.cursor: Grant` | `cli.pair`, `cli.ingest` |
| `channel` | `pair(req) → Promise<PairReport \| ChannelFailure>` · `readFrom(req) → Promise<ChannelRead \| ChannelFailure>` · `describe(p) → string` · `describeProgress(p) → string` · `summarisePair(r, into) → string` | `cli.pair`, `ingest/service.ts` |
| `ingest` | `runIngest(req) → Promise<IngestReport \| IngestFailure>` · `describe(p) → string` · `summarise(r, into) → string` | `cli.ingest` |
| `transcript` | **unchanged.** `writeTranscript(Place, lines)` already accepts `LiveMessage` and `LiveReaction` | `ingest/service.ts` |
| `blobs` | **unchanged.** `openBlobs(root) → put · get · exists` | `ingest/service.ts` |

**`transcript` gains nothing, and that is the headline.** `LiveMessage`, `LiveReaction`,
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
| 2 | Transcript lines | lines ahead of the Cursor | re-reads from the Cursor; `writeTranscript` is idempotent |
| 3 | the Cursor (`seq`) | — | resumes at `seq + 1` |

**The Cursor is written last on purpose**, for exactly the reason the Receipt is: its value is
the claim that everything below it is already in the Transcript. Written first, it would claim
lines that were never appended.

**A revoke can arrive in the same batch as the line it revokes**
([`findings/03`](findings/03-sync-payload.md)) — so a batch is mapped whole before it is
written, never message-by-message. That is a property of `channel.readFrom`, and it is why it
returns a batch rather than an async iterator of messages.

---

## Branch points

Each is a place the shape depends on something not yet decided. Each carries two candidate
shapes as code, and each is one `grilling` line in [`scope.md`](./scope.md).

### Branch point 1 — where the Live account's durable store lives · `G4`

`home` has three units — home, chat, agent. A WhatsApp Account's credential, source log,
mirror and media tree are **per-Source, not per-Chat**, and the layout has nowhere for
account-level material that is not knowledge.

```ts
// A — a fourth unit, following ADR 001's handle pattern
home.source("personal").store()   // ~/.ambient/sources/personal/wa.db
home.source("personal").media()   // ~/.ambient/sources/personal/media/
// every Source in config.yaml gets a folder; `doctor` plans and converges it like any other

// B — one property, like `home.blobs`, keyed inside by the Source name
home.channels                     // Place → ~/.ambient/channels/
// `channel` joins <name> itself. Fewer home changes; breaks ADR 001's escrow rule,
// because a module outside `home` would be building a path.
```

**A is the sketch above.** B is here because it is genuinely smaller and it is what
`home.blobs` already does — but `home.blobs` is a property precisely because *"the root has no
name to be wrong"*, and a Source **does** have a name that can be wrong. That asymmetry is the
whole question.

### Branch point 2 — what the Cursor is, and where it lives · `G5`

```ts
// A — a file beside the Transcript. One more durable write, ordered last.
chat.cursor()                     // ~/.ambient/chats/<slug>/cursor.json  → { seq, at }

// B — carry `seq` on the Transcript line itself; re-derive by reading the last line.
//     No second write, no ordering question, and the crash table loses a row.
//     Costs: it changes the line shape ADR 004 settled, and `home` "never parses"
//     the Transcript because it is bounded by traffic — so something must tail it.

// C — no cursor. Re-read the whole log every run and let writeTranscript dedup.
//     Correct today (13,134 lines, 43,334 messages); it is O(everything) forever.
```

Three, not two, because C is the honest floor: it ships INGEST with **no new durable state at
all** and is the one shape that cannot be wrong about resumption. It is here to be killed on
cost, not ignored.

### Branch point 3 — when a one-shot sync is "done" · anchors `G3`

`whatsappd` publishes no completion signal, and none can be synthesised: silence and
exhaustion are indistinguishable.

```ts
// A — quiet window. Stop after N seconds with no accepted batch.
//     Wrong N ends the sync early, and early is unrecoverable.

// B — never stop on our own. Run until the principal stops it, and print the live
//     `seq`, batch source and oldest Instant so the decision is his.
//     Slower, and it makes the irreversible call a human one.
```

**This is where `G3` becomes concrete**: *"zero loss, or re-pair"* is really *"who decides the
sync is finished, and what does it cost to be wrong."*

### Anchors for the map's three questions

| id | Names | The question, now that there is code to look at |
|---|---|---|
| `G1` | § State and failure · `ambient ingest` | Live lines older than `2025-02-14T16:06:10Z` — write them, or is the Archive authoritative for its own span? The Cursor is `seq`-ordered, not time-ordered, so this is a filter in `channel.readFrom` or nothing |
| `G2` | § The caller · `ambient ingest` | `--into <slug>`, one Chat at a time, is the sketch. The alternative is a verb with no `--into` that walks every Chat whose Peer is in `allow`. One is provable now; the other is what the seed needs |
| `G3` | § Branch point 3 | above |

---

## The frontier, ordered

```
T1  task       now                                    — linked-device slots free
S1  spike      now                                    — a Live line through writeTranscript
S2  spike      after T1, S1                           — retry the 353 transport failures
G1  grilling   after design.md § State and failure    — older than the Archive
G2  grilling   after design.md § The caller           — one Chat, or the seed
G3  grilling   after design.md § Branch point 3       — who decides a sync is done
G4  grilling   after design.md § Branch point 1       — where the Source's store lives
G5  grilling   after design.md § Branch point 2       — what the Cursor is
```

Every `grilling` line names a block of this file, which is the step-2 gate. `T1` and `S1`
remain the only two things startable without the principal.
