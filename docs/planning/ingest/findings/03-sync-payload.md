# INGEST · R3 — What a `full` history-sync batch carries, and what `authoritative_replacement` demands

**Question.** What does a `full` history-sync batch actually carry besides messages, and
what does `authoritative_replacement` require of a consumer that has ALREADY durably
written lines from an earlier batch?

**Sources.** whatsappd checkout at `/Users/abuusama/projects/whatsappd` (read only, not
modified). Primary source files, ADRs, the architecture note, the test suite, and — where
the mapping's input shape is the load-bearing fact — the vendored
`baileys@7.0.0-rc14` under
`node_modules/.pnpm/baileys@7.0.0-rc14_sharp@0.35.3_@types+node@26.1.1_/node_modules/baileys`
(abbreviated **`B/`** below).

Every line reference is `file:line`. Statements marked **[read]** are quoted or directly
read from the cited line. Statements marked **[inference]** are mine and are not asserted
by any source.

---

## Verdicts

| # | Sub-question | Verdict |
|---|---|---|
| 1 | Which source produces which `projection.mode` | **None produce `authoritative_replacement`.** The live mapping hardcodes `{mode: "upsert"}` for all five sources. The mode is decided at one line: `baileys/history.ts:135`. |
| 2 | What replacement means | **whatsappd's own projection refuses it** — it throws `UnsupportedDurableEventError`. It does not delete, does not soft-replace. Three ADRs state the restriction. There is no consumer-facing retraction contract because no producer exists. |
| 3 | `HistoryChat.participants` | **The history path can never populate it from Baileys.** whatsappd reads `chat.participants` (plural); the proto field is `participant` (singular). Rosters come only from `groups.upsert` / `groups.update` / `session.groupMetadata(jid)`. |
| 4 | `HistoryContact` | Carries `id`, `nativeIds`, optional `displayName` — synthesized **from the conversation row**, not from an address book. It is not complete; real contact data arrives separately as `contacts.upsert`/`contacts.update` from app-state sync. |
| 5 | Own-account identity | **Confirmed** — no `self` contact in the batch. Identity comes from `sock.user` via `selfAddress()`; `fromMe` messages carry the account's own address in `sender`, so they are usable. |
| 6 | `live: false` | **Confirmed and reliable.** `live: true` is produced at exactly one call site (`messages.upsert` type `"notify"`). Every other path passes `false`. A history message can never reach the plain `message` handler. |

**The bottom line for an append-only consumer: no. Nothing whatsappd can emit today
retracts a line you have already written.** The one retraction that exists in the whole
contract is a *contact-record* delete on the projected patch (`MirrorDelete`, ADR-0022) —
it is not on the source log, it names a contact identity and never a message, and it is a
consolidation of two records into one, not an erasure of evidence. Details in §2.

---

## 1. `ConversationSyncContext.projection` — who decides the mode

### The decision site

There is exactly one. `packages/whatsappd/src/baileys/history.ts:128-141` builds the
context, and line 135 sets the mode unconditionally:

```ts
  return {
    context: {
      source,
      ...(payload.isLatest != null && { isLatest: payload.isLatest }),
      ...(payload.chunkOrder != null && { chunkOrder: payload.chunkOrder }),
      ...(payload.progress != null && { progress: payload.progress }),
      ...(requestSessionId !== undefined && { requestSessionId }),
      projection: { mode: "upsert" },
    },
```
— `packages/whatsappd/src/baileys/history.ts:135` **[read]**

`source` is decided six lines earlier, at `packages/whatsappd/src/baileys/history.ts:110-123`,
and it is a pure switch over the protocol's `syncType` with no bearing on `projection`:

| `proto.HistorySync.HistorySyncType` | `ConversationSyncSource` | `projection.mode` | line |
|---|---|---|---|
| `INITIAL_BOOTSTRAP` | `initial_bootstrap` | `upsert` | `history.ts:112-113` |
| `RECENT` | `recent` | `upsert` | `history.ts:114-115` |
| `ON_DEMAND` | `on_demand` | `upsert` | `history.ts:116-117` |
| `FULL` | `full` | `upsert` | `history.ts:118-119` |
| anything else / absent | `unknown` | `upsert` | `history.ts:120-121` |

**So: `full` is not special. It carries `{mode: "upsert"}` exactly like `recent`.**

### `authoritative_replacement` has no producer anywhere in the repo

A grep for the literal across the whole checkout (excluding `node_modules`) returns three
hits, and none of them is a producer:

```
packages/whatsappd/src/model/history.ts:65     — the type declaration
packages/whatsappd/src/runtime/libsql.ts:838   — a validity check on read-back
packages/whatsappd/src/runtime/libsql.ts:861   — reconstruction of a value read from the DB
```
**[read]**

A second grep for `projection: {` across all non-test `.ts`/`.tsx` in the repo returns two
hits — `baileys/history.ts:135` and a smoke fixture at
`packages/whatsappd/smoke/packed-consumer.ts:417`, both `upsert`. **[read]**

`packages/whatsappd/src/runtime/libsql.ts:833-871` is the libSQL *deserializer*. It accepts
`authoritative_replacement` when parsing a durable row and reconstructs the `scope`
(`"account"` or `{chatId}`) at lines 857-871 — but nothing ever writes such a row, because
the only writer is the mapping above. **[read]** This is round-trip fidelity for a mode the
type permits, not evidence the mode occurs. **[inference]**

**Verdict for §1:** the mode is not a function of the source. It is a constant. The union
in `model/history.ts:62-67` is a forward-declared shape whose second arm is currently
unreachable from the live protocol path.

---

## 2. What `authoritative_replacement` means — and what a consumer must honour

### whatsappd's own projection refuses it outright

`packages/whatsappd/src/runtime/projection.ts:537-552` is the `conversation_sync` arm of
`projectEvent`. Its first act is a guard:

```ts
    case "conversation_sync": {
      const { context, chats, contacts, messages, updates } = event.batch;
      if (context.projection.mode !== "upsert")
        throw new UnsupportedDurableEventError("an authoritative conversation-sync replacement");
```
— `packages/whatsappd/src/runtime/projection.ts:537-540` **[read]**

**It does not delete. It does not soft-replace. It throws before touching a record.**

The error type says so in its own doc comment:

> "Non-text messages, authoritative sync replacement, and unknown event kinds still fail
> loudly rather than being dropped or falsely reported as current."
— `packages/whatsappd/src/runtime/contracts.ts:687-688` **[read]**

And the throw is a hard stop for the whole acceptance, not a per-event skip.
`WhatsAppDataStore.accept()` documents:

> "`@throws {@link UnsupportedDurableEventError}` when an event kind is not supported for
> durable acceptance … in both cases nothing is appended and the revision does not move."
— `packages/whatsappd/src/runtime/contracts.ts:455-458` **[read]**

`projectCurrentMirror` (`projection.ts:600-612`) iterates events with `await projectEvent(...)`
inside `projectCurrentMirror`'s own loop at line 610, so the throw propagates out of the
whole batch. **[read]**

### What the projection *can* delete, and it is only this

`state.delete(...)` — `projection.ts:138-142` — is called from exactly one place:
`projectContact` at `projection.ts:207-211`, when one observation reaches two existing
contact records and they must be consolidated. The delete record type admits nothing else:

```ts
export type MirrorDelete = {
  readonly type: "contact";
  readonly contactId: string;
  readonly freedNativeIds?: readonly string[];
};
```
— `packages/whatsappd/src/runtime/contracts.ts:263-277` **[read]**

There is **no** `MirrorDelete` variant for a message, a chat, or a group.
`MirrorRecord` (`contracts.ts:255-260`) has five arms; `MirrorDelete` has one. **[read]**

There is no prune, retention, truncate, or account-delete method on the store contract —
grep for `prune|retention|deleteAccount|truncate` in `runtime/contracts.ts` returns
nothing. **[read]**

### The ADRs

Three ADRs state the restriction, and all three are `status: accepted`.

**ADR-0019** — `docs/adr/0019-a-patch-carries-only-upserts-until-deletion-exists.md:28-31`:

> "**Scope-bounded replacement.** An authoritative conversation sync would replace a chat's
> contents wholesale, which means deleting what it does not list. ADR-0014 already refuses
> that mode for want of replacement metadata no live protocol mapping has proven, and
> acceptance rejects it outright." **[read]**

**ADR-0022** — `docs/adr/0022-delivered-address-equivalence-consolidates-current-contacts.md:14-17`:

> "The accepted source batches remain append-only: consolidation removes a projection
> artifact, not evidence." **[read]**

and at lines 30-31: "`WhatsAppPatch.deletes` exists only for an explicitly consolidated
contact. Revocation and authoritative replacement remain separate decisions." **[read]**

**ADR-0030** — `docs/adr/0030-coherence-is-answered-by-the-substrate.md:143-145`:

> "Accepted source remains append-only, and the revocation and authoritative-replacement
> restrictions in ADR-0019 still hold. Only the projected patch grows." **[read]**

`docs/adr/0011-patches-are-revisioned-record-upserts.md:5-9` carries the ADR-0030 amendment
banner and confirms the `fromRevision`/`revision` pair and gap-forces-snapshot survive it.
**[read]**

### The two consumer contracts, and which one an append-only consumer is on

`docs/adr/0014-accepted-source-batches-are-durable-and-followable.md:20-27` names the
**accepted-source log** as the backend-consumer boundary — explicitly "the Ambient Brain
boundary" at line 21 — followed by a consumer-owned `seq` cursor. **[read]** Its shape is
`AcceptedWhatsAppBatch` at `packages/whatsappd/src/runtime/contracts.ts:418-426`, and the
distinction between `seq` (append position, always advances) and `revision` (mirror
version, advances only on real change) is spelled out at `contracts.ts:404-416`. **[read]**

The *other* contract is `WhatsAppPatch` (`contracts.ts:378-397`) — the projected current
mirror, revision-ordered, applied only when `fromRevision` matches, and it is the only one
that carries `deletes`. **[read]**

**Contract for an append-only consumer, as read:**

- **On the source log there is no retraction at all.** It is append-only by three ADRs and
  by the absence of any store method that removes an appended batch. A line you wrote from
  batch *N* is never invalidated by batch *N+1*. **[read]**
- **On the patch channel the only retraction is a contact-record consolidation.** If you
  keep a contact index, `MirrorDelete.contactId` tells you the record that vanished and
  `freedNativeIds` tells you which addresses it owned — and every one of those addresses
  appears in the same patch's `aliases` pointing at the surviving record, so order does not
  matter (`contracts.ts:270-274`). **[read]** Nothing about a message line changes.
- **A revision gap forces a snapshot re-read, not a rewrite of your log.**
  ADR-0011:15-17. **[read]**
- **If `authoritative_replacement` ever arrives, acceptance fails closed and nothing is
  written** — so the failure mode is a stalled pipeline, never a silent contradiction of
  lines you already hold. `projection.ts:539-540` + `contracts.ts:455-458`. **[read]**

### One gap worth naming

**No test asserts the throw.** A grep for `UnsupportedDurableEventError` across
`packages/whatsappd/tests/` returns zero hits; every reference is in `src/`. **[read]** The
guard at `projection.ts:539` is unexercised. **[inference]** Every one of the ~26 test
fixtures that constructs a sync context passes `projection: { mode: "upsert" }`. **[read]**

---

## 3. `HistoryChat.participants` — the history path cannot populate it

### The mapping function

`toHistoryChat` — `packages/whatsappd/src/baileys/history.ts:63-77`. Line 69 is the one
that matters:

```ts
  const participants = toHistoryParticipants((chat as HistoryChatWithParticipants).participants);
```
— `packages/whatsappd/src/baileys/history.ts:69` **[read]**

`HistoryChatWithParticipants` is declared at `history.ts:30-32` as a **cast-on** widening of
Baileys' own chat type:

```ts
type HistoryChatWithParticipants = HistoryPayload["chats"][number] & {
  readonly participants?: readonly HistoryChatParticipant[] | null;
};
```
— `packages/whatsappd/src/baileys/history.ts:30-32` **[read]**

The base type does not declare the field. The cast asserts it might be there.

### The field is not there — the proto name is singular

Baileys types the payload's chats as `Chat[]`, and `Chat` is
`proto.IConversation & { lastMessageRecvTimestamp?: number }` —
`B/lib/Types/Chat.d.ts:40-43`. **[read]**

`proto.IConversation` has 55 fields. The roster field is **singular**:

```ts
        participant?: (proto.IGroupParticipant[]|null);
```
— `B/WAProto/index.d.ts:3621` **[read]**

There is no `participants` key on `IConversation` — the full field list is at
`B/WAProto/index.d.ts:3601-3656`. **[read]**

And Baileys pushes the raw decoded proto objects straight through:
`B/lib/Utils/history.js:55-101` iterates `item.conversations`, mutates `chat.messages`, and
`chats.push(chat)` at line 100 — no field renaming anywhere in that function. **[read]**
Its only mention of "participant" is `message.key.participant` at line 95, unrelated.
**[read]** A grep for `chat.participants` across all of `B/lib/` returns nothing. **[read]**

Protobufjs gives the repeated field a prototype default —
`Conversation.prototype.participant = $util.emptyArray;` at `B/WAProto/index.js:24048`
**[read]** — but that populates `.participant`, never `.participants`.

**Therefore, from source: on the Baileys history path, `chat.participants` is always
`undefined`.** `toHistoryParticipants(undefined)` returns `undefined` at
`history.ts:49`, and `history.ts:75` (`...(participants ? { participants } : {})`) omits
the key entirely. A history-mapped `HistoryChat` never has a `participants` key at all —
neither populated nor empty. **[inference, from the four reads above]**

### On the "142 of 143 groups carried an EMPTY array" measurement

I cannot reproduce that from source, and the source says the opposite: the key should be
**absent**, not `[]`. Two candidate explanations, neither verifiable here:

1. Whatever counted the measurement folded "key absent / `undefined`" into "empty",
   which would make the finding consistent with the code and the 1 remaining group the
   anomaly worth explaining. **[inference]**
2. The measurement was taken downstream of a serialization step that materialized a
   default. I found no such step — the libSQL deserializer at
   `packages/whatsappd/src/runtime/libsql.ts:893` is explicitly conditional
   (`...(chat.participants !== undefined && { participants: participants(chat.participants) })`),
   so it preserves absence. **[read]**

**What would answer it:** re-run the measurement distinguishing
`Object.hasOwn(chat, "participants")` from `chat.participants?.length === 0` — the exact
distinction `packages/whatsappd/tests/history.test.ts:177-178` already tests for. If
`hasOwn` is false for all 143, the code is behaving as read and the anomalous 1 needs its
own explanation.

### The absent/empty distinction is deliberate, and it has teeth

`toHistoryParticipants` — `history.ts:48-61` — encodes three states, and line 60 is the
hinge: `return out.length > 0 || participants.length === 0 ? out : undefined;` **[read]**

| Input | Output | Meaning |
|---|---|---|
| `undefined` / `null` | `undefined` → key omitted | membership **unknown** |
| `[]` | `[]` → key present, empty | membership **authoritatively empty** |
| `[{id, admin?}, …]` | mapped array | membership **known** |

Documented as a product rule at `docs/architecture/sdk-capabilities.md:214` (GROUP-01):
"an absent roster is unknown, while `participants: []` is authoritatively empty" **[read]**,
and as an acceptance test at `docs/architecture/web-client-feature-contract.md:121-124`
(WC-11). **[read]** Tested at `packages/whatsappd/tests/history.test.ts:164-179` and
`packages/whatsappd/tests/libsql-backend.test.ts:529-…`. **[read]**

**The consequence for a consumer:** an empty array is *destructive*.
`projectSyncedChat` at `packages/whatsappd/src/runtime/projection.ts:250` reads
`chat.participants ?? (await state.group(chat.id))?.participants` — and `[]` is not
nullish, so it wins over any roster already stored; `projectGroup` then merges
`{...existing, ...group}` (`projection.ts:232`) and the stored roster is replaced with
empty. **[read]** That is the designed semantic, not a bug — but it is the one thing on the
sync path that can *remove* information a consumer already holds. **[inference]**

Note that both WC-11 tests hand-construct the plural key with an `as` cast
(`history.test.ts:169-170`, `libsql-backend.test.ts:549`), so they prove the *model* can
express the three states — they do not prove Baileys ever supplies the middle one. **[read]**

### Where rosters actually come from

Only from the group events, never from history:

- `sock.ev.on("groups.upsert", …)` → `mapGroupMetadataUpdates` →
  `{kind: "metadata", participants}` — `packages/whatsappd/src/baileys/socket.ts:554-556`,
  `packages/whatsappd/src/baileys/groups.ts:66-84`. **[read]**
- `sock.ev.on("groups.update", …)` — same mapper —
  `packages/whatsappd/src/baileys/socket.ts:558-560`. **[read]**
- `sock.ev.on("group-participants.update", …)` → `mapGroupParticipantsUpdate` →
  `{kind: "participants", action, participants}` —
  `packages/whatsappd/src/baileys/socket.ts:562-565`,
  `packages/whatsappd/src/baileys/groups.ts:86-102`. Applied as a roster delta by
  `rosterAfter` at `projection.ts:218-228`. **[read]**
- **An explicit fetch:** `session.groupMetadata(chatId)` —
  `packages/whatsappd/src/session.ts:224` and `:708-711`, backed by `sock.groupMetadata` at
  `packages/whatsappd/src/baileys/socket.ts:614-615`. Surfaced up through
  `runtime.groupMetadata` (`runtime/runtime.ts:262`, `:883-886`) and the client
  (`runtime/client.ts:962`). **[read]** Baileys' `GroupMetadata.participants` is plural and
  required — `B/lib/Types/GroupMetadata.d.ts:50`. **[read]**

Baileys emits `groups.upsert` only from a live group-add notification
(`B/lib/Socket/messages-recv.js:607`) and `groups.update` from a live protocol message
(`B/lib/Utils/process-message.js:485`) or an explicit metadata/community fetch
(`B/lib/Socket/groups.js:56`, `B/lib/Socket/communities.js:55`). **[read]** **None of these
is a history-sync path.** **[inference]**

**So: to know a group's roster, you must ask a live socket. History will not tell you.**

---

## 4. `HistoryContact` — what a `full` batch carries, and what arrives elsewhere

### The shape

```ts
export interface HistoryContact {
  readonly id: string;
  /** Every equivalent native address WhatsApp supplied for this contact. */
  readonly nativeIds: readonly string[];
  readonly displayName?: string;
}
```
— `packages/whatsappd/src/model/history.ts:12-17` **[read]**

Three fields. No `profileName`, no `verifiedName`, no `username`, no `imgUrl`, no `status`
— compare `ContactUpdate` at `packages/whatsappd/src/model/contact.ts:5-27`, which has all
of them. **[read]**

### How it is built

`toHistoryContact` — `packages/whatsappd/src/baileys/history.ts:79-94`:

- `nativeIds` = `contactNativeIds(contact)` = deduped, trimmed
  `[id, phoneNumber, lid]` — `packages/whatsappd/src/baileys/contacts.ts:32-34`. **[read]**
- `id` = `nativeIds[0]`. **[read]**
- **The whole contact is dropped** unless every native id passes `isContactNativeId` —
  `history.ts:82`. That predicate rejects `@g.us`, `@broadcast`, `@newsletter` —
  `packages/whatsappd/src/model/contact.ts:30-31`. **[read]**
- `displayName` = first non-empty of `name, notify, verifiedName, username` —
  `history.ts:83-88`. **[read]** Note it collapses four distinct upstream fields into one
  string; the live `contacts.*` path keeps them separate
  (`packages/whatsappd/src/baileys/contacts.ts:48-53`). **[read]**

### It is *not* an address book — it is one row per conversation

Baileys synthesizes the history contacts array from the conversation rows themselves:

```js
            for (const chat of item.conversations) {
                contacts.push({
                    id: chat.id,
                    name: chat.displayName || chat.name || chat.username || undefined,
                    username: chat.username || undefined,
                    lid: chat.lidJid || chat.accountLid || undefined,
                    phoneNumber: chat.pnJid || undefined
                });
```
— `B/lib/Utils/history.js:55-62` **[read]**

So `contacts.length` tracks the number of conversations in the chunk, and every group
conversation contributes a `@g.us` entry that whatsappd then filters out at `history.ts:82`.
`packages/whatsappd/tests/history.test.ts:140,157-160` proves the filter: a group chat is
mapped into `chats` but never into `contacts`. **[read]**

The only other contact Baileys adds on this path is a business-privacy stub from a message
stub type — `B/lib/Utils/history.js:91-98`. **[read]**

**Verdict: incomplete.** It carries what the conversation row happened to know. **[inference]**

### The rest arrives separately — event kinds a full sync produces

`sock.ev.on("messaging-history.set", …)` → `toMessagingHistoryEvents`
(`packages/whatsappd/src/baileys/socket.ts:571-577`, `:215-246`) emits up to three internal
`RawEvent`s per payload:

| Internal event | Emitted when | Line |
|---|---|---|
| `conversation_sync_progress` | `progress` is finite and ≠ 100 | `socket.ts:222-224` |
| `conversation_sync` | the batch has rows, **or** it answers a request (`requestSessionId` set or `source === "on_demand"`) | `socket.ts:226-243` |
| `conversation_sync_complete` | `progress === 100` | `socket.ts:244` |

**[read]** — plus `conversation_sync_complete` from a separate
`messaging-history.status` event when `syncType === RECENT` and status is
`complete`/`paused` — `socket.ts:248-256`, wired at `socket.ts:579-589`. **[read]**

Of these, only `conversation_sync` reaches a subscriber. The other two drive the session
state machine — `packages/whatsappd/src/session.ts:508-514` maps them to `sync_progress`
and `synced`, and neither has a handler slot in `WhatsAppSessionHandlers`
(`packages/whatsappd/src/subscription.ts:21-29`). **[read]**

**Independently, and on their own event streams during the same connection:**

| Public handler | Baileys source | whatsappd wiring | Baileys emitter |
|---|---|---|---|
| `contact(ContactUpdate)` | `contacts.upsert` | `socket.ts:546-548` | app-state sync: `B/lib/Utils/sync-action-utils.js:18-29` (contactAction), `B/lib/Utils/chat-utils.js:833-845` (lidContactAction) |
| `contact(ContactUpdate)` | `contacts.update` | `socket.ts:550-552` | same app-state machinery |
| `group(GroupUpdate)` | `groups.upsert` | `socket.ts:554-556` | `B/lib/Socket/messages-recv.js:607` |
| `group(GroupUpdate)` | `groups.update` | `socket.ts:558-560` | `B/lib/Utils/process-message.js:485`, `B/lib/Socket/groups.js:56` |
| `group(GroupUpdate)` | `group-participants.update` | `socket.ts:562-565` | live participant notification |
| `update(Update)` | `messages.update`, `message-receipt.update`, `messages.reaction` | `socket.ts:531-544` | live |
| `presence(PresenceUpdate)` | `presence.update` | `socket.ts:567-569` | live, never durable (ADR-0014:47-50) |
| `connection(Status)` | `connection.update` | `socket.ts:591-603` | live |

**[read]**

**So a full sync's contact picture is assembled from at least two streams**: the thin
`HistoryContact` rows inside `conversationSync`, and the richer `ContactUpdate`s arriving
as `contact` events from app-state sync. **[inference]** Both land in the same projection —
`projection.ts:542-548` (from the batch) and `:553-565` (from a `contact` event) — and the
`contact`-event arm carries five fields the batch arm cannot. **[read]**

One more thing inside the batch that is easy to miss:

```ts
  /** Target mutations carried inside history, applied after this batch's messages. */
  readonly updates?: readonly import("./update.ts").Update[];
```
— `packages/whatsappd/src/model/history.ts:87-88` **[read]**

These are receipts, reactions, edits, revokes and poll votes extracted from control
envelopes *inside* the history messages array — `toConversationSyncMessages` at
`packages/whatsappd/src/baileys/history.ts:144-161` routes each raw message through
`mapMessageControl` (line 153) and, when it is a control envelope, pushes an `Update`
instead of a message (lines 154-157). **[read]** Ordering is contractual: the projection
applies `messages` first, then `updates` — `projection.ts:549-550`. **[read]**
`Update` has five kinds: `receipt`, `reaction`, `edit`, `revoke`, `poll_votes` —
`packages/whatsappd/src/model/update.ts:26-47`. **[read]**

**A `full` batch therefore carries five things: `context`, `chats`, `contacts`, `messages`,
`updates`.** **[read, `model/history.ts:82-89`]** A revoke arriving in `updates` is the one
place a history batch can tell you a message you are about to write was already deleted.
**[inference]**

---

## 5. Own-account identity — confirmed, and where it actually comes from

### The batch carries no `self`, and this is deliberate

```
 * A batch carries no `self` contact. WhatsApp never populated one, and per
 * ADR-0001 a sync batch is not an identity source: the linked account's own
 * address comes from the connected session identity, and every message already
 * names its author in {@link InboundMessage.sender}.
```
— `packages/whatsappd/src/model/history.ts:77-80` **[read]**

Confirmed structurally: `ConversationSyncBatch` at `model/history.ts:82-89` has exactly
five members and none is `self`. **[read]**

**ADR-0001** — `docs/adr/0001-message-sender-is-an-actual-whatsapp-address.md:7-12`:

> "Own messages derive their sender from the linked account rather than the peer or group
> chat, and `ConversationSyncBatch.self` is not an identity source." **[read]**

### Where the address comes from instead

`selfAddress(sock)` — `packages/whatsappd/src/baileys/socket.ts:179-183` — reads
`sock.user`, strips the device suffix via `jidNormalizedUser`, and carries the LID form as
`alt`:

```ts
export function selfAddress(sock: Pick<WASocket, "user">): WhatsAppAddress {
  const u = sock.user;
  if (!u?.id) throw new TypeError("no account identity: cannot name the author of a message");
  return addressOf(jidNormalizedUser(u.id), u.lid ? jidNormalizedUser(u.lid) : undefined);
}
```
**[read]**

Its doc comment (`socket.ts:160-178`) states the ordering guarantee: "`sock.user` is the
registered credential identity, so it exists from the moment credentials do — strictly
before any message event can arrive," and it throws rather than emitting a placeholder,
"since an empty or borrowed sender is the corruption ADR-0001 exists to prevent." **[read]**

It is called **per event, never hoisted** — `socket.ts:514-516` explains why: a fresh
pairing has no `sock.user` at wiring time. **[read]** It is threaded into every mapping:
`socket.ts:521` (upsert), `:533` (updates), `:574` (history). **[read]**

Four tests pin it — `packages/whatsappd/tests/self-address.test.ts:15-44`: device-suffix
strip, LID pairing, no invented `alt`, and a loud throw on a missing identity. **[read]**

The public read is `session.identity(): WaIdentity | undefined` —
`packages/whatsappd/src/session.ts:291`, implemented at `:778`, socket side at
`socket.ts:118`/`:637`. `WaIdentity` is `{jid, phoneJid?, lid?, pushName?, phoneE164?}` —
`packages/whatsappd/src/model/status.ts:57-68`. It is `undefined` before the socket opens
(`status.ts:57`, `session.ts:289`). **[read]**

### Do `fromMe` messages carry a usable sender?

**Yes — and it is the *only* correct one.** `senderOf` —
`packages/whatsappd/src/baileys/inbound.ts:181-190`:

```ts
function senderOf(raw: WAMessage, self: WhatsAppAddress): WhatsAppAddress {
  const key = raw.key;
  if (key.fromMe) return self;
```
**[read]**

The doc comment above it (`inbound.ts:168-175`) states the reason: "WhatsApp leaves
`key.participant` empty on own DMs, so the peer fallback below would otherwise attribute
them to the conversation counterpart: the misattribution this function exists to prevent."
**[read]**

`InboundMessage.sender` is therefore always populated (`inbound.ts:212`), and
`fromMe` is carried separately at `inbound.ts:215`. The raw protocol participant is
preserved as `keyParticipant` (`inbound.ts:213`) and is explicitly documented as "A routing
detail, **not** an author" — `packages/whatsappd/src/model/message.ts:69-80`. **[read]**

**Consumer note:** for `fromMe` messages, `sender` is the *account's* stable address, which
`model/message.ts:76-78` warns "may differ from the form the key carried." Do not join
`sender.id` to `keyParticipant`. **[inference]**

---

## 6. `live: false` — confirmed, and it is the reliable discriminator

### The flag

```ts
  /** true = live (`messages.upsert` type "notify"); false = history ("append"). */
  readonly live: boolean;
```
— `packages/whatsappd/src/model/message.ts:85-86` **[read]**

It is set from a parameter, not derived: `toInbound(raw, live, self, makeDownload)` at
`packages/whatsappd/src/baileys/inbound.ts:192-197`, assigned at `inbound.ts:217`. **[read]**

### Every history path passes `false`

`toConversationSyncMessages` — `packages/whatsappd/src/baileys/history.ts:144-161` — passes
the literal `false` at both call sites:

- `mapMessageControl(raw, false, self, …)` — `history.ts:153` **[read]**
- `toInbound(raw, false, self, makeDownload)` — `history.ts:158` **[read]**

`toConversationSyncBatch` is the only caller of `toConversationSyncMessages`
(`history.ts:109`), so **every** message in **every** `ConversationSyncBatch` carries
`live: false`, regardless of source. **[read]**

`docs/architecture/history-semantics.md:79-82` states the same for on-demand answers:
"Delivered messages carry `live: false`." **[read]**

### `live: true` is produced at exactly one place

`toMessagesUpsertEvents` — `packages/whatsappd/src/baileys/socket.ts:185-213`. Its very
first act is a type check:

```ts
  if (payload.type !== "notify") {
    const sync = toConversationSyncBatch(
      { chats: [], contacts: [], messages: payload.messages },
      self,
      makeDownload,
    );
    return sync.messages.length > 0 || (sync.updates?.length ?? 0) > 0
      ? [{ t: "conversation_sync", sync }]
      : [];
  }
```
— `packages/whatsappd/src/baileys/socket.ts:191-200` **[read]**

Only past that guard does anything pass `true` — `mapMessageControl(raw, true, …)` at
`socket.ts:203` and `toInbound(raw, true, …)` at `socket.ts:210`. **[read]**

**So `live` is exactly `messages.upsert.type === "notify"`.** It is not a heuristic on
timestamps or ordering. **[inference, from the two reads above]**

### Can a history message reach the plain `message` handler?

**No.** A grep for producers of `{ t: "message" }` across `packages/whatsappd/src/` returns
one line — `packages/whatsappd/src/baileys/socket.ts:211` — inside the `type === "notify"`
branch. **[read]** The dispatcher then maps it 1:1: `session.ts:517-522` →
`dispatcher.dispatch({type: "message", …})` → `handlers.message?.(…)`
(`subscription.ts:83-91`). **[read]**

The important corollary: an **offline catch-up** — a `messages.upsert` with type `"append"`
or `"prepend"`, which is how queued messages arrive to a returning device — is wrapped into
a `conversation_sync` batch at `socket.ts:192-199`, with a synthetic payload carrying no
`syncType`, so `source` falls through to `"unknown"` (`history.ts:120-121`). **[read]**
This is documented as intended at `model/history.ts:27-28`: "`unknown` — a batch the
protocol did not label (e.g. offline catch-up appends)." **[read]**

**A consumer's rule, as read:**

- `handlers.message` ⟹ live, always `live === true`.
- `handlers.conversationSync` ⟹ history/sync/catch-up, always `live === false`.
- `context.source` distinguishes *why*, and `"unknown"` is the offline-catch-up case, not
  an error condition.

One consumer-visible filter to know about: status/story posts on `status@broadcast` are
dropped from the `message` handler unless `receiveStatusBroadcast` is set —
`packages/whatsappd/src/session.ts:518-520`. **[read]** That filter is on the `message`
arm only; the `conversation_sync` arm at `session.ts:515-516` has no such guard. **[read]**
**[inference]** A status post arriving via history therefore reaches a consumer that a live
one would not.

---

## What this does not establish

1. **Whether WhatsApp ever sends an authoritative replacement.** No producer exists, so the
   question is unanswerable from this checkout. ADR-0019:28-31 says the metadata for it was
   never proven by a live mapping. **What would answer it:** a live capture of a
   `messaging-history.set` payload carrying replacement semantics, or an upstream Baileys
   change surfacing one.

2. **Whether the guard at `projection.ts:539` actually fires.** It is untested — zero
   references to `UnsupportedDurableEventError` in `packages/whatsappd/tests/`. **What
   would answer it:** one test handing `accept()` a batch with
   `projection: {mode: "authoritative_replacement", scope: "account"}` and asserting the
   throw, plus that `seq` and `revision` did not move.

3. **The 142/143 empty-participants measurement.** Source says the key should be *absent*,
   not `[]`. I could not find any code path that would produce `[]` from a Baileys history
   payload. **What would answer it:** re-measure with `Object.hasOwn(chat, "participants")`
   as the discriminator, and identify what the 1 anomalous group did differently.

4. **Whether the plural/singular mismatch at `history.ts:69` is intentional.** The
   surrounding machinery (the three-state encoding, the WC-11 tests, the GROUP-01 doc row)
   is clearly deliberate; whether the *field name* is a defensive read of a shape Baileys
   might one day supply, or a typo for `participant`, is not stated anywhere I found. **What
   would answer it:** the whatsappd maintainer, or a live capture showing whether
   `conversation.participant` is ever non-empty for a group on the history path.

5. **Whether a `full` sync differs from `recent` in payload composition** beyond depth. The
   `syncType` switch (`history.ts:110-123`) is the only place the distinction is read, and
   it affects nothing downstream. History-semantics.md:43-44 notes every depth in that
   document was measured with the full-history request **off**. **What would answer it:** a
   fresh pairing with `syncFullHistory` on, counting chats/contacts/messages/updates per
   `syncType`.

6. **Anything about ordering *between* batches.** `chunkOrder`, `isLatest` and `progress`
   are passed through verbatim (`history.ts:131-133`) and `model/history.ts:44-50` warns
   `isLatest` "cannot establish exhaustion of requested history — nothing can." Whether
   batch *N+1* can contain a message older than one in batch *N* is not stated anywhere in
   source. **[inference]** **What would answer it:** a live capture correlating `chunkOrder`
   against message timestamps.

7. **Media.** Every history message with media carries a `download()` closure
   (`inbound.ts:199`) that ADR-0014:51-53 says "cannot survive serialization or a restart."
   How long that handle stays valid during a long full sync is not established here.
