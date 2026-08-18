# INGEST · R5 — The backends, and reading the current mirror out of a file

**Question.** Ambient's job is to *copy the database into files*. A previous pass concluded
we should consume `whatsappd`'s **event log** via `accepted(accountId, afterSeq)`, on the
strength of ADR-0014 calling that "the Ambient Brain boundary". The principal pushed back:
for copying current state into files, the right surface is almost certainly the **current
mirror**. This re-establishes the facts from source, without inheriting that framing.

**Sources.** The `whatsappd` checkout at `/Users/abuusama/projects/whatsappd`, **read only,
never written** — no `git` command that mutates was run, no file there was created, edited or
deleted. Every probe wrote only into this session's scratchpad. No network call, no socket.

Paths under `packages/whatsappd/` are relative to `/Users/abuusama/projects/whatsappd/`.

**Tags.** **[read]** = asserted by the cited line. **[measured]** = observed by running code
in this session, transcript below. **[inference]** = mine, asserted by no source.

---

## 0 · What I read, and at which commit

```
HEAD          97e4d601061ebb88ae4a4ba86ea3d578b69a9e2b
              "fix(release): tell knip that pnpm view is a builtin, not a binary"
              Mon Aug 17 13:05:31 2026 +0000
branch        codex/fix-release-verify
version       packages/whatsappd/package.json → 0.4.0-alpha.3
working tree  clean (git status --porcelain empty)
```

**`origin/master` is NOT ahead.** `git rev-list --left-right --count origin/master...HEAD`
returns `0	3` — HEAD is *three ahead* of `origin/master`, and `origin/master` holds nothing
HEAD lacks. The three are the release-verify fixes `2a0da5a`, `82f2387`, `97e4d60`.

The four named corrections, and whether the tree I read contains them:

| Commit | Subject | In HEAD? |
|---|---|---|
| `f057ca7` | docs: correct two claims disproved on 2026-08-17 (#213) | **yes** — direct ancestor |
| `44dfa49` | same subject, pre-squash | **yes, by content** — not an ancestor by sha, but `git rev-parse f057ca7^{tree}` and `44dfa49^{tree}` are the **same tree** `dc9f9f1…`. `f057ca7` is the squashed PR of `44dfa49`. |
| `e6bbf69` | fix(media): correct two comments that promised a recovery which never runs | **yes, by content** — not an ancestor by sha; folded into `f225ee6` (#206). Verified in the working tree: `src/baileys/download.ts:1-16` and `src/errors.ts:150-158` both carry the corrected text verbatim. |
| `f225ee6` | feat(media): classify media download failures with the HTTP status (#206) | **yes** — direct ancestor |

**Nothing I read is stale.** All four corrections are present in the working tree, so every
citation below is to the working tree unless stated otherwise.

---

## Verdicts

| # | Question | Verdict |
|---|---|---|
| 1 | `libsqlBackend` end to end | **12 tables across 4 migrations, applied in one write transaction at first open.** `accept()` is a single write transaction doing project → mutate → append → stamp. `seq` always advances; `revision` advances only if the projection changed a record. Local files are put into **WAL**, and a WAL read runs *outside* the write queue — so a second process reads while a writer writes. `@libsql/client` is an **optional** peer dep, imported dynamically. |
| 2 | Postgres backend | **No. It has never existed.** Zero hits across the whole repo, and zero in the entire git history — no removed file, no commit, no ADR. It is a documented **target**: `deferred; post-0.3 #81`. The backend contract *is* storage-agnostic — nothing libsql-specific reaches `runtime.ts` or `client.ts`. |
| 3 | `memoryBackend` | **Yes, it is the de-facto reference** — its own docstring says so. A real conformance suite exists (`tests/data-store-conformance.ts`, 1181 lines) and is run against **both** memory and libSQL. It is **not shipped**: `files: ["dist","CHANGELOG.md"]`, and `./testing` exports a *session* driver, not a backend suite. |
| 4 | **The read path** | **Ambient can open the file and read the whole mirror with no socket, no lease and no runtime.** Measured, cross-process, against a live writer holding the lease. `libsqlBackend({url,accountId,media}).data.read(accountId, fn)` is the whole call. Paging terminates, never skips, never repeats, and a concurrent commit **cannot** tear it. |
| 5 | `MessageRecord` completeness | **Reactions, receipts, `editedAt`, `revoked` and media are all current state.** A re-read gives the truth; nothing needs replaying. Four things live only outside the mirror: pre-edit content, pre-revoke content, superseded receipt statuses, and **orphan updates** parked in `wa_pending_message_updates`. |
| 6 | Media bytes | **`open({accountId, ref})` is all that is needed.** Measured round-trip. Path is `<dir>/.whatsappd-media/sha256(accountId)/<sha256hex>.bin`, mode `0600` in a `0700` dir; ref format `media:v1:<64 hex>`. |

**Two constraints that bite, found by running it:**

- **`libsqlBackend` cannot open a read-only file at all.** It fails at `PRAGMA journal_mode = WAL`
  (`src/stores/libsql.ts:106`) with `attempt to write a readonly database`, before migrations.
  Ambient needs write permission on the file *and* its directory (for `-wal`/`-shm`).
- **The mirror read path has strictly fewer failure modes than the log read path.** `accept()`
  stores `events_json` verbatim without decoding it (`libsql.ts:1510`); `accepted()` decodes
  every field of every event strictly and one bad row throws the **whole page**
  (`libsql.ts:1552-1559`). I hit this twice by accident. The mirror read never touches
  `events_json` and returned complete, correct results both times.

---

## 1 · How `libsqlBackend` actually works

### 1.1 The schema — 4 migrations, 12 tables

`src/runtime/libsql.ts:59-170` **[read]**. Applied by `migrate()` (`:188-219`) inside **one
write transaction**, guarded by `wa_schema_migrations`.

**Migration 1** (`:62-128`) — nine tables:

| Table | Columns | Purpose |
|---|---|---|
| `wa_auth` | `account, key, value`, PK `(account,key)` | Baileys credentials |
| `wa_accounts` | `account_id` PK, `revision`, `source_seq`, `newest_fencing_token`, `account_json` | per-account cursors + `AccountRecord` |
| `wa_accepted_batches` | `account_id, seq` PK, `from_revision`, `revision`, `events_json`, `patch_json` | **the source log** |
| `wa_chats` | `account_id, chat_id` PK, `data_json` | `ChatRecord` |
| `wa_contacts` | `account_id, contact_id` PK, `data_json` | `ContactRecord` |
| `wa_contact_aliases` | `account_id, native_id` PK, `contact_id` | PN↔LID resolution; index `wa_contact_alias_owner` |
| `wa_groups` | `account_id, group_id` PK, `data_json` | `GroupRecord` |
| `wa_messages` | `account_id, chat_id, message_id` PK, `timestamp`, `data_json` | `MessageRecord`; index `wa_message_page (account_id, chat_id, timestamp DESC, message_id DESC)` |
| `wa_account_leases` | `account_id` PK, `holder_id`, `expires_at`, `fencing_counter` | the single-writer lease |

**Migration 2** (`:132-144`) `wa_operations`. **Migration 3** (`:148-156`) adds `sequence`,
backfilled from `rowid`. **Migration 4** (`:160-168`) `wa_pending_message_updates` — updates
whose message has not arrived yet.

Every mirror table is `(scope keys) + one JSON blob`. Only `wa_messages.timestamp` is
promoted to a real column, because it is the only thing paged on. **[read]**

**[measured]** — dumped from a database this session's probe produced:

```
TABLES: wa_accepted_batches, wa_account_leases, wa_accounts, wa_auth, wa_chats,
        wa_contact_aliases, wa_contacts, wa_groups, wa_messages, wa_operations,
        wa_pending_message_updates, wa_schema_migrations
  wa_schema_migrations: 4 rows        journal_mode: wal
```

### 1.2 `accept()` — one write transaction

`src/runtime/libsql.ts:1461-1526` **[read]**. `transact(client, "write", …)` (`:1465`) opens
one transaction; everything below commits together or not at all.

1. `ensureAccount` — `INSERT … ON CONFLICT DO NOTHING` (`:1466`, `:1117-1123`).
2. `accountState` — read `revision`, `source_seq`, `newest_fencing_token` (`:1467`).
3. **Fence** — `if (fencingToken < state.newestFencingToken) throw StaleAccountClaimError` (`:1469-1470`).
4. **Project** — `projectCurrentMirror(projectionRecords(transaction, …), …)` (`:1472-1476`).
   Every read the projection makes goes through *this same transaction* (`:1152-1221`), so it
   sees its own uncommitted writes.
5. **Assign the two numbers** (`:1477-1487`):
   ```ts
   const revision =
     projection.upserts.length === 0 && projection.deletes.length === 0 &&
     projection.aliases.length === 0
       ? state.revision            // observation told the mirror nothing
       : state.revision + 1;
   seq: state.sourceSeq + 1        // always advances
   ```
6. **Mutate** — `for (const mutation of projection.mutations) await applyMutation(...)` (`:1499-1500`).
7. **Append** the batch to `wa_accepted_batches` (`:1501-1518`).
8. **Stamp** `UPDATE wa_accounts SET revision, source_seq, newest_fencing_token = MAX(token, current)` (`:1519-1523`).

Order matters and is deliberate: mirror rows land *before* the log row and *before* the
revision stamp, so no reader can see a bumped revision without the rows behind it. **[read]**

**[measured]** `WRITER batch1 seq 1 rev 0 -> 1`, `WRITER batch2 seq 2 rev 1 -> 2`.

### 1.3 Where the projection runs

`src/runtime/projection.ts` — **backend-independent and pure of SQL**. It takes a
`CurrentMirrorRecords` of seven keyed reads (`:23-31`) and returns a
`CurrentMirrorProjection` of `{upserts, deletes, aliases, mutations}` (`:44-50`). Both
backends call the identical function: libSQL at `libsql.ts:1472`, memory at `memory.ts:199`.

It **memoises within a batch** (`:82-112`) — a read is issued once per key per `accept()` —
and it **suppresses no-ops**: every projector ends `if (existing && isDeepStrictEqual(existing,
merged)) return;` (`:161`, `:214`, `:233`, `:281`). That equality check is what makes
`revision === fromRevision` mean "told us nothing". **[read]**

Events → mirror rows (`projectEvent`, `:527-597`):

| Event | Becomes |
|---|---|
| `message` | a `MessageRecord`, **written once** — `if (!existing)` at `:357`. A re-observed message never overwrites. It also advances the chat's `lastMessageAt` and, if `sender.alt` is present, folds a contact + aliases (`:349-354`, `:377-382`). |
| `update` | mutates the **existing** record (`:425-525`). If the message is absent, the update is parked in `pendingUpdates` (`:427-431`) and replayed when it arrives (`:373-375`). |
| `conversation_sync` | chats → contacts → messages → updates, in that order (`:541-550`). A non-`upsert` projection mode **throws** `UnsupportedDurableEventError` (`:539-540`). |
| `contact` | `projectContact` — consolidates PN/LID into one record, **deleting** superseded contact records and re-pointing every alias (`:165-216`). |
| `group` | roster arithmetic; a rename also updates the chat's subject (`:567-590`). |
| `last_seen` / `account_connection` | `contact.lastSeenAt`, or `account.lastConnectedAt`/`lastDisconnectedAt`. Monotonic via `advance()` (`:259`, `:261-283`). |

### 1.4 WAL, concurrency, and the second reader

`src/stores/libsql.ts:92-108` **[read]**. On `client.protocol === "file"`, before any
migration:

```ts
await client.execute("PRAGMA busy_timeout = 5000");
const journal = await client.execute("PRAGMA journal_mode = WAL");
walJournal = journal.rows[0]?.journal_mode === "wal";
```

The comment (`:96-105`) is explicit about why: without WAL, a rollback-journal file lets one
open read transaction refuse **every** writer across connections and processes, and the native
busy wait blocks the event loop. The pragma's answer is *read back* rather than assumed,
because an in-memory database answers `memory`.

`run()` (`:145-177`) then splits by mode:

- Writes, **and the very first operation whatever its mode**, go through `queued()` — a
  module-level per-file promise chain (`:49`, `:121-142`), because the WAL upgrade takes the
  whole file and SQLite refuses it with immediate `SQLITE_BUSY` rather than honouring the
  busy timeout (`:147-153`).
- A **read on an already-open WAL client skips the queue entirely** (`:154-167`). The comment
  says why this is required, not merely an optimisation: `read()` holds its transaction open
  across a callback this package does not control, and queueing it would stall every writer on
  the file — the runtime's own `accept()` among them.

**Can a second process read while a writer holds the lease? [measured] — yes.** Writer
process open, lease held (`fencingToken: 1`, `expiresAt` in the future), client not closed.
Separate reader process, same file:

```
READER chat person@s.whatsapp.net isGroup=false lastMessageAt=1700000000012 -> 10 messages in 4 pages
READER chat room@g.us isGroup=true subject=The Room lastMessageAt=1700000000020 -> 1 messages in 1 pages
READER read completed in 88 ms WITHOUT a lease
READER revision: 2
READER lease steal attempt: {"acquired":false,"heldUntil":1787039278179}
```

The reader got everything, in 88 ms, and **could not** take the lease — so reading is safe and
cannot disrupt the writer. The account lease is an application-level row in
`wa_account_leases`; it does not lock the database and is never consulted on a read path.
**[read]** — no read method in `libsqlDataStore` (`:1328-1562`) touches `wa_account_leases`.

### 1.5 `file:` URLs, migrations, peer dependency

- **URLs.** `file:wa.db`, `file:///abs/path.db`, or a remote `libsql://…turso.io` with
  `authToken` (`src/stores/libsql.ts:19-28`). `fileOperationKey` (`:51-62`) resolves a `file:`
  URL to an absolute path so two backends in one process on the same file share one write
  queue.
- **No server.** Local files run through the embedded driver; nothing is listening.
- **Migrations** are automatic and idempotent, on first open, in one write transaction
  (`libsql.ts:188-219`). There is no separate migrate step and no opt-out.
- **`@libsql/client` is an OPTIONAL peer dependency** — `packages/whatsappd/package.json`:
  ```json
  "peerDependencies":     { "@libsql/client": "^0.15.0" },
  "peerDependenciesMeta": { "@libsql/client": { "optional": true } }
  ```
  Imported **dynamically** (`src/stores/libsql.ts:79-86`) so the core package never forces it;
  a missing install produces
  `"libSQL requires the optional peer dependency '@libsql/client'. Install it: npm i @libsql/client"`.
  **Ambient must depend on it directly** — [inference] — since it is optional upstream.
- **Opening is lazy.** `libsqlBackend()` constructs nothing; `lazyLibsqlClient` connects on
  the first `run()` (`:68`, `:77-78`).

---

## 2 · Is there a Postgres backend? No — and there never was.

I searched `packages/`, `registry/`, `registry.json`, `apps/`, `docs/`, `examples/`, the
changelog, and the git history.

**Source and config — zero hits.** `grep -rni 'postgres\|postgre\|pglite\|"pg"\|node-postgres'`
across all `*.ts`, `*.tsx`, `*.md`, `*.json` (excluding `node_modules` and the lockfile)
returns matches **only** in vendored skill documentation (`.agents/skills/domain-modeling/…`,
`.agents/skills/codebase-design/…`) where Postgres is a generic example, plus the two roadmap
rows quoted below. **Nothing in `packages/`.**

**Git history — zero.** All of the following return empty:

```
git log --all --oneline --grep='postgres' -i
git log --all --diff-filter=D --name-only --oneline -- '*postgres*' '*pg*'
git log --all --pretty=format: --name-only --diff-filter=A | sort -u | grep -i 'postgres\|pglite'
```

No removed backend, no abandoned branch, no planned file.

**Published exports.** `packages/whatsappd/package.json` exports exactly `.`, `./testing`,
`./package.json`. `src/index.ts` exports two backend factories and nothing else:
`memoryBackend` (`:72`) and `libsqlBackend` (`:90`).

**What the docs actually say.** `docs/architecture/sdk-capabilities.md:292`, the backend
inventory:

| adapter | credentials | data | leases | media | status |
|---|---|---|---|---|---|
| Memory | yes | yes | yes | yes | **shipped** |
| libSQL backend | yes | yes | yes | injected only | **shipped** |
| Filesystem media | no | no | no | yes | **shipped** |
| Postgres structured adapter | target | target | target using database time | injected only | **`deferred`; post-0.3 #81** |
| PocketBase | target | target | target/worker ownership | target | `deferred`; #26-#29 |
| Convex | target | target | target/worker ownership | target | `deferred`; #33-#37 |

And `docs/standing-decisions.md:139`: *"Postgres, S3-compatible media, and dependent browser
delivery are post-0.3."*

### Is the contract storage-agnostic?

**Yes.** `grep -rn "libsql" src/` outside `src/runtime/libsql*.ts` and `src/stores/libsql.ts`
returns exactly three lines: two re-exports in `src/index.ts:90-91`, and **one doc comment**
in `client.ts:164` citing `libsql.ts:1308` as an example of the message ordering. No import,
no type, no branch. The runtime is typed against `WhatsAppBackend` from `contracts.ts` and
nothing else.

`@libsql/client` is imported by exactly four files, all of them the adapter:
`runtime/libsql.ts`, `runtime/libsql-operations.ts`, `runtime/libsql-transaction.ts`,
`stores/libsql.ts` — and in the first three as `import type` only.

**What a Postgres backend would have to implement** — the five capabilities of
`WhatsAppBackend` (`contracts.ts:607-613`), which ADR-0004 keeps independently replaceable:

| Capability | Methods | The hard part |
|---|---|---|
| `credentials` | `read`, `write`, `clear` | trivial |
| `data` | `accept`, `claim`, `read`, `snapshot`, `messages`, `accepted` | `accept()` must be **one transaction** doing project→mutate→append→stamp with the fencing-token compare inside it (`contracts.ts:460-464`); `read()` must expose a real transaction boundary so a snapshot and a page share one revision (`:482-497`, ADR-0030) |
| `leases` | `acquire`, `renew`, `release` | monotonic `fencingToken` **ordered as a number** (`:536-545`), and — per the inventory row — Postgres would use *database* time, as libSQL already does via `databaseNow` (`libsql.ts:1564`) |
| `media` | `write`, `open` | content-addressed idempotent publish (ADR-0015, ADR-0032) |
| `operations` | `WhatsAppOperationStore` | not audited here |

[inference] The only genuinely libsql-flavoured design choice is *JSON blob per record*, and
that is a free choice, not a requirement: the contract is expressed entirely in TypeScript
record types. A Postgres backend could use real columns and satisfy the same interface. The
conformance suite in §3 would tell you whether it did.

---

## 3 · `memoryBackend` — the reference implementation

`src/runtime/memory.ts:655-663` **[read]**:

```ts
export function memoryBackend(): WhatsAppBackend {
  return {
    credentials: memoryStore(), data: memoryDataStore(), leases: memoryLeaseStore(),
    media: memoryMediaStore(), operations: memoryOperationStore(),
  };
}
```

Exported from the root at `src/index.ts:71-77`, alongside its five parts individually.

**Is it the de-facto reference?** Its own module docstring says so (`memory.ts:1-11`):

> *"These are the reference implementations: same contracts, same account scoping, same
> acceptance semantics as a database backend, with the durable part held in a `Map`."*

It is a real implementation, not a stub: it runs the **same** `projectCurrentMirror`
(`:199`), enforces the **same** fencing rule (`:189-191`), maintains the same
`pendingUpdates` side table (`:242-247`), and implements `read()` as a genuine transaction —
it awaits all queued acceptances, then **pins** a copy of every map (`:124-132`, `:177-183`)
so nothing offered afterwards can reach the answers `fn` gets. Its `messages()` sorts by the
same `(timestamp, messageId)` order (`:70-71`) with the same limit+1 lookahead
(`:161-165`).

### Does a conformance suite exist?

**Yes.** `tests/data-store-conformance.ts` — 1181 lines, exporting
`dataStoreConformance(name, create)` (`:150`). It is run against **both** implementations from
`tests/libsql-backend.test.ts:29-47` **[read]**:

```ts
dataStoreConformance("memory data", async () => ({
  data: (await import("../src/runtime/memory.ts")).memoryDataStore(),
  close: async () => {},
}));

dataStoreConformance("libSQL data", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "whatsappd-libsql-data-"));
  const backend = libsqlBackend({
    url: pathToFileURL(path.join(directory, "whatsapp.db")).href,
    accountId: ACCOUNT, media: memoryMediaStore(),
  });
  return { data: backend.data, async close() { await backend.close(); await rm(directory, …); } };
});
```

Two sibling suites exist on the same pattern: `tests/operation-store-conformance.ts`
(`operations.test.ts:17`) and `tests/store-conformance.ts` for credential stores
(`stores.test.ts:6`).

### Is it shipped to consumers? **No.**

- `package.json` `files: ["dist", "CHANGELOG.md"]` — `tests/` is not published.
- `exports` are `.`, `./testing`, `./package.json` only.
- `./testing` (`src/testing.ts`, 227 lines) ships `textMessage()` and
  `createTestWhatsAppSession()` — a **session** driver for testing handlers. It contains no
  backend conformance assertions at all.

[inference] Consequence for Ambient: if we ever write our own `WhatsAppDataStore` (a
files-backed one, say), **there is no shipped suite to prove it conforms.** We would have to
vendor `tests/data-store-conformance.ts`, or accept that our implementation is unverified
against the contract. That is a concrete argument for *reading* whatsappd's store rather than
*reimplementing* it.

---

## 4 · The read path — THE ONE THAT MATTERS

### 4.1 How a consumer gets a `MirrorView`

`MirrorView` (`contracts.ts:437-440`) is exactly two methods:

```ts
export interface MirrorView {
  snapshot(): Promise<WhatsAppSnapshot>;
  messages(chatId: string, options?: StoredMessagePageOptions): Promise<StoredMessagePage>;
}
```

There is **one** public way to obtain one: `WhatsAppDataStore.read(accountId, fn)`
(`contracts.ts:497`). The view is valid only for the duration of `fn`.

| Surface | Where | Needs a runtime? | Needs a lease? |
|---|---|---|---|
| `backend.data.read(accountId, fn)` → `MirrorView` | `contracts.ts:497` | **no** | **no** |
| `backend.data.snapshot(accountId)` | `contracts.ts:500` | **no** | **no** |
| `backend.data.messages(accountId, chatId, opts)` | `contracts.ts:513` | **no** | **no** |
| `runtime.snapshot()` | `runtime.ts:213` | yes | no, but the runtime needs `openSession` |
| `runtime.messages(chatId, opts)` | `runtime.ts:215` | yes | ditto |
| `client.read(fn)` → `MirrorView` | via `ClientRuntimeSource.read` | yes + a client | yes |

**The runtime adds nothing to the read path.** `runtime.ts:813-814` **[read]**:

```ts
snapshot: () => backend.data.snapshot(accountId),
messages: (chatId, options) => backend.data.messages(accountId, chatId, options),
```

Pure pass-throughs. And the store's own `snapshot`/`messages` are themselves one-liners over
`read` (`libsql.ts:1545-1547`):

```ts
snapshot: (accountId) => read(accountId, (mirror) => mirror.snapshot()),
messages: (accountId, chatId, options) => read(accountId, (mirror) => mirror.messages(chatId, options)),
```

So `read()` is the primitive; everything else is sugar. Meanwhile `createWhatsAppClient`
*requires* a runtime built by `createWhatsAppRuntime` — it looks the runtime up in a private
`WeakMap` and throws otherwise (`client.ts:254-259`) — and `createWhatsAppRuntime` requires an
`openSession` callback (`runtime.ts:185`). **Neither is on Ambient's path.**

### 4.2 Can a consumer read with NO socket, NO lease, NO runtime?

**Yes. [measured], cross-process, against a live writer.**

The trace **[read]**:

1. `libsqlBackend(options)` → `lazyLibsqlClient(options, migrate)` (`libsql.ts:1644`).
   Constructs nothing; connects on first use.
2. `backend.data.read(accountId, fn)` → `transact(client, "read", t => fn(view(t, accountId)))`
   (`libsql.ts:1457-1458`).
3. `transact` → `client.run(op, "read")` (`libsql-transaction.ts:9-21`).
4. First call: `ready === undefined`, so it queues, connects, sets `busy_timeout`, enters WAL,
   runs `migrate` (`stores/libsql.ts:154`, `:77-115`).
5. `opened.transaction("read")`, then `view.snapshot()` / `view.messages()` — plain `SELECT`s
   (`libsql.ts:1337-1453`).

`leases.acquire()` is never called. `createWhatsAppRuntime` is never called. No Baileys import
is reached. The `media` field is required by `LibsqlBackendOptions` (`:52`) but is never
touched by any data read — it is only stored on the returned object (`:1650`).

The measurement — writer process alive, lease held, its client open:

```
WRITER lease still held: {"accountId":"personal","holderId":"writer-1","fencingToken":1,"expiresAt":…}
WRITER_HOLDING_OPEN

  ── separate process, no lease, no runtime, no socket ──

READER chat person@s.whatsapp.net isGroup=false lastMessageAt=1700000000012 -> 10 messages in 4 pages
READER chat room@g.us    isGroup=true  subject=The Room lastMessageAt=1700000000020 -> 1 messages in 1 pages
READER read completed in 88 ms WITHOUT a lease
READER revision: 2
READER contactAliases: {"99999@lid":"person@s.whatsapp.net","person@s.whatsapp.net":"person@s.whatsapp.net"}
READER MEDIA bytes: [1,2,3,4,5,6,7,8]
READER lease steal attempt: {"acquired":false,"heldUntil":…}
```

**The one caveat, [measured]:** the file must be **writable**. Copying the database to a
read-only location and opening it there fails:

```
LibsqlError: UNKNOWN_SQLITE_ERROR_1544: attempt to write a readonly database
    at file:///…/packages/whatsappd/src/stores/libsql.ts:106:40
```

`:106` is `PRAGMA journal_mode = WAL` — it fails *before* migrations. Ambient needs write
permission on the `.db` file and its directory (SQLite creates `-wal` and `-shm` beside it).

### 4.3 Paging semantics

`libsql.ts:1417-1453` and `contracts.ts:311-365` **[read]**.

- **Ordering.** `ORDER BY timestamp DESC, message_id DESC` (`:1425`), backed by index
  `wa_message_page` (`:119-120`). Both parts are required: `contracts.ts:306-309` explains
  that a history sync lands several messages on one second, and a boundary inside a collision
  would drop or repeat one.
- **Default `limit`.** **25** — `options?.limit ?? 25` (`libsql.ts:1314`; memory `:148`;
  documented `contracts.ts:329`). A non-positive-integer limit throws `RangeError` (`:1315-1316`).
- **The `before` predicate** is strict on the composite key (`:1424`):
  ```sql
  AND (timestamp < ? OR (timestamp = ? AND message_id < ?))
  ```
- **`nextBefore` absent = nothing older is *stored*.** The query asks for `limit + 1`
  (`:1427-1428`) and slices to `limit` (`:1430`); `nextBefore` is set **only** if that extra
  row existed (`:1445`). So following it can never yield an empty page.
  `contracts.ts:357-362` is emphatic that absence says **nothing** about WhatsApp — an
  application may say "no older messages are saved", never "all history is loaded" (ADR-0010).
- **Termination and no-skip/no-repeat.** Guaranteed. Each page sets the cursor to its own last
  row, the predicate is strictly `<` in the same total order the index provides, and a page is
  only offered when a strictly-older row exists. `contracts.ts:789-791` adds the property that
  matters for a live mirror: the cursor is *a position in the ordering, not an offset*, so a
  record inserted below an open cursor still falls inside the next page.

**[measured]** — 10 messages, `limit: 3`, three of them sharing timestamp `AT+2`:

```
4 pages: [m-editme, m-revokeme, m-media] [m-4, m-3, m-collide-b] [m-collide-a, m-2, m-1] [m-0]
```

All ten, exactly once, correctly ordered, with the three-way timestamp collision
(`m-collide-b`, `m-collide-a`, `m-2`) split across a page boundary and neither dropped nor
duplicated.

### 4.4 `revision` on a page, and torn reads

`revision` (`contracts.ts:343-352`) is *"the handle that orders this page against the patch
stream"* — every change up to and including it is reflected in the page. Same number, same
meaning, as `WhatsAppSnapshot.revision`. Read from `accountState` inside the same transaction
(`libsql.ts:1419`, `:1449`).

**Can a consumer paging across a concurrent write get a torn read? No — inside `read()`.**

[read] `read()` runs every call in **one** libSQL read transaction (`libsql.ts:1457-1458`),
and the docstring at `contracts.ts:482-497` (ADR-0030) says that is precisely why it exists:
without it a consumer gets two reads at two revisions and the only fix above the store is an
unbounded read-compare-retry loop.

**[measured]** — reader inside `read()`, another **process** committing mid-callback:

```
READER inside txn, before concurrent write: revision 2  chats 2  page1 rev 2  [m-editme, m-revokeme, m-media]
WRITER committed DURING the read, in 156 ms: seq 3 rev 2 -> 3
READER inside txn, AFTER concurrent write:  revision 2  chats 2
READER RESULT: {"firstRev":2,"secondRev":2,"firstChats":2,"secondChats":2,
                "all":[m-editme,m-revokeme,m-media,m-4,m-3,m-collide-b,m-collide-a,m-2,m-1,m-0],"pages":4}
READER fresh read AFTER txn closed: revision 3  chats 3
```

The write added a message to an existing chat **and a whole new chat**. Neither appeared. The
revision never moved. Every page stayed on the same snapshot. And the writer was **not
blocked** — it committed in 156 ms while the read transaction was open. That is WAL doing
exactly what `stores/libsql.ts:96-107` describes.

**Outside `read()` there is no such guarantee** — [inference] — because `snapshot()` and
`messages()` each open their own transaction (`:1545-1547`). Ambient must do a whole account
inside **one** `read()`, or accept that chats and messages come from different revisions.

**One hazard to respect.** `contracts.ts:490-496` warns that calling the store's *own*
`snapshot()`/`messages()` from inside `fn` opens a second, later read that "queues behind the
one still waiting on `fn` and does not return." On a WAL file that specific deadlock does not
arise (reads skip the queue, `stores/libsql.ts:154-167`), but the fallback path when WAL was
not reached is still the queue (`:160-164`, and in-memory databases report `memory`). **Use
the `view` handed to `fn`; never the store.**

### 4.5 Is `WhatsAppSnapshot` enough to map a chat to a folder?

`contracts.ts:291-300`: `accountId`, `revision`, `account`, `chats`, `contacts`,
`contactAliases`, `groups`. Deliberately **no** message window per chat (ADR-0010).

**For naming a folder — yes.** [read] + [measured]:

- **Group chat** → `ChatRecord.subject` (`:189`), or `GroupRecord.subject` (`:231`), plus
  `participants` when WhatsApp has supplied a roster. Measured: `subject=The Room`.
- **1:1 chat** → `ChatRecord.subject` is **absent** (measured: `subject=-`). Resolve it:
  `contactAliases[chatId] → contactId → contacts.find(…)` → `displayName` / `profileName` /
  `verifiedName` / `username` (`:196-203`). Measured: `chatId "person@s.whatsapp.net"` →
  alias → contact `{displayName: "Alice", nativeIds: ["person@s.whatsapp.net","99999@lid"]}`.
  The alias map is what makes this work when a chat is keyed by a LID and the contact by a PN.

**Three things that are genuinely missing** — [read], and worth deciding about:

1. **The account's own WhatsApp address.** `AccountRecord` is `{accountId, lastConnectedAt?,
   lastDisconnectedAt?}` (`:246-252`) — no self address. `WaIdentity` exists only on the
   **live** `runtime.identity()` / `client.identity()` (`runtime.ts:257`, `client.ts:202`) and
   is deliberately cleared on stop. From the mirror alone, Ambient cannot say "which address
   is me" except by inference from `sender` on any `fromMe: true` message.
2. **No chat metadata beyond subject/isGroup/lastMessageAt.** No archived, pinned, muted,
   unread-count or ephemeral-timer field — `ChatRecord` is four fields (`:185-192`) and
   `HistoryChat` (`model/history.ts:4-10`) never carried them either. Nothing to lose; it was
   never modelled.
3. **No message count per chat.** `lastMessageAt` only. A folder writer must page to find out.

---

## 5 · What the consumer must handle in a `MessageRecord`

**Every one of these is current state.** A re-read gives the truth; Ambient never has to apply
an event itself. `projection.ts` mutates the stored record in place and `accept()` commits it
in the same transaction as the log append.

| Field | Current state? | Where it is computed | Note |
|---|---|---|---|
| `reactions: readonly MessageReaction[]` | **yes** | `projection.ts:439-469` | Keyed by `subject = update.by ?? "aggregate"`. A `removed: true` update **filters the entry out** (`:442-443`); a changed emoji replaces in place (`:456-465`). So the array is the live set, never an event trail. |
| `receipts: readonly MessageReceipt[]` | **yes** | `withReceipt`, `:404-423` | Keyed by `subject = by === undefined ? "aggregate" : "participant:"+by`. One entry per subject, **overwritten** (`:415-421`). Only the latest status per subject survives. |
| `editedAt?: number` | **yes** | `:478-502` | The record's **content** is replaced via `withCurrentContent`, and `editedAt` is set. Reading the record gives the edited text; the original is gone from the mirror. |
| `kind: "revoked"` | **yes** | `:504-524` | The arm is **replaced**. `receipts`, `reactions`, `sender`, `timestamp`, `editedAt` are carried over; the content is dropped. Carries `revokedAt?`, `revokedBy?`. A revoke on an already-revoked message is a no-op (`:479` guards edits, `:523` guards by equality). |
| `media: DurableMedia` | **yes** | `contracts.ts:57-66` | `{state:"stored", ref, byteLength} & MediaMeta` or `{state:"failed", reason:"download_failed"\|"store_failed"} & MediaMeta`. Bytes are captured at accept time (ADR-0015); the record never holds a live closure. |
| `votes` on `kind: "poll"` | **yes** | `withPollVotes`, `:385-402` | Recomputed from the latest per-voter selection. Option identity is `sha256(option label)`. |

**[measured]** — read cold from the file by a process that never saw the events:

```json
{"id":"m-0","kind":"text","text":"hello 0",
 "reactions":[{"subject":"person@s.whatsapp.net","emoji":"👍","by":"person@s.whatsapp.net","at":1700000000030}],
 "receipts":[{"subject":"aggregate","status":"read","at":1700000000031}]}
{"id":"m-editme","kind":"text","text":"EDITED TEXT","editedAt":1700000000032}
{"id":"m-revokeme","kind":"revoked","revokedAt":1700000000033}
{"id":"m-media","kind":"image","media":{"mimetype":"image/png","state":"stored",
 "ref":"media:v1:76fd5a0a…","byteLength":8}}
```

### What is only in the log, and never lands in the mirror

**[measured]** — same run, comparing the mirror against `accepted()`:

```
log has 'SECRET ORIGINAL TEXT': true     mirror has 'SECRET ORIGINAL TEXT': false
log has 'ORIGINAL BEFORE EDIT': true     mirror has 'ORIGINAL BEFORE EDIT': false
log has orphan 🔥 reaction:    true      mirror has orphan 🔥 reaction:    false
```

1. **Pre-revoke content.** The revoke replaces the arm; the original text/media is only in
   `wa_accepted_batches.events_json`.
2. **Pre-edit content.** Same — the mirror holds the latest text only.
3. **Superseded receipt statuses.** `delivered` → `read` on one subject overwrites; the
   intermediate transition survives only in the log.
4. **Orphan updates** — an update whose message never arrived. It is durable, but it lives in
   `wa_pending_message_updates`, **not** on any `MessageRecord`, and no read surface exposes
   that table. **[measured]**, straight from the file:
   ```
   wa_pending_message_updates: 1 rows
   {"account_id":"personal","chat_id":"person@s.whatsapp.net","message_id":"m-NEVER-ARRIVES",
    "data_json":"[{\"kind\":\"reaction\",…,\"emoji\":\"🔥\",\"removed\":false,\"at\":1700000000034}]"}
   ```
   [inference] For Ambient this is benign: if the message never arrives there is no file to
   attach the reaction to. It becomes visible automatically the moment the message lands
   (`projection.ts:373-375`).

**Not in *either*:** presence and connection **status**. They are excluded from
`WhatsAppDurableEvent` **by type**, not by a runtime filter (`contracts.ts:88-103`), so it is
impossible to hand one to a data store. Only the derived `ObservedInstant` is durable —
`contact.lastSeenAt`, `account.lastConnectedAt`/`lastDisconnectedAt` (ADR-0020). Nothing is
lost that Ambient could want in a file.

**Verdict for the framing question.** ADR-0014's "Ambient Brain boundary" paragraph is about
consumers that need *source history* — it says the log exists so that "edits and revocations
overwrite current state and cannot reproduce source history". Ambient's job is to write
**current state** into files. The mirror is the correct surface; the log would only matter if
we wanted to render "edited" diffs or recover revoked content.

---

## 6 · Media bytes

**Is `open()` all that is needed? Yes. [measured]** — round-tripped `[1,2,3,4,5,6,7,8]` from a
process that never wrote them, holding only the `ref` off the `MessageRecord`.

```ts
open(input: { readonly accountId: string; readonly ref: string })
  : Promise<AsyncIterable<Uint8Array> | null>;      // contracts.ts:592-595
```

`fileMediaStore.open` (`file-media.ts:105-116`) **[read]** does exactly three things: parse
the ref, compute the path, `createReadStream`. No index, no database, no manifest. It returns
`null` — never throws — for a malformed ref (`:107`), a non-file (`:110`) or `ENOENT`
(`:113`).

**Where on disk.** `file-media.ts:44-52` + `media.ts:6`:

```
<options.directory>/.whatsappd-media/<sha256hex(accountId)>/<sha256hex>.bin
```

**[measured]**, with `directory=<dir>`, `accountId="personal"`:

```
<dir>/.whatsappd-media/4a0a339b0c6d0553897752a84115adc81c75812e1743eb2519258e5000f70deb/
      76fd5a0a87ff8221a046406324705896f94324f8633d81e4a37b1117bbaa37f9.bin
-rw-------  8 bytes          (directories drwx------)
```

`4a0a339b…` is exactly `sha256("personal")` — verified independently. Files are `0600` inside
`0700` directories (`:62`, `:96`, `:24-25`).

**The `ref` format.** `media.ts:31`, `:34`:

```ts
ref = `media:v1:${sha256hex}`                       // validated by /^media:v1:([0-9a-f]{64})$/
```

The digest covers `JSON.stringify([accountId, owner, kind])`, then a `\0` separator, then
every byte (`media.ts:15-31`), where `owner` is `[chatId, messageId]` for a message. So it is
content-addressed **and** owner-scoped: identical bytes in two different messages get
different refs, and re-storing the same message's bytes is idempotent (the `EEXIST` branch at
`file-media.ts:86-95` verifies the existing object matches rather than rewriting).

**Two consequences for Ambient** — [inference]:

- Ambient must construct `fileMediaStore({directory})` with **the same `directory`** whatsappd
  used, and pass **the same `accountId`**. Both are inputs to the path; neither is recoverable
  from the ref.
- The ref is not reversible to a chat or message id (it is a hash). The `MessageRecord` is the
  only link from a file back to its message.

---

## The read path, as code

Everything below is reachable from `whatsappd`'s public root export. No socket, no lease, no
runtime, no client.

```ts
import {
  libsqlBackend,
  fileMediaStore,
  type ChatRecord,
  type ContactRecord,
  type MessageRecord,
  type StoredMessageCursor,
  type WhatsAppSnapshot,
} from "whatsappd";

/** One account's entire mirror, read at a single revision. */
interface MirrorDump {
  readonly revision: number;
  readonly snapshot: WhatsAppSnapshot;
  readonly messagesByChat: ReadonlyMap<string, readonly MessageRecord[]>;
}

export async function dumpMirror(options: {
  readonly accountId: string;
  /** The .db file whatsappd wrote. Must be WRITABLE — see the caveat below. */
  readonly databaseUrl: string;
  /** The SAME directory whatsappd passed to fileMediaStore(). */
  readonly mediaDirectory: string;
  readonly pageSize?: number;
}): Promise<MirrorDump> {
  const backend = libsqlBackend({
    url: options.databaseUrl,
    accountId: options.accountId,
    // Required by the type; never touched by a data read. Supplying the real
    // one anyway, because §6 needs it and it costs nothing.
    media: fileMediaStore({ directory: options.mediaDirectory }),
  });

  try {
    // ONE transaction. Every answer below is at ONE revision, and a writer
    // committing meanwhile cannot be seen by any of them (§4.4, measured).
    return await backend.data.read(options.accountId, async (view) => {
      const snapshot = await view.snapshot();

      const messagesByChat = new Map<string, readonly MessageRecord[]>();
      for (const chat of snapshot.chats) {
        const all: MessageRecord[] = [];
        let before: StoredMessageCursor | undefined;

        // Terminates: each page's cursor is its own last row, the predicate is
        // strictly `<` in a total order, and `nextBefore` is only present when a
        // strictly-older row exists — so this never loops and never yields an
        // empty page (§4.3).
        for (;;) {
          const page = await view.messages(chat.chatId, {
            ...(before && { before }),
            limit: options.pageSize ?? 500,
          });
          all.push(...page.messages);       // newest first
          if (!page.nextBefore) break;      // nothing older is STORED — says
          before = page.nextBefore;         // nothing about WhatsApp (ADR-0010)
        }

        messagesByChat.set(chat.chatId, all);
      }

      return { revision: snapshot.revision, snapshot, messagesByChat };
    });
  } finally {
    await backend.close();
  }
}

/** Name a chat's folder from the snapshot alone (§4.5). */
export function folderNameFor(chat: ChatRecord, snapshot: WhatsAppSnapshot): string {
  if (chat.subject) return chat.subject;                    // groups carry one
  const contactId = snapshot.contactAliases[chat.chatId];   // PN/LID → contact
  const contact: ContactRecord | undefined =
    contactId === undefined
      ? undefined
      : snapshot.contacts.find((c) => c.contactId === contactId);
  return (
    contact?.displayName ??
    contact?.profileName ??
    contact?.verifiedName ??
    contact?.username ??
    chat.chatId
  );
}

/** Media bytes back out, given a stored MessageRecord (§6). */
export async function mediaBytes(
  media: ReturnType<typeof fileMediaStore>,
  accountId: string,
  message: Extract<MessageRecord, { readonly media: unknown }>,
): Promise<Uint8Array | null> {
  if (message.media.state !== "stored") return null;        // "failed" — no bytes
  const stream = await media.open({ accountId, ref: message.media.ref });
  if (!stream) return null;                                 // never throws
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}
```

**Rules this sketch encodes, each measured or read:**

1. **Never call `backend.data.snapshot()` or `.messages()` from inside `read()`'s callback.**
   Use the `view`. `contracts.ts:490-496`.
2. **`limit` defaults to 25** if omitted (`libsql.ts:1314`). 500 is a deliberate choice for a
   bulk dump; the value is a database page size and unrelated to WhatsApp's 50
   (`contracts.ts:322-329`).
3. **`nextBefore` absent means nothing older is *stored*** — never that WhatsApp has no more
   (`contracts.ts:357-362`, ADR-0010).
4. **The database file must be writable.** `libsqlBackend` runs `PRAGMA journal_mode = WAL`
   before anything else and dies on a read-only file (`stores/libsql.ts:106`, measured).
5. **`@libsql/client` must be a direct dependency of Ambient** — it is an *optional* peer of
   `whatsappd` (`package.json`), so nothing installs it for us.
6. **Reading cannot disturb the writer** — measured both ways: the reader never acquired the
   lease, and the writer committed in 156 ms with the reader's transaction open.

---

## What this does not establish

- **Scale.** Every measurement is on a database with 11 messages and 2 chats. Nothing here
  says how `read()` behaves holding one transaction open across a 100k-message dump, whether
  the WAL grows unboundedly while a long reader is open, or whether `limit: 500` is a sensible
  page size. **What would answer it:** run `dumpMirror` against a real synced account
  database and measure wall time, peak RSS, and `-wal` file size.
- **`WhatsAppOperationStore`.** I did not audit `libsql-operations.ts` (343 lines) or the
  `wa_operations` table. Irrelevant to reading, relevant if Ambient ever sends.
- **The credential table.** `wa_auth` sits in the *same file* as the mirror. Ambient opening
  that file has the account's Baileys credentials in reach. I did not assess what that means
  for how Ambient should be permissioned. **What would answer it:** a decision, not a
  measurement.
- **Whether the mirror is *complete* relative to WhatsApp.** This establishes that the mirror
  can be read exhaustively; it says nothing about how much history whatsappd received in the
  first place. `docs/architecture/history-semantics.md` (updated `f057ca7`, 2026-08-17) owns
  that, and findings 01 and 03 already cover it.
- **The remote (Turso) path.** Everything measured is `file:`. `libsql://` shares the code but
  not the WAL/queue behaviour (`stores/libsql.ts:92` gates on `protocol === "file"`).
- **`accepted()` in production conditions.** I hit its strict decoder twice with malformed
  fixtures, which proves the decoder is strict and that one bad row fails a whole page — it
  does **not** prove whatsappd's own runtime ever writes a row that fails to decode. In
  production the events come from its typed pipeline. **What would answer it:** run
  `accepted(accountId, 0)` over a real synced database and see whether it completes.
- **Migration on an older file.** Every probe started from an empty database. I did not test
  opening a file written by an earlier whatsappd version, or what
  `replaceEmptyLegacyOperationTable` (`libsql.ts:172-186`) does to one that has durable rows —
  it throws by design.
