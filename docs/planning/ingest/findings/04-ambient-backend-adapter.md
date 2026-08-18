# INGEST · R4 — Can Ambient supply its own `WhatsAppBackend`?

**Question.** Can Ambient implement `whatsappd`'s `WhatsAppBackend` itself — one that
writes straight into `~/.ambient/blobs/<sha256>` and `~/.ambient/chats/<slug>/transcript.jsonl` —
instead of running `libsqlBackend` and paging its SQLite log into our format?

**Sources.** The `whatsappd` checkout at `/Users/abuusama/projects/whatsappd`, read only
and never written. Primary source files, ADRs, the architecture notes, the test suite, plus
Ambient's own `src/modules/transcript/types.ts` and `src/modules/blobs/`.

Every claim carries `file:line`. Paths under `packages/whatsappd/` are relative to
`/Users/abuusama/projects/whatsappd/`; Ambient paths are relative to
`/Users/abuusama/projects/ambient/`. Statements marked **[read]** come from the cited line.
Statements marked **[inference]** are mine and are asserted by no source.

---

## Verdicts

| # | Sub-question | Verdict |
|---|---|---|
| 1 | Is `WhatsAppBackend` a real third-party interface? | **Yes, and it says so in the tests.** All five capabilities are published types, independently replaceable by ADR-0004, and the test suite calls `WhatsAppDataStore` "a published contract an application may implement". But **no in-repo test builds one from scratch** — every custom backend in the suite is a decorator over `memoryBackend()`. |
| 2 | Does the runtime call `snapshot()` / `messages()` / `read()` during pair-and-sync? | **No. Never.** The runtime's only internal data-store calls are `accept()` and `claim()`. The three reads exist solely to be handed outward. A write-only adapter is viable *for a runtime that never builds a `WhatsAppClient`*. |
| 3 | `accepted()` / `WhatsAppPatch` / `onFrame` | **`accepted()` has zero call sites in `src/`** — tests only. It is the outside-consumer read, and ADR-0014 names it "the Ambient Brain boundary" explicitly. `onFrame` is the runtime's own publication API; the runtime pushes to it and never reads it. |
| 4 | Can `MediaStore.write` return a content SHA-256 as the `ref`? | **Yes.** `ref` is opaque: exactly one function parses one, and it lives inside `fileMediaStore`. The only validation anywhere is "non-empty string". `write` must be idempotent on identical input, which a content hash satisfies more strongly than the in-repo scheme. One divergence: `open` is contractually account-scoped and a global blob store is not. |
| 5 | `CredentialStore` as a plain file | **Yes — use `fileStore()` as-is.** It writes one `store.json` under a `.whatsappd-credentials/` namespace inside a directory you name, 0700/0600, atomic rename. Point it at an Ambient Place and stop. |
| 6 | Where is the projection? | **Inside the backend, below the runtime.** `projectCurrentMirror` is imported by `memory.ts` and `libsql.ts` only, and called from inside each store's `accept()`. Ours simply would not have one — nothing in the runtime notices. But it is **not exported from the package**, so we could not reuse it either. |
| 7 | What does a mirror-less adapter lose? | Message dedup (the keyed mirror read *is* the dedup), out-of-order update buffering, edit/revoke application, and the `requestHistory` anchor. Lease fencing and operation retries are separable and cheap to keep. |
| 8 | Bottom line | **Viable-with-a-minimal-mirror.** The runtime will not stop us. But the adapter *relocates* the mapping step rather than deleting it, and the smallest durable state it still needs is three things — a per-account counter triple, a `(chatId, messageId)` seen-index, and a per-chat oldest-message anchor carrying two fields our `LiveMessage` shape does not currently have. |

---

## 1 — Is `WhatsAppBackend` genuinely implementable by a third party?

### The grouping is explicitly a convenience, not a coupling

`packages/whatsappd/src/runtime/contracts.ts:598-613` **[read]**:

```ts
/**
 * A convenience grouping of one deployment's capabilities.
 *
 * @remarks
 * The capabilities stay independently replaceable: credentials may live in
 * libSQL while data lives in PocketBase. …
 */
export interface WhatsAppBackend {
  readonly credentials: CredentialStore;
  readonly data: WhatsAppDataStore;
  readonly leases: AccountLeaseStore;
  readonly media: MediaStore;
  readonly operations: WhatsAppOperationStore;
}
```

`docs/adr/0004-backend-capabilities-remain-independent.md` **[read]** — credentials, data,
commands, leases and media "remain separate capabilities with independent contracts", and a
factory "may provide them together for convenience without merging their lifecycles".

The file header at `contracts.ts:6-10` **[read]** adds the invariant an implementer must
honour: "Every durable method names its account explicitly — no implementation may infer the
account from insertion order, a message id, or the current process."

### The tests say a third party may implement the data store

`packages/whatsappd/tests/client.test.ts:3015-3017` **[read]**, in a test comment:

> `WhatsAppDataStore` is a published contract an application may implement, so this is
> reachable from a third-party adapter even though neither in-tree store can produce it.

and `client.test.ts:3079-3083` **[read]**: "The adapter boundary. … A third-party store is
still a trust boundary, and rows read back under the wrong chat id is the worst way for it to
be wrong."

Both tests then *build* the deviation by wrapping `memoryBackend()`
(`client.test.ts:3024-3045`, `client.test.ts:3086-3109`).

### But nothing in-repo builds one from scratch

Every `WhatsAppBackend` literal in the suite is a spread of `memoryBackend()` with one
capability swapped — `leases` (`client.test.ts:312`, `:821`, `:2418`), `media`
(`runtime.test.ts:1563-1574`, `operations.test.ts:257`), or a `data` decorator that delegates
to the inner store (`client.test.ts:3026-3045`). The closest thing to a from-scratch
implementation contract is `packages/whatsappd/tests/data-store-conformance.ts` — a
factory-parameterised suite (`:23-28`) exercising `accept`/`claim`/`accepted`/`snapshot`/
`messages`/`read` in ~1200 lines, run against both in-tree stores.

**It is not shipped.** `packages/whatsappd/package.json:30-34` **[read]** exposes only
`"."` → `./dist/index.mjs` and `"./testing"` → `./dist/testing.mjs`; `src/testing.ts` contains
event drivers and command recorders, no conformance export. A third-party backend therefore
has the *types* but not the *test that says it is right*.

### The five capabilities, one row each

| Capability | Contract | Methods | Non-libsql reference | Which the **runtime** calls |
|---|---|---|---|---|
| `credentials` | `src/ports.ts:25-38` | 3 — `read`, `write`, `clear` | `memoryStore` (`src/stores/memory.ts:8`), `fileStore` (`src/stores/file.ts:71`) | none directly — handed to `config.openSession(backend.credentials)` at `runtime.ts:754` |
| `data` | `contracts.ts:443-530` | 6 — `accept`, `claim`, `read`, `snapshot`, `messages`, `accepted` | `memoryDataStore` (`src/runtime/memory.ts:82`) | **`accept` (`runtime.ts:473`) and `claim` (`runtime.ts:740`) only** |
| `leases` | `contracts.ts:550-565` | 3 — `acquire`, `renew`, `release` | `memoryLeaseStore` (`memory.ts:314`) | all three — `runtime.ts:729`, `:695`, `:630` |
| `media` | `contracts.ts:583-596` | 2 — `write`, `open` | `memoryMediaStore` (`memory.ts:613`), `fileMediaStore` (`src/runtime/file-media.ts:44`) | `write` on every media message (`runtime.ts:49-61`); `open` only for outbound send (`operation-executor.ts:30`) |
| `operations` | `src/runtime/operations.ts:111-153` | 13 | `memoryOperationStore` (`memory.ts:357`) | `subscribe`, `claim`, `recoveryDelay`, `start`, `succeed`, `fail`, `unknown`, `release` — the executor loop at `operation-executor.ts:164-211` |

No member of any of the five is optional in TypeScript: all 27 methods must exist. What
varies is whether the runtime ever reaches them.

The remaining four operation methods — `submit`, `get`, `list`, `acknowledge` — are called
only by the client (`client-operations.ts:384`, `:392`, `:608`; `client.ts:1059`). For a
receive-only Ambient runtime the executor still calls `claim` and `recoveryDelay` the moment
the session reports online (`operation-executor.ts:164-178`, driven from
`runtime.ts:530` `operationExecutor.setOnline`), so those two must at minimum return
`undefined` honestly. **[inference]** `memoryOperationStore()` satisfies this with no work.

---

## 2 — The hard part: does the runtime ever call the reads?

**No.** There are exactly five `backend.data.*` call sites in the whole of `src/`:

| Line | Call | Reached by |
|---|---|---|
| `runtime.ts:473` | `backend.data.accept(accountId, [event], claim.fencingToken)` | every session handler, internally |
| `runtime.ts:740` | `backend.data.claim(accountId, lease.fencingToken)` | `open()`, once at start |
| `runtime.ts:813` | `backend.data.snapshot(accountId)` | **the body of `runtime.snapshot`** — a public method |
| `runtime.ts:814` | `backend.data.messages(accountId, chatId, options)` | **the body of `runtime.messages`** — a public method |
| `runtime.ts:849` | `backend.data.read(accountId, fn)` | **the `read` field of `clientSourceFor`** — handed to the client |

The last three are definitions, not calls. Nothing inside the runtime invokes
`runtime.snapshot()` or `runtime.messages()`.

### The start path touches no read

`runtime.ts:726-773` **[read]** — `open()` does, in order: `leases.acquire` (`:729`),
`data.claim` (`:740`), start the renewal heartbeat (`:743`), `config.openSession(backend.credentials)`
(`:754`), `opened.subscribe(handlers)` (`:761`), supervise `opened.start()` (`:764`). No read.

### The steady-state path touches no read

`runtime.ts:506-568` **[read]** — every handler (`message`, `update`, `conversationSync`,
`contact`, `group`, `connection`, `presence`) funnels into `accept()` → `acceptUnder()`
(`:467-480`), which calls `backend.data.accept` and then inspects exactly three fields of the
result:

```ts
const accepted = await backend.data.accept(accountId, [{ observedAt: Date.now(), event }], claim.fencingToken);
if (accepted.revision === accepted.fromRevision) return;
publishDurable({ type: "patch", patch: accepted.patch });
```

`runtime.ts:473-479` **[read]**. `accepted.seq` and `accepted.events` are never read by the
runtime. A store that always returns `revision === fromRevision` publishes nothing and the
runtime carries on.

### Where `snapshot()` *is* reached

Only through `durableFrames` (`runtime.ts:973-1067`), which calls `source.snapshot()` at
`:1017` and again on every revision gap at `:1039`. `durableFrames` has two entry points:
`clientSourceFor.frames` (`runtime.ts:838`) and `createRuntimeMirrorReader.watch`
(`runtime.ts:1080`). Both are lazy and consumer-entered — `clientSourceFor` is a `WeakMap`
registration (`runtime.ts:834`), not an invocation.

`client.ts:1004-1006` and `client.ts:1112` **[read]** are the client's two `read()` uses:
paging older messages, and re-reading the mirror when a client attaches to an
already-closed runtime.

### Conclusion for 2

**A write-only data store is viable for a runtime that never constructs a `WhatsAppClient`,
never calls `runtime.snapshot()`, and never calls `runtime.messages()`.** The three reads may
be stubs that throw. That is a real property of the code as written, not a loophole —
`contracts.ts:485-495` **[read]** explains `read()` exists precisely because "opening a
conversation needs both global state and that chat's newest page", which is a UI concern.

---

## 3 — `accepted()`, `WhatsAppPatch`, `onFrame`

### `accepted()` is never called by whatsappd

Repo-wide grep for `.accepted(`: `contracts.ts:525` (the declaration), the two
implementations (`memory.ts:291`, `libsql.ts`), and **41 test call sites** across
`tests/libsql-backend.test.ts`, `tests/data-store-conformance.ts` and `tests/runtime.test.ts`.
Zero production call sites in `src/`.

It is designed for us specifically. `docs/adr/0014-accepted-source-batches-are-durable-and-followable.md`
**[read]**:

> Backend consumers may follow accepted source batches from a consumer-owned revision cursor.
> **This is the Ambient Brain boundary**: messages, edits, reactions, receipts, and
> revocations remain distinct source observations even though the client mirror projects
> their current state.

and `docs/standing-decisions.md:44` **[read]**: "Ambient Brain follows accepted source
batches, not live callbacks or mirror patches — Architecture". Also `:56` — "durable backend
catch-up for consumers such as Ambient Brain".

The same ADR records why the two alternatives were rejected: consuming live callbacks fails
because "a disconnected Brain cannot recover missed observations", and reconstructing from
mirror patches fails because "edits and revocations overwrite current state and cannot
reproduce source history".

### `WhatsAppPatch` and `onFrame`

`onFrame` is the runtime's own publication surface (`runtime.ts:815-823`). The runtime pushes
into it at `:479` (a patch) and on the terminal frame; it never reads it. `WhatsAppPatch` is
**produced by the data store** and returned on `AcceptedWhatsAppBatch.patch`
(`contracts.ts:418-426`); the runtime forwards it unexamined. Its only in-repo consumer is
`durableFrames` (`runtime.ts:1033-1048`), which applies contiguity checks
(`patch.fromRevision === applied`) and falls back to a fresh snapshot on a gap.

**[inference]** A store returning a permanently-empty patch at an unmoving revision never
trips the gap path, because `runtime.ts:478` suppresses publication before it reaches
`durableFrames` at all.

---

## 4 — `MediaStore`: can `ref` be our blob hash?

### `ref` is opaque to whatsappd

Three independent facts:

1. **The runtime never inspects it.** `runtime.ts:49-61` **[read]** — `captureMessage` calls
   `mediaStore.write({accountId, owner, kind, source, mimetype})` and splats the result:
   `return { ...message, media: { ...metadata, state: "stored", ...stored } }` (`runtime.ts:58`).
2. **Exactly one function parses a ref**, and it is private to the filesystem store:
   `mediaObjectName` at `src/runtime/media.ts:34-35` — `/^media:v1:([0-9a-f]{64})$/` — used
   only at `file-media.ts:47` and `:106`. Grep for `mediaObjectName` and `media:v1` across
   `src/` returns those files and nothing else.
3. **The only structural validation anywhere** is on outbound staged media:
   `operations.ts:196` **[read]** — `const mediaSchema = z.strictObject({ ref: nonEmptyText })`,
   where `nonEmptyText = z.string().min(1)` (`operations.ts:188`). A non-empty string is the
   whole requirement.

The round trip is `media.open({ accountId, ref })` at `operation-executor.ts:30`, always with
the account that wrote it.

### Idempotency is required, and content hashing satisfies it

`contracts.ts:571-581` **[read]**: "Durable immutable media, keyed idempotently by account,
owner, kind, and content. … `write` consumes its source once with backpressure and must own
each chunk before requesting the next one. It resolves only after the complete object is
durably published."

The in-repo ref (`media.ts:19-31` **[read]**) is
`media:v1:sha256( JSON([accountId, owner, kind]) ‖ "\0" ‖ bytes )` — content **plus** identity.
`tests/media-store.test.ts:55-56` pins the idempotency: writing identical bytes under an
identical owner returns a deep-equal `{ref, byteLength}`.

A pure content SHA-256 is *strictly stronger* dedup: identical bytes under two different
owners collapse to one ref. **[inference]** Nothing depends on refs differing per owner —
no code parses a ref, so nothing can distinguish the two schemes.

### Ambient's `blobs` is already the right shape

`src/modules/blobs/types.ts:20-31` **[read]** — `put(bytes: Uint8Array | AsyncIterable<Uint8Array>)`
→ `{ hash, bytes, stored }`; `get(hash)`. `src/modules/blobs/internal/store.ts:30-69` **[read]**
streams chunk-by-chunk with real backpressure (`await handle.writeFile(chunk)` at `:40`),
hashes as it goes, writes to `.incoming-<uuid>` and `rename`s to `<sha256>` (`:56`), and
returns `stored: false` when the destination already exists (`:49`).

The mapping is one line each way:

```ts
write: async ({ source }) => {
  const put = await blobs.put(source);
  if ("problems" in put) throw new Error(describe(put.problems[0]));   // whatsappd expects a throw
  return { ref: put.hash, byteLength: put.bytes };
},
open: async ({ ref }) => { const got = await blobs.get(ref); return "problems" in got ? null : oneChunk(got); },
```

Two frictions:

- **`write` must throw on failure.** `runtime.ts:59-61` **[read]** catches and downgrades to
  `{state: "failed", reason: "store_failed"}`. Ambient's blobs return a `BlobProblem` value
  (`blobs/types.ts:18`), and `docs/rules/errors.md` forbids throwing. The adapter *is* the
  boundary to a contract that throws, so the throw belongs there and nowhere else.
- **`open` is contractually account-scoped.** `contracts.ts:580-581` **[read]**: "`open`
  returns a fresh byte stream for a published ref, or `null` when that account cannot read
  it", and `tests/media-store.test.ts:53` asserts
  `open({accountId: "another-account", ref}) === null` for both in-tree stores. Ambient's
  `blobs` is global by design (`blobs/types.ts:2` — "global content-addressed bytes, stored
  once by SHA-256"). **[inference]** This breaks nothing at runtime — the only caller opens
  with the writing account — but it is a real divergence from the stated contract and from
  the only test that pins it, and it should be declared rather than discovered.

---

## 5 — `CredentialStore`: use `fileStore()` unchanged

`src/ports.ts:25-38` **[read]** — three methods, values are opaque strings the store "never
interprets", keys look like `"creds"`, `"pre-key:42"`, `"session:123_1.0"`. Deliberately free
of WhatsApp types: `ports.ts:1-6` calls it one of "the two pluggable seams". It is the only
capability that is account-scoped at construction rather than per call
(`contracts.ts:602-606` **[read]**).

`src/stores/file.ts:71-164` **[read]** — `fileStore(dir)` writes **one** file:
`<dir>/.whatsappd-credentials/store.json` holding
`{version: 1, legacyFallback: boolean, values: Record<string, string | null>}` (`:14-18`).
Properties worth having: directory `chmod 0o700` (`:95-97`), file `mode 0o600` with
`flush: true` (`:100-105`), atomic write-temp-then-`rename` (`:98-110`), all reads and writes
serialized through a single promise chain (`:76-83`), and `clear()` leaves an empty owned
state as a tombstone (`:159-161`).

**Suitable as-is.** Point it at a per-account Ambient Place and it manages its own namespace
inside. Writing our own would reimplement the atomic-rename and permission discipline for no
gain. `fileStore` is exported from the package root (`src/index.ts:18`).

---

## 6 — The projection is inside the backend, not above it

`projectCurrentMirror` (`src/runtime/projection.ts:600-612`) is imported by exactly two
files: `memory.ts:25` and `libsql.ts:41`. It is called from inside each store's `accept()` —
`libsql.ts:1472`, within the write transaction opened at `libsql.ts:1465`. Nothing in
`runtime/` outside those two stores imports it.

Its own doc comment describes it as a helper for backend authors —
`projection.ts:22` **[read]**: "Keyed reads required by the backend-independent Current
Mirror projection", over an interface of seven keyed reads
(`CurrentMirrorRecords`, `projection.ts:23-31`).

**So: ours simply would not have one, and the runtime does not notice.** But two things
follow.

1. **We could not reuse it either.** `projectCurrentMirror` and `CurrentMirrorRecords` are
   absent from `src/index.ts:94-125` (which exports the contracts types and the error
   classes, but not the projection), and `package.json:30-34` publishes only `dist/index.mjs`
   and `dist/testing.mjs`. A third-party backend that wanted whatsappd's projection semantics
   would have to reimplement ~620 lines of `projection.ts`. Ambient's transcript is a
   different projection, so this is only a cost if we ever want the mirror back.
2. **`accept()` must still return a well-formed `AcceptedWhatsAppBatch`** —
   `contracts.ts:418-426` requires `accountId`, `seq`, `fromRevision`, `revision`, `events`,
   `patch`. The honest answer for a mirror-less store is an empty patch at
   `revision === fromRevision`, which `runtime.ts:478` then suppresses.

Set against that, `docs/adr/0003-whatsappd-owns-the-current-mirror.md` **[read]** is a direct
statement about this idea:

> The runtime owns a canonical, durable, backend-independent current WhatsApp mirror.
> Applications own optional archives, knowledge extraction, inboxes, and other product
> projections rather than reimplementing the mirror itself.

Ambient's transcript is, in that ADR's vocabulary, an *archive* — a product projection the
application owns. Replacing the data store with it deletes the mirror the ADR says whatsappd
owns. That is allowed (it is whatsappd's ADR, not ours, and Ambient composes it as a
library), but it is a decision against the grain of the design, not a hole in it.

---

## 7 — What an adapter without a mirror does not get

### (a) Message dedup — the keyed read *is* the dedup

`projection.ts:355-357` **[read]**:

```ts
const existing = await state.message(message.chatId, message.id);
if (!existing) {
  … state.upsert({ type: "message", message: withCurrentContent(base, message) });
}
```

There is no other dedup anywhere. `contracts.ts:452-455` states the resulting semantics:
"Offering an observation the mirror already holds appends it — it happened — but changes no
record and takes no revision, so a replayed message produces no client update."

An append-only JSONL writer has no keyed read, so a message re-delivered by a reconnect sync
or by an on-demand backfill answer is appended a second time. R3 established that history
answers arrive as ordinary `conversationSync` batches, so this is not hypothetical.

Ambient's `TranscriptWrite` already reports `skipped` (`src/modules/transcript/types.ts:106-111`),
so some dedup exists on our side — **[inference]** whether its key is `(chatId, messageId)`
and whether it survives across process restarts is the thing to check, and is what decides
whether this loss is real.

### (b) Out-of-order updates lose their landing pad

`projection.ts:425-431` **[read]** — an update whose target message is not yet stored is
parked:

```ts
const existing = await state.message(update.ref.chatId, update.ref.id);
if (!existing) {
  const pending = await state.pendingUpdates(update.ref.chatId, update.ref.id);
  state.setPendingUpdates(update.ref.chatId, update.ref.id, [...pending, update]);
  return;
}
```

and replayed when the message arrives (`projection.ts:373-376`). The five update kinds are
`receipt`, `reaction`, `edit`, `revoke`, `poll_votes` (`src/model/update.ts:26-47`).

For Ambient this splits:

- **`reaction` needs no join.** `LiveReaction` carries `target` and `emoji: string | null`
  (`transcript/types.ts:87-95`) and can be appended blind.
- **`edit` and `revoke` do.** `edit` carries a whole replacement `InboundMessage`
  (`update.ts:35`); `revoke` carries only a ref and a `by` (`update.ts:37`). `LiveMessage`
  has `edited?: true` (`transcript/types.ts:81`) but **no revoked arm**, and an append-only
  file cannot amend a line already written. `ArchiveMessage` has `deleted?: true`
  (`transcript/types.ts:24`) — the Live arm does not.
- **`receipt` and `poll_votes` have no Ambient line shape at all.**

### (c) The `requestHistory` anchor has to come from somewhere

The anchor is supplied by the caller, not read from the store:
`client-operations.ts:557-573` **[read]** validates only `request.before.ref.chatId === chatId`
and passes it through to the operation (`operations.ts:57-62`) and thence to
`session.requestHistory(anchor, {count})` (`operation-executor.ts:109-112`, `session.ts:768-776`).

In whatsappd's own composition the anchor comes off the mirror page the UI is showing.
`docs/architecture/history-semantics.md:112-117` **[read]** describes the proven paging loop:
"Each request anchored on the oldest message the previous answer returned, so no window was
requested twice." The timestamp is epoch **milliseconds** (`history-semantics.md:61-63`).

A `MessageRef` is `{id, chatId, fromMe, participant?}` (`src/model/outbound.ts:15-21`), and
`refOf` (`outbound.ts:55-59`) builds `participant` from `keyParticipant ?? sender.id` — with
an explicit warning at `outbound.ts:45-54` **[read]** that the delivered key participant is
kept verbatim because "react, edit, and delete target a message by handing this key straight
back, so a reconstructed participant would aim at a key that never existed."

**Ambient's `LiveMessage` cannot reconstruct a `MessageRef`.** It has `id` and `who.id`
(`transcript/types.ts:71-85`) but carries neither `fromMe` nor `keyParticipant`. That is a
concrete field gap: it blocks history backfill anchoring *and* it blocks reacting to,
editing, or revoking any message we only know about from our own transcript — regardless of
which backend we run.

### (d) Lease fencing — separable, and cheap to keep

Two layers, and only the second lives in the data store.

- `AccountLeaseStore` (`contracts.ts:550-565`) is its own capability; the runtime drives it
  (`runtime.ts:729` acquire, `:695` renew, `:630` release). Keep `memoryLeaseStore()` for a
  single-process Ambient, or write a file lock. Untouched by this question.
- `data.claim(accountId, fencingToken)` (`contracts.ts:466-480`) is the store-side half, and
  `contracts.ts:468-476` **[read]** explains why it exists: "between a replacement worker
  acquiring the account and its first write, the previous worker's buffered events would
  still be accepted." A write-only store implements it with **one durable integer per
  account** — the highest token seen — rejecting `accept()` below it with
  `StaleAccountClaimError` (`contracts.ts:638-653`, exported from `index.ts:97`). Small.

### (e) Operation retries — untouched, and losable on purpose

`WhatsAppOperationStore` is 13 methods (`operations.ts:111-153`) with claim/attempt/TTL
semantics and its own conformance suite (`tests/operation-store-conformance.ts`). It is
orthogonal to the transcript: nothing about outbound sends belongs in a JSONL. For a
receive-only Ambient, `memoryOperationStore()` is correct and its only cost is losing queued
operations on restart. **[inference]** Once Ambient sends, this becomes the *next* durable
store to think about, and it is a much better libSQL candidate than the mirror is.

### (f) Everything above the runtime that reads

`WhatsAppClient`, the React bindings, `messages.older()`, snapshots, gap recovery. All of it
routes through `data.read` / `data.snapshot` / `data.messages`, all of which our store would
stub. **[inference]** If Ambient ever wants a chat UI over live WhatsApp, this decision is
what it has to be un-made from.

### (g) `accepted()` catch-up for a second consumer

ADR-0014's whole point is that a consumer that was offline can resume from its own `seq`. If
`accept()` writes JSONL and nothing else, the JSONL *is* the log — but it is a lossy
projection of `WhatsAppDataEvent`: no receipts, no poll votes, no `contact` or `group`
records, no `ObservedInstant` (`contracts.ts:98-103` lists the seven durable event arms;
Ambient's `TranscriptLine` has four, two of them Archive-only). Nothing else could ever be
re-derived.

---

## 8 — Bottom line

**Viable-with-a-minimal-mirror.**

The runtime genuinely will not stop us: `WhatsAppBackend` is five independently replaceable
published contracts (ADR-0004, `contracts.ts:598-613`), the test suite calls the data store
"a published contract an application may implement" (`client.test.ts:3015-3017`), and during
a normal pair-and-sync run the runtime touches the data store at exactly two points —
`claim()` once at start and `accept()` per event — never `read()`, `snapshot()`, `messages()`
or `accepted()` (`runtime.ts:473`, `:740`; the other three call sites at `:813`, `:814`,
`:849` are definitions handed outward). `MediaStore` maps onto Ambient's `blobs` almost
exactly, because `ref` is opaque everywhere except inside `fileMediaStore` itself
(`media.ts:34-35`, used only at `file-media.ts:47,106`) and the only validation in the codebase
is `z.string().min(1)` (`operations.ts:196`). `CredentialStore` needs no work at all — use
`fileStore()`. And the projection lives *below* the seam, inside `memory.ts`/`libsql.ts`'s own
`accept()`, so ours simply would not have one.

What the idea does **not** do is delete a step. The mapping from `WhatsAppDurableEvent` to
`TranscriptLine` has to be written either way; the adapter moves it from a pager into
`accept()` and, in exchange, gives up the keyed mirror read that is whatsappd's only message
dedup (`projection.ts:356-357`), the `pendingUpdates` buffer that lands out-of-order edits and
revokes (`projection.ts:425-431`), and the anchor that makes `requestHistory` paging possible
(`history-semantics.md:112-117`). It also runs against ADR-0003 and against ADR-0014's
explicit design of `accepted()` as "the Ambient Brain boundary" — which is to say, whatsappd
already built the seam it wants us to use, and it is not this one.

**The smallest thing we would still have to store** to make the write-through adapter honest:

1. **A per-account counter triple** — highest fencing token, `seq`, `revision` — durable, so
   `claim()` can refuse a superseded writer and `accept()` can return a well-formed
   `AcceptedWhatsAppBatch` (`contracts.ts:418-426`). One small JSON file per account.
2. **A `(chatId, messageId)` seen-index**, durable across restarts, because that keyed read is
   the only dedup in the system and re-delivery is normal (reconnect sync, backfill answers).
3. **Per chat, the oldest message's `{id, fromMe, keyParticipant, timestamp}`** — the backfill
   anchor. Two of those four fields are not in `LiveMessage` today, so this is a change to
   `transcript/types.ts` before it is a change to any backend.

(2) and (3) are a mirror reduced to one index. That is what "minimal" means here — and it is
worth noticing that (3) is needed **whatever backend we run**, because without `fromMe` and
`keyParticipant` on a transcript line, nothing downstream of Ambient can react to, edit,
revoke, or page back from a message it read out of its own JSONL.

---

## What this does not establish

- **Nothing here was executed.** Every claim is read from source. No adapter was built, no
  test was run, and the whatsappd checkout was not modified.
- **Whether Ambient's `transcript` already dedups on `(chatId, messageId)` durably.**
  `TranscriptWrite.skipped` exists (`transcript/types.ts:109`) but its key and its persistence
  across restarts were not traced — that decides whether §7(a) is a real loss or an
  already-solved one. Reading `src/modules/transcript/internal/` answers it.
- **Whether a from-scratch `WhatsAppDataStore` passes `data-store-conformance.ts`.** The suite
  is unshipped (`package.json:30-34`), so we would be implementing against types with no
  executable definition of correct. Copying the suite into Ambient's tree — it takes a
  `DataStoreFactory` (`data-store-conformance.ts:23-28`) — is the thing that would answer it,
  and is a licence question as much as a technical one.
- **The `edit` / `revoke` / `receipt` / `poll_votes` mapping.** Ambient's line shapes have no
  arms for three of the four (`transcript/types.ts:97`). This finding names the gap; it does
  not design the shape that closes it.
- **Throughput.** R1 established that media download and acceptance are strictly serial per
  event. Whether a JSONL append per event is faster or slower than a libSQL write transaction
  per event was not measured, and a full-history sync of ~7,000 messages
  (`history-semantics.md:13-19`) is where it would show.
- **`operations` durability.** Treated as orthogonal throughout. The moment Ambient sends a
  message, `memoryOperationStore()` stops being adequate and that is a separate decision.
