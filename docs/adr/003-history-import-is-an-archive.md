# ADR 003 — History Import is satisfied by an exported archive, not a second pairing

**Status:** Accepted · **Date:** 2026-08-17 · **Area:** INTAKE

---

## Context

[product.md](../design/product.md) already names two distinct operations and warns against
collapsing them:

> **History import** — a one-time pass over what already exists in a source.
> **Continuous ingestion** — the ongoing feed. Never stops.

and it states the cold-start requirement:

> **The architecture has to support ingesting from an account Ambient does not live on,
> without pretending it was there.**

The requirement was settled. The **mechanism** was assumed — that "an account Ambient does
not live on" means a second live paired source in `mode: ingest`. This ADR records that the
assumption is wrong, and what replaces it.

## What was measured (2026-08-17)

Both routes were driven against the principal's real account, on one chat — `Capxul Devs`.

| | Live account, `requestHistory` | Exported archive |
|---|---|---|
| Reach | **7,908 messages, back 364 days** | **13,117 messages, back 19 months** |
| Terminates because | WhatsApp replied "nothing older" | the file ends |
| Rate | ~48 messages per reply, ~2.7s each, ~12 min | one file, parsed in seconds |
| Media bytes | fetched live, 343 of 728 first-pass | **1,139 files in the zip** |
| Needs | a credential, a live socket, a single-writer lease, an awake service | **a file** |
| Fails by | silent rate limiting; silence is indistinguishable from exhaustion without [whatsappd#207](https://github.com/AaronAbuUsama/whatsappd/issues/207) | not at all |

The live route is capped at **one year** and cannot be driven past it. The archive holds
everything the principal's phone holds. For the cold start — the thing that decides whether
day one is worth anything — the archive is not merely easier, it is **strictly more
complete**.

## Decision

1. **History Import reads an archive.** A one-time pass is satisfied by a file the principal
   exports from WhatsApp, not by pairing the account it came from.
2. **Continuous Ingestion reads a live account.** Unchanged, and it is what `mode: ingest`
   and `mode: speak` describe.
3. **A `Source` therefore has a shape as well as a mode** — a *live account*, or an
   *archive*. An archive is always `ingest` and never speaks.
4. **Both converge before anything is written.** One transcript format, one
   content-addressed media store, one set of media states. Two readers, one write path.
5. **Provenance distinguishes them, and it is not optional.** `product.md` already requires
   that Ambient *"never claims presence it did not have"* — a fact from an archive is
   **known, not witnessed**. This is the same distinction `scope.md` reached independently
   for identity (`witnessed` / `asserted`).

## Consequences

- **The cold start stops depending on a protocol we do not control.** No credential, no
  lease, no revocation, no rate limit, no one-year ceiling.
- **An archive carries no message id.** Deduplication against live data cannot key on
  identity and must key on content and time. It also carries a *display name* where the
  live account carries a WhatsApp Address, so joining people across the two sources is an
  `asserted` claim, never a `witnessed` one.
- **Live paging keeps its value** — it is how Continuous Ingestion fills gaps after an
  outage, and whatsappd#207 remains required for it to terminate honestly.
- **An import is an act, not standing state.** Whether it is a command or a configured
  source is left open below.

## The archive format, verified

Two shapes, both produced by WhatsApp's own **Export chat**:

```
without media   _chat.txt only  (a .zip containing exactly one file)
with media      _chat.txt + flat media files at the archive root
```

`_chat.txt`, verified against 19,607 lines:

```
[14/02/2025, 4:06:10 PM] Rex: message text          ← a timestamped line opens a message
continued on the next line                          ← no timestamp = continuation
[16/02/2025, 9:24:48 AM] Rex: <attached: 00000066-PHOTO-2025-02-16-09-24-48.jpg>
```

Media files are named `<8-digit sequence>-<TYPE>-<date>-<time>.<ext>`, flat, no directories.
Measured on one export: **1,139 markers, 1,139 files, an exact match** — PHOTO 579,
STICKER 381, **AUDIO 95**, VIDEO 26, GIF 25.

A marker with no matching file is `NoHandle`: a text-only export is not a degraded import,
it is the shape the principal chose.

## Left open, for the spec

- **Is an import a command or a configured source?** An import happens once; config
  describes standing state. This ADR leans to a command but does not decide it.
- **Timezone.** An export writes the phone's local wall clock and names no offset. A
  19-month file crosses daylight saving, so a single fixed offset puts half of it an hour
  out. It needs a timezone, not an offset — an hour is enough to reorder a conversation.

## Amendments

### 1 — 2026-08-17: the live column was measured on an account that never asked for full history

**The decision stands. One row of its evidence has an untested confound, and this records
it rather than leaving two answers alive.**

WhatsApp's full-history request is `companion.requireFullSync`, carried on the
**registration node**. Baileys sends that node only while `creds.me` is absent, so a
credential can ask **exactly once, at Pairing**, and every later connect is a login node
with no such field. `whatsappd` gated the request on `creds.registered`, which is never set
at that moment by either pairing method — so, in that repo's own words, *"the gate did not
defer the request, it deleted it."* Fixed in whatsappd `cf44458`, **2026-08-17 05:50 UTC**.

The credential every measurement above used was paired **2026-08-16 19:21 UTC**, before the
fix. The depth runs executed **2026-08-17 06:01–07:12 UTC**. So the account asked for full
history **zero times**, and no reconnect can ask retrospectively.

| Claim | Standing |
|---|---|
| Archive needs only a file — no credential, lease, socket or rate limit | **unaffected** |
| Archive carries 1,139 media files as bytes; live fetched 343 of 728 | **unaffected** |
| An archive carries no message id, and a display name not an Address | **unaffected** |
| **Live paging reaches 364 days, and the protocol covers 60%** | **not established.** 364 days may be the ceiling of on-demand paging *without* a full sync, not WhatsApp's ceiling. |

**Closed by the principal, same day.** The 364-day figure is **accepted as measured and will
not be re-measured.** The reason is that nothing downstream turns on it: History Import reads
an archive either way, and if live paging turns out to reach further, that is upside on a path
we already have rather than a change to this decision. Decision 1 stands on the first three
rows of the table above, which no confound touches.

So `strictly more complete` is narrowed to **`more complete on every measurement taken, one
of which had the full-history request disabled`** — and that is the final wording, not a
placeholder. Anyone tempted to re-open it should read this paragraph first: the question is
closed by choice, not by evidence.

*If it is ever re-opened, the run is: one fresh pairing into a scratch home on a whatsappd at
or after `cf44458`, then the same depth loop, reading the `full` batch count and the oldest
date reached. `.spike-private/history/pair.ts --summary=` reports both.*

### 2 — 2026-08-17, 25 minutes later: it was re-opened by a fresh pairing, and the reach is multi-year

Amendment 1 is superseded on its facts. A fresh pairing ran on the fixed whatsappd
(`examples/pair-page`, home `proofs/verify-091339`). Per-batch, from its own log:

| Source | Batches | Messages |
|---|---|---|
| `initial_bootstrap` | 1 | 739 |
| `recent` | 3 | 9,102 |
| **`full`** | **7** | **33,493** |
| `on_demand` (the pager) | 0 | **0 — never used** |
| **Total** | | **43,334 across 1,506 chats** |

Against the pre-fix credential's 4,895 delivered: **8.85× the messages.** Oldest timestamp
reported on screen: **2021-10-06.** So the request now reaches WhatsApp, and the one-year
ceiling in the table above is **not** the protocol's.

**The mechanism differs from paging by two orders of magnitude.** A `full` batch carries
~4,800 messages; a `requestHistory` reply carries **48**, capped, at ~2.7s each. The same
43,334 messages by paging is ~900 requests and roughly 40 minutes. The full sync delivered
them in about a minute of batches, and stopped on its own.

**Three things this run does NOT establish, each a claim shape already wrong once here:**

1. **Nothing was persisted.** The live store's entire schema is `wa_auth`. `wa_messages` is
   created only by whatsappd's `runtime/libsql.ts`; the example uses `createSession` plus the
   **auth** store. All 43,334 messages were in-process counters and are gone when it exits.
2. **`2021-10-06` is a single minimum, not a span.** It is `min(timestamp)` over 1,506 chats
   and may be one message. [scope.md](../planning/intake/scope.md) already records the same
   error once — *"The 2022 date is one outlier chat."*
3. **43,334 is account-wide; 7,908 and 13,117 were one chat.** Comparing them is the error
   that produced that document's six corrections. Whether `Capxul Devs` now returns all
   13,117 to 2025-02-14 is unmeasured, because of (1).

**A full sync is one-shot per credential** — the request rides the registration node, sent
only while unpaired. `verify-091339` has spent its one sync. **Do not spend another pairing
on a tool that does not write.**

**Decision 1 is not overturned, and its reason is narrowed.** History Import still reads an
archive, but no longer because the live route is shallower. It reads an archive because an
archive needs **no credential** and carries media **as bytes** (1,139 files, against 343 of
728 fetched live). Reach is no longer an argument for it.

**What this settles elsewhere:** decision 4's *"two readers, one write path"* is now measured
rather than reasoned. A live reader that does not durably write loses a whole account's
history when its process exits — which is what just happened, to 43,334 messages.

*Method note, and the reason this is stated from a commit message rather than from source:
the `whatsappd` checkout was on branch `codex/install-anti-slop` with uncommitted changes
and another agent active in it, and `socket.ts` there matched neither the pre- nor the
post-`cf44458` shape. Reading it would have been measuring a tree mid-edit — the same error
as the six corrections at the foot of
[scope.md](../planning/intake/scope.md). The commit and its date are the primary source.*

### 3 — 2026-08-17: IMPORT settles the command, Zone and cross-Reader cut

The two items under *Left open* are closed by the implemented
[IMPORT spec](../planning/import/spec.md): History Import is the `ambient import` command,
and every Archive Wall clock is resolved under an IANA Zone that is given or host-defaulted,
printed, and recorded on every line and in the Receipt.

One Consequence above did not survive measurement: Archive/live deduplication does **not**
key on content and time. The Readers share neither sender identity (label versus Address)
nor media text (Marker filename versus no filename), so cross-Reader key matching would
invent both misses and matches. The settled boundary is a cut: the Archive owns through its
newest Instant; the Live account owns what follows. Within an Archive, the key remains the
NUL-separated Wall clock, sender label and text, so correcting a Zone updates lines without
duplicating them.

### 4 — 2026-08-17: the Archive count is Transcript lines, and Events are source-marked

The measurement table and amendment 2 call **13,117** values from the without-media Archive
"messages". IMPORT's second Reader pass establishes the sharper statement: they are **13,117
Transcript lines = 13,066 Messages + 51 Events**. The with-media Archive has **13,134 lines =
13,083 Messages + the same 51 Events**. The reach comparison and Decision 1 are unchanged.

The first Reader tried to infer Events from English words and reported 105. That was not
source evidence: it over-classified 73 ordinary Messages and missed 19 generated rows.
WhatsApp's iOS Archive already marks generated bodies with U+200E. Reader version 2 records
that position before cleaning display marks, recognises marked formal Message shapes first,
and classifies only the 51 remaining marked values as Events. This correction is why the
Reader version exists in the Receipt.
