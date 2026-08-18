# INGEST · R1 — what becomes durable during a one-shot full history sync

**Question.** When `whatsappd` is run as `createWhatsAppRuntime` + `libsqlBackend` +
`fileMediaStore`, what exactly becomes durable during a pairing's one-shot full history
sync, at what moment, and what does a crash mid-sync leave behind?

**Method.** Read against the `whatsappd` checkout at `~/projects/whatsappd` (read-only,
no git writes), plus the vendored `baileys@7.0.0-rc14` in that repo's `node_modules`
where whatsappd's own comments point at upstream behaviour. Every claim below carries a
`file:line`. Claims that are reasoned rather than read are marked **(inference)**.

All paths are relative to `/Users/abuusama/projects/whatsappd/` unless absolute.

---

## Verdicts

| # | Sub-question | Verdict |
|---|---|---|
| 1 | Commit granularity | **One SQLite write transaction per `conversationSync` batch.** No batching above it. The only buffering is an unbounded in-memory FIFO that preserves order and applies no backpressure to WhatsApp. |
| 2 | What is written | One row in `wa_accepted_batches` holding the **whole batch as one JSON blob**, plus per-record upserts into `wa_chats` / `wa_contacts` / `wa_contact_aliases` / `wa_groups` / `wa_messages` / `wa_pending_message_updates`, plus one `UPDATE wa_accounts` moving `revision`, `source_seq`, `newest_fencing_token`. All in that one transaction. |
| 3 | Media bytes | **Fetched and written during acceptance, before the transaction opens** — strictly serial, one message at a time, no parallelism and no throttle. `download()` is never deferred; `DurableMedia.state` is decided there and then. |
| 4 | Concurrent reader | **Yes.** `accepted()` is a WAL read transaction and takes no write lock; `claim()`/`fencingToken` gate `accept()` only, never readers. Two caveats: the in-process write queue does not span processes, and a non-WAL filesystem silently breaks the property. |
| 5 | Crash mid-sync | `seq` is **gapless and monotonic**; `revision` advances **independently**; and **whatsappd re-requests nothing** — the remainder of the full sync is lost. Baileys acks each history chunk to WhatsApp *before* whatsappd ever sees it. |
| 6 | Local file | **Yes.** `file:` URL, no server, no auth token, and `libsqlBackend` runs its own migrations inside one write transaction on first open. |

---

## 1 — Commit granularity and the transaction boundary

### The path, event to transaction

| Step | Where |
|---|---|
| Baileys emits `messaging-history.set` | `packages/whatsappd/src/baileys/socket.ts:571` |
| Normalised to **at most one** `conversation_sync` raw event per payload | `socket.ts:215–246` (`toMessagingHistoryEvents`) → `socket.ts:574–576` `queue.push(event)` |
| Field mapping, incl. `syncType FULL → source: "full"` | `packages/whatsappd/src/baileys/history.ts:96–142`, esp. `:118–119` |
| Buffered in an in-memory FIFO | `socket.ts:336–372` (`EventQueue`) |
| Session loop pulls **one at a time and awaits it** | `packages/whatsappd/src/session.ts:581–598` |
| Serialising chain | `session.ts:425–430` (`enqueue`: `eventPipeline.then(work)`) |
| Dispatched to subscribers, awaited | `session.ts:515–516` → `packages/whatsappd/src/subscription.ts:75–106` |
| Runtime handler: capture media, then accept | `packages/whatsappd/src/runtime/runtime.ts:514–522` |
| One `accept()` call, one event | `runtime.ts:467–480` (`acceptUnder`) |
| **The transaction** | `packages/whatsappd/src/runtime/libsql.ts:1465` `transact(client, "write", …)` |
| Commit / rollback | `packages/whatsappd/src/runtime/libsql-transaction.ts:9–21` |

**The transaction boundary is one `WhatsAppDataStore.accept()` call**, which is one
libSQL `transaction("write")` opened at `libsql.ts:1465` and committed at
`libsql-transaction.ts:13`. It contains: the mirror mutations, the source-log insert, and
the counter update — nothing else, and nothing spans two batches.

`runtime.ts:475` passes a single-element array — `[{ observedAt: Date.now(), event }]` —
so the `events: readonly WhatsAppDataEvent[]` parameter is never used to group batches in
this composition.

### Is there buffering above it?

Yes, but it batches nothing. `EventQueue.push` is synchronous and unbounded
(`socket.ts:342–350`): Baileys can push arbitrarily many history payloads into memory
while the previous one is still being accepted. The consumer at `session.ts:589` does
`await enqueue(...)`, so exactly one batch is in flight at a time and each one gets its
own transaction. There is no coalescing, no debounce, no size trigger.

**(inference)** The practical consequence: during a full sync, the depth of that in-memory
queue is the *unpersisted* backlog. It is exactly the data a crash destroys, and its size
is bounded only by how far the socket runs ahead of the media downloads in §3.

### Failure is fail-closed, not skip

`subscription.ts:103–105` rethrows the first rejection as `SubscriptionHandlerError`;
`session.ts:589–597` wraps it and `session.ts:583–587` races it against the event stream,
aborting the run. ADR-0014 states the rule directly:

> *"A failed acceptance is retried or fails closed; it is never logged and skipped."* —
> `docs/adr/0014-accepted-source-batches-are-durable-and-followable.md:17–18`

And nothing retries: `docs/adr/0018-acceptance-has-its-own-cursor-and-claim.md:38–44`
records that acceptance carries no observation identity yet, so *"nothing may retry
acceptance without adding one"* (`:71–73`).

---

## 2 — What is written per batch, into which tables

### Schema (migration source: `libsql.ts:59–170`, applied by `migrate` at `libsql.ts:188–219`)

```sql
-- v1
wa_auth               (account, key, value)                        PK (account, key)
wa_accounts           (account_id, revision, source_seq,
                       newest_fencing_token, account_json)         PK account_id
wa_accepted_batches   (account_id, seq, from_revision, revision,
                       events_json, patch_json)                    PK (account_id, seq)
wa_chats              (account_id, chat_id, data_json)             PK (account_id, chat_id)
wa_contacts           (account_id, contact_id, data_json)          PK (account_id, contact_id)
wa_contact_aliases    (account_id, native_id, contact_id)          PK (account_id, native_id)
wa_groups             (account_id, group_id, data_json)            PK (account_id, group_id)
wa_messages           (account_id, chat_id, message_id,
                       timestamp, data_json)                       PK (account_id, chat_id, message_id)
wa_account_leases     (account_id, holder_id, expires_at, fencing_counter)
  + INDEX wa_contact_alias_owner (account_id, contact_id)
  + INDEX wa_message_page        (account_id, chat_id, timestamp DESC, message_id DESC)

-- v2/v3   wa_operations (account_id, operation_id, idempotency_key,
--                        submitted_at, operation_json, sequence)
-- v4      wa_pending_message_updates (account_id, chat_id, message_id, data_json)
```

Table DDL: `libsql.ts:63–127` (v1), `:133–143` (v2), `:149–155` (v3), `:161–167` (v4).

### Per batch, inside the one transaction

1. **Mirror mutations first** — `libsql.ts:1499–1500`, one `applyMutation` per record.
   For a `conversation_sync` event, `projection.ts:537–551` fans out in source order:

   | Batch field | Projector | Lands in |
   |---|---|---|
   | `chats[]` | `projectSyncedChat` (`projection.ts:237`) | `wa_chats` (`libsql.ts:1268–1274`) |
   | `contacts[]` | `projectContact` (`projection.ts:165`) | `wa_contacts` (`libsql.ts:1275–1281`), `wa_contact_aliases` (`libsql.ts:1245–1252`), and `DELETE FROM wa_contacts` on a PN/LID consolidation (`libsql.ts:1253–1259`) |
   | `messages[]` | `projectMessage` (`projection.ts:344`) | `wa_messages` (`libsql.ts:1296–1309`) |
   | `updates[]` | `projectMessageUpdate` (`projection.ts:425`) | `wa_messages`, or `wa_pending_message_updates` when the target has not arrived yet (`libsql.ts:1228–1243`) |

   Every mirror row is `INSERT … ON CONFLICT … DO UPDATE`, i.e. upsert. The batch context
   asserts this: `projection.ts:539–540` throws `UnsupportedDurableEventError` if
   `context.projection.mode !== "upsert"`, and `history.ts:135` always sets `"upsert"`.

2. **One source-log row** — `libsql.ts:1501–1518`:

   ```sql
   INSERT INTO wa_accepted_batches
     (account_id, seq, from_revision, revision, events_json, patch_json)
   VALUES (?, ?, ?, ?, ?, ?)
   ```

   `events_json` is `JSON.stringify` of the entire `WhatsAppDataEvent[]`
   (`libsql.ts:262–264`, `:1510`) — for a full-sync chunk that is **every chat, contact,
   message and update in that chunk, in one TEXT column**. `patch_json` is the projected
   client patch plus the alias array (`:1516`).

3. **One counter update** — `libsql.ts:1519–1523`:

   ```sql
   UPDATE wa_accounts SET revision = ?, source_seq = ?, newest_fencing_token = ?
     WHERE account_id = ?
   ```

`wa_accounts.account_json` is also rewritten when the projection touched the account
record (`libsql.ts:1262–1267`).

**What is *not* in the database:** media bytes. `LibsqlBackendOptions.media` is a separate
capability (`libsql.ts:48–53`, wired at `:1650`); the mirror keeps only an opaque `ref`
plus `stored`/`failed` state — `docs/runbooks/operations/libsql-recovery.md:40–44`,
ADR-0015 consequence at `docs/adr/0015-…:30–32`.

---

## 3 — Media bytes during a full sync

### The handle is consumed *during* acceptance, not deferred

`runtime.ts:514–522` is the whole answer:

```ts
conversationSync: async (batch) => {
  const messages: DurableInboundMessage[] = [];
  for (const message of batch.messages)
    messages.push(await captureMessage(accountId, backend.media, message));
  const updates: DurableUpdate[] = [];
  for (const update of batch.updates ?? [])
    updates.push(await durableUpdate(accountId, backend.media, update));
  return accept({ type: "conversation_sync", batch: { ...batch, messages, updates } });
},
```

`captureMessage` (`runtime.ts:49–95`) for `image | video | audio | document | sticker`:

- `await source.download()` (`runtime.ts:73`) — the live Baileys thunk. History messages
  carry one: `socket.ts:507` builds `mediaDownloader(sock, logger)` and `socket.ts:574`
  hands it to `toMessagingHistoryEvents`, which threads it through
  `toConversationSyncBatch` (`history.ts:99`, `:147`, `:158`).
- `await mediaStore.write({ … source: async function*(){ yield bytes } … })`
  (`runtime.ts:77–86`).
- Returns `{ state: "stored", ref, byteLength }` on success (`runtime.ts:87`),
  `{ state: "failed", reason: "download_failed" }` if the download threw
  (`runtime.ts:74–75`), `{ state: "failed", reason: "store_failed" }` if the write threw
  (`runtime.ts:88–89`).

Type-level proof it cannot be deferred: `DurableMedia` (`runtime/contracts.ts:57–66`) has
no `download` member, and `WhatsAppDurableEvent` (`:98–103`) only accepts
`DurableConversationSyncBatch` (`:76–79`) whose messages are all `DurableInboundMessage`.
A live handle is *not expressible* at the acceptance boundary. ADR-0015 is the decision;
ADR-0014's last consequence (`docs/adr/0014-…:51–53`) says the closure cannot survive
serialisation and must be spent while usable.

### Serialised — no parallelism, no throttle

The `for … of` with `await` at `runtime.ts:516–517` is strictly sequential. There is no
concurrency limit, pool, or rate-limiter anywhere on this path — grep of the runtime shows
`createPacer` (`packages/whatsappd/src/pacer.ts`) is outbound-send pacing only, never
applied to downloads.

Two tests pin it:

- `packages/whatsappd/tests/runtime.test.ts:1447–1501` — a two-media sync batch asserts
  `order === ["image", "voice"]` (source order), then `accepted.length === 1`: **one
  durable batch for both**, each `media.state === "stored"`, `"download" in media ===
  false`.
- `packages/whatsappd/tests/runtime.test.ts:856–895` — a wrapped `accept()` asserts
  `downloaded === true` before acceptance starts: *"media download must finish before data
  acceptance starts"* (`:866`).

### Cost per byte-capture (`fileMediaStore`)

`packages/whatsappd/src/runtime/file-media.ts:55–103` per stored object: `mkdir`+`chmod`
on two directories with `fsync` on each (`:23–38`, `:57–58`), write to a `.tmp` with
`O_EXCL` (`:62`), `handle.sync()` (`:76`), `link()` to the content-addressed name (`:85`),
`chmod` + `syncPath(objectPath)` (`:96–97`), `rm` temp + `syncPath(accountDirectory)`
(`:100–101`). The ref is a SHA-256 over `(accountId, owner, kind)` plus the bytes
(`runtime/media.ts:19–31`), so re-capture is idempotent (`file-media.ts:86–95`).

**(inference)** A full sync's media therefore costs, per attachment, one network fetch plus
roughly four to six `fsync`s, all on the single event-pipeline thread. Every one of those
seconds is a second in which the socket keeps pushing later history payloads into the
unbounded `EventQueue` (§1) and none of them are durable.

### One known failure mode already documented

`packages/whatsappd/src/baileys/download.ts:7–12`: Baileys rc14's re-upload retry gate is
unreachable (it tests `error.status` against a Boom carrying `output.statusCode`), so
expired media surfaces as `MediaDownloadError` reason `expired` rather than being
re-uploaded — measured, pinned by `tests/media-download-error.test.ts`. Old media in a
full sync is exactly the population most likely to be expired, and it lands as
`state: "failed", reason: "download_failed"`.

---

## 4 — Reading `accepted()` from a separate process while the runtime holds the lease

**Verdict: yes, and the fencing token is not in the way.**

- `accepted()` opens a **read** transaction — `libsql.ts:1549–1560`,
  `transact(client, "read", …)` → `libsql-transaction.ts:10` `opened.transaction("read")`.
  It reads `wa_accepted_batches WHERE account_id = ? AND seq > ? ORDER BY seq LIMIT ?`
  (`libsql.ts:1554–1556`) and takes no write lock.
- **WAL is entered on open** for any `file:` URL — `packages/whatsappd/src/stores/libsql.ts:92–108`:
  `PRAGMA busy_timeout = 5000`, then `PRAGMA journal_mode = WAL`, with the result *read
  back* rather than assumed (`:106–107`).
- The comment at `stores/libsql.ts:155–161` states the property directly: a WAL reader
  holds its own snapshot and never waits for a writer, which is why `read()` is let out of
  the write queue.
- `claim()` (`libsql.ts:1528–1542`) is a short write transaction that only sets
  `wa_accounts.newest_fencing_token`. The token is compared **inside `accept()`**
  (`libsql.ts:1469–1470`) and nowhere else. It blocks stale *writers*, never readers.
  ADR-0018 §"Durable acceptance carries the writer's fencing token" is the decision.
- The lease itself lives in `wa_account_leases` and is only touched by
  `acquire`/`renew`/`release` (`libsql.ts:1575–1640`). Nothing holds a long-lived lock.

**Three caveats INGEST must plan around:**

1. **The in-process write queue does not span processes.** `fileOperations` is a
   module-level `Map` (`stores/libsql.ts:49`, used at `:121–142`) that serialises writers
   *within one Node process*, because the native driver's busy-wait blocks the event loop
   (`:117–120`). A second process gets none of that; it relies on plain SQLite WAL plus
   `busy_timeout = 5000`. For a **reader** that is fine. **(inference)** For a second
   *writer* it is not, and INGEST should not put one there.
2. **A filesystem without shared memory silently loses WAL.** `docs/runbooks/operations/libsql-recovery.md:18–32`:
   on NFS/SMB/some container volume drivers the rollback journal is kept instead, and then
   *one open read blocks every writer on the file*. `walJournal` is read back at
   `stores/libsql.ts:107` and the code falls back to queueing — but only within its own
   process. Keep the database on a local volume.
3. **Do not reach for a second `createWhatsAppRuntime`.** That fails closed with
   `AccountAlreadyClaimedError` before it opens WhatsApp — `runtime.ts:729–730`, proved by
   `tests/libsql-backend.test.ts:1299–1334`. A *reader* needs no runtime and no lease: it
   only needs a `WhatsAppDataStore`, or raw `@libsql/client` against the same file.

**Evidence limit.** Every concurrency test in the repo uses independent
`libsqlBackend` instances **in one process** — `tests/libsql-backend.test.ts:701–736`
(fencing across instances), `:738–762` (equivalent file URLs, one winner), `:1366–1385`
(six backends opening one new database), `:1336–1364` (close waits for an open read). True
cross-*process* concurrency is **not tested here**; the verdict above rests on SQLite WAL
semantics plus the pragmas whatsappd actually sets. **(inference)** A one-hour spike —
runtime in process A, a loop calling `accepted()` in process B — would settle it.

---

## 5 — What a crash mid-sync leaves

### `seq` is gapless and monotonic

`seq = state.sourceSeq + 1` is computed inside the transaction (`libsql.ts:1485`), the row
is inserted (`:1501–1518`), and the counter is advanced (`:1519–1523`) — all three commit
or roll back together (`libsql-transaction.ts:12–17`). The counter is
`wa_accounts.source_seq`, not a rowid, so a rolled-back insert cannot burn a number.

Proved directly by `tests/libsql-backend.test.ts:1137–1232`: a trigger aborts the record
write mid-`accept()`, and afterwards `revision` and `source_seq` are still `[1, 1]`, with
`wa_accepted_batches` count `1` and `wa_contacts` count `0` — the contact from the *same*
failed batch did not survive. `:1234–1297` repeats it for a failing `UPDATE`.

Ordering under concurrent accepts is also pinned:
`tests/data-store-conformance.ts:971–993` shows two racing accepts producing
`[seq 1, rev 0→1]` and `[seq 2, rev 1→2]`.

### `revision` advances independently

`libsql.ts:1477–1482`: `revision = state.revision + 1` **only** when the projection
produced upserts, deletes or aliases; otherwise `revision = state.revision`. A duplicate
delivery therefore appends (`seq` moves) and publishes nothing (`runtime.ts:478` returns
before `publishDurable` when `revision === fromRevision`).

`tests/data-store-conformance.ts:511–530` asserts `[seq, revision]` of
`[1,1]` then `[2,1]` for a source-only update. ADR-0018 is the decision; the
`AcceptedWhatsAppBatch` doc comment (`runtime/contracts.ts:400–426`) is the contract.

**For INGEST: the durable cursor is `seq`, never `revision`** —
`docs/adr/0018-…:70` warns *"a consumer written against the earlier wording resumes at the
wrong place."*

### On restart, whatsappd re-requests nothing

This is the load-bearing finding.

1. **The full-sync request is structurally unrepeatable.** `socket.ts:464–473`:
   `companion.requireFullSync` ships in the **registration node only**, and Baileys picks
   that node by `!creds.me`. `docs/architecture/history-semantics.md:21–23` states it as
   *"once, at Pairing, and never again"*.
2. **`accountSyncCounter` is bumped long before the full sync finishes.** whatsappd reads
   `initialSyncComplete = Number(creds.accountSyncCounter ?? 0) > 0`
   (`packages/whatsappd/src/baileys/auth-state.ts:69`). Upstream increments it inside
   `doAppStateSync`, which fires as soon as the **first** processable history notification
   moves the socket to `Syncing` —
   `node_modules/.pnpm/baileys@7.0.0-rc14_…/node_modules/baileys/lib/Socket/chats.js:977–1005`,
   with the increment at `:1003–1004`. Not at the end of the FULL stream.
3. **Credentials are persisted eagerly**, so that counter is on disk almost immediately —
   `socket.ts:486–492` writes on every `creds.update`.
4. **The next connect skips history entirely.** `chats.js:1086–1094`: *"On reconnection
   (accountSyncCounter > 0), the server does not push history sync notifications … Skip the
   20s wait and go online immediately."* whatsappd mirrors this with its returning-device
   backstop — `session.ts:417–421`, `:499–506` (on `pending_drained`, apply `synced`).
5. **WhatsApp was already told the chunk arrived.** In
   `baileys/lib/Socket/messages-recv.js:1416–1432`, for any history message the socket
   sends `sendReceipt(jid, undefined, [msg.key.id], 'hist_sync')` at `:1422` and only
   *then* calls `upsertMessage(msg, …)` at `:1432` — which is what eventually reaches
   whatsappd's `messaging-history.set` handler. The ack precedes the emit, let alone the
   acceptance transaction.

**Conclusion: the un-delivered remainder of a full sync is simply lost.** whatsappd does
not re-request it, cannot re-request it, and **(inference)** the `hist_sync` receipt at
`messages-recv.js:1422` makes it unlikely WhatsApp re-pushes it.

whatsappd says so itself, and does not dress it up —
`docs/adr/0025-pre-acceptance-replay-remains-an-explicit-unknown.md:9–14`:

> durability begins at the acceptance transaction; before it begins a process can die after
> delivery without recording the event, and *"the product therefore makes no
> lossless-delivery, at-least-once, exactly-once, or automatic-recovery claim for a
> pre-acceptance process death."*

Note the failure mode is not confined to `kill -9`. Because acceptance fails closed
(§1), **any** libSQL error, any media `store_failed` that escapes, any lease-renewal loss
(`runtime.ts:690–709` → `halt()`) stops the runtime mid-sync, and the sync does not resume
on restart. There is no "pause and continue".

### Sync progress is status, not a resume point

`packages/whatsappd/src/machine.ts:34` — *"messaging-history.set progress — status only,
not persistence proof."* `conversation_sync_progress` (`socket.ts:222–223`) drives the
state machine (`session.ts:508–510`) and is never accepted. Connection and presence are
excluded from the durable event union **by type** (`runtime/contracts.ts:88–103`).

---

## 6 — `libsqlBackend` against a local file, and first-open migration

**Both yes.**

- `libsqlBackend(options)` → `lazyLibsqlClient(options, migrate)` — `libsql.ts:1643–1644`,
  with `LibsqlBackendOptions = { url, authToken?, accountId, media }` at `:48–53`.
  `authToken` is optional and only forwarded when present (`stores/libsql.ts:88–89`).
- Local-file handling is explicit: `stores/libsql.ts:92` branches on
  `client.protocol === "file"`, and `fileOperationKey` (`:51–62`) accepts
  `file:relative/path.db`, `file:///abs/path`, and `file::memory:`.
- **`initialize` is the migration.** `lazyLibsqlClient(options, initialize)` calls
  `await initialize(client)` on first connect (`stores/libsql.ts:109`), after the WAL
  pragma and before any operation is served. `migrate` (`libsql.ts:188–219`) creates
  `wa_schema_migrations`, reads applied versions, and runs each unapplied migration —
  all inside **one** write transaction (`:189`, `:212`).
- Opening is serialised through the write queue whatever the caller's mode, precisely
  because schema creation and the WAL upgrade take the whole file —
  `stores/libsql.ts:147–154`. Six backends opening one new database concurrently is a test:
  `tests/libsql-backend.test.ts:1366–1385`.
- Operationally: a `file:` database is `whatsapp.db` + `whatsapp.db-wal` + `whatsapp.db-shm`
  and all three move together —
  `docs/runbooks/operations/libsql-recovery.md:6–16`; the schema is recreated automatically
  on next open but *"a fresh database is an empty one, and the account will re-pair and
  re-sync from WhatsApp rather than resume"* (`:55–59`).

Working shape (from the tests, `tests/libsql-backend.test.ts:1139–1141` and `:742`):

```ts
libsqlBackend({
  url: pathToFileURL(path.join(dir, "whatsapp.db")).href,   // or "file:relative/whatsapp.db"
  accountId,
  media: fileMediaStore({ directory }),
});
```

---

## What INGEST must account for

Ordered by how expensive it is to get wrong.

1. **Durability is per batch, and the un-durable backlog is unbounded in memory.** A crash
   loses everything still in `EventQueue`, and the queue grows exactly as fast as media
   downloads are slow. The gap between "WhatsApp delivered it" and "it is on disk" is the
   whole risk surface, and §5 says the one-shot cannot be re-asked.
2. **Media capture is the sync's clock.** Every attachment is a serial network fetch plus
   several `fsync`s on the same thread that accepts messages. Nothing above it is durable
   until it finishes.
3. **Follow `seq`, not `revision`, and read from a separate process.** `accepted()` is a
   WAL read that neither blocks nor is blocked by the writer; the fencing token gates
   `accept()` alone.
4. **Expect `state: "failed"` on old media** and treat it as a first-class outcome, not an
   error — the re-upload path is known-broken upstream (`download.ts:7–12`).

---

## What this does not establish

- **Batch counts and sizes.** Nothing in the whatsappd repo measures how many `full`
  batches a pairing produces, how many messages or attachments each carries, or how big
  one `events_json` blob gets. The "7 `full` batches" in the question is not sourced from
  this checkout. *Would answer it:* instrument `socket.ts:571` (`historySetTelemetry`
  already logs there) on the next real pairing, or read the existing run receipts.
- **Whether a huge `events_json` has a practical ceiling.** `json()` is a bare
  `JSON.stringify` with no guard (`libsql.ts:262–264`), and `accepted()` decodes a page of
  up to 100 whole batches into memory (`libsql.ts:1549–1558`). Neither the string limit nor
  the reader's memory cost is measured anywhere. *Would answer it:* a spike accepting one
  synthetic 40k-message batch.
- **Cross-process concurrency, live.** All concurrency tests are same-process (§4). The
  verdict is sound on SQLite WAL semantics but is not proven by a test in this repo.
- **Whether WhatsApp re-pushes an unprocessed history chunk after a crash.** ADR-0025
  declares this an accepted, disclosed unknown and forbids inferring it from deterministic
  tests or database absence (`docs/adr/0025-…:16–22`). The `hist_sync` receipt ordering at
  `messages-recv.js:1416–1432` is strong evidence *against* redelivery, but it is evidence,
  not proof. *Would answer it:* a live fault-injection run on a fresh credential — which
  costs one one-shot full sync, and is exactly the experiment #19 was closed `wontfix`
  rather than run.
- **Download throughput under a full sync.** No throttle exists in whatsappd; whether
  WhatsApp's media CDN rate-limits hundreds of sequential fetches from one companion is
  unmeasured.
- **Behaviour when acceptance fails and the runtime halts mid-sync** is read from code
  (§1, §5) but has no live-run receipt in this repo.
