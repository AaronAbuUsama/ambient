# INGEST — spec

**Slice:** INGEST · **State:** specified · **Specified:** 2026-08-18

**The question it answers:** *a paired WhatsApp account exists and `whatsappd` has filled its
database — how does that become Ambient's Transcript?*

## The frame

**What it is allowed to get wrong**

- How deep `whatsappd`'s own history reaches. That is `whatsappd`'s business, and an Archive
  already carries a Chat's full span ([ADR 003](../../adr/003-history-import-is-an-archive.md),
  and `scope.md` Decided 22).
- How complete the Blobs are. **375 of 728 media downloads failed and are unclassified**; the
  classification question is retired to the roadmap's Research queue with its recipe.
- How a Peer is chosen. By hand, from a listing. Automating it is a later problem.

**What it must never get wrong**

1. **Read a conversation nobody opted in to.** Two refusals before any I/O — an empty `peer`,
   and a Peer absent from the Source's `allow`.
2. **Claim presence it did not have.** A Live line is `from: "live"` and an Archive line is
   `from: "archive"`; the union makes conflating them unrepresentable
   ([ADR 004](../../adr/004-transcript-line-is-a-union-on-provenance.md)).
3. **Corrupt what IMPORT wrote.** 13,134 Archive lines are on disk — measured 2026-08-18,
   `JSON.parse` over every line — and INGEST appends beside them, never through them.
4. **Silently downgrade a resolved Blob.** Gate row 12. This is a real defect in shipped code,
   found by `S1` before a pairing was spent.

## Problem Statement

`transcript` has declared `LiveMessage`, `LiveReaction`, `LiveWho` and `LiveMedia` since IMPORT
and **nothing has ever produced one** — measured 2026-08-18, `grep -rn 'from: "live"' src/`,
four hits, all declarations or the deserialiser. Ambient can read a file the principal exported
and nothing else. `channel` has a `seams.md` row and no code.

The account is not the constraint. `whatsappd` already connects it, drives its history and
projects it into a durable mirror; two credentials exist on disk today. **What is missing is
the projection from that mirror into Ambient's own shape.**

## Solution

Two verbs and one read, none of which needs a Cursor.

- **`ambient pair <source>`** — `whatsappd` links the account and fills its database, inside
  `~/.ambient`. Ambient writes nothing of its own here.
- **`ambient peers <source>`** — prints what is in the mirror so a Peer id can be found. A
  **Peer** is the Source's own identifier for one conversation
  ([CONTEXT.md](../../../CONTEXT.md)); `chat` is Ambient's noun and is deliberately not reused.
- **`ambient ingest --into <slug>`** — pages one Peer's messages out of the mirror, stores their
  media as Blobs, and appends Live lines to that Chat's Transcript.

**There is no Cursor, no resume position and no backfill/live distinction**, because the mirror
is current state rather than a stream. Re-running is the recovery story.

## User Stories

- *As the principal*, I pair my account once and watch `whatsappd` fill its database.
- *As the principal*, I list my conversations, pick one, and paste its id into a Chat's config.
- *As the principal*, I ingest that Chat and get a Transcript I can read, beside the Archive
  lines already there.
- *As the principal*, I run it again a week later and only the new messages appear.
- *As a future Slice*, I read one `transcript.jsonl` per Chat without caring which Reader wrote
  which line.

## Implementation Decisions

### 1. The mirror, not the log

`whatsappd` exposes an append-only event log **and** a projected current mirror. The first
design read the log by `seq` and grew a Cursor out of it; the mirror is what this Slice reads.
**Measured**: the whole mirror in **88 ms**, from a second process, with no socket, no lease and
no runtime, while a writer held the lease and was not blocked — `scope.md` Decided 45–48.

Reactions, receipts, `editedAt`, the `revoked` arm and media state are all *on the record*, so
nothing needs replaying.

### 2. `channel` hides `whatsappd`, and `ingest` owns the order of the writes

Two modules, and the split is IMPORT's, re-run. `channel` produces values and writes no Ambient
state; `ingest` owns Blobs-then-Transcript and what a crash between them leaves. Deleting
`ingest` makes `channel` the composition owner, which is the 176-line defect one module over.
[design.md](./design.md) has the caller and the ownership table.

### 3. One new runtime dependency, and only one

`@libsql/client` is an **optional** peer dependency of `whatsappd`, dynamically imported, so
Ambient must depend on it directly — `scope.md` Decided 51. Nothing else is added.

### 4. The database file must be writable

A read-only copy dies at `PRAGMA journal_mode = WAL` — Decided 52. It lives inside `~/.ambient`,
which Ambient owns, so this costs nothing; it is recorded because it forecloses pointing at
somebody else's copy.

### 5. Writes are batched, and the number is measured

`writeTranscript` reloads the whole file per call: **372,721 lines/s batched against 10 lines/s
one at a time** — `S1`, 2026-08-18, M1 Pro, Node v24.19.0. An account-sized ingest is 2.1 s at
batch 1,000 and 37 minutes at batch 1. `ingest` therefore calls the Write path **once** per
Chat, holding that Chat's lines in memory.

### 6. Three defects in `transcript` are fixed here, not worked around

All three are Live-only and none has ever fired, because nothing had ever produced a Live line.
They are gate rows 11, 12 and 13, and they are why ticket `01` exists.

### 7. No reaction lines

Reactions arrive as an array **on the message record**, so a Live line is written per message
and never per reaction. Whether `LiveReaction` survives at all is settled by ticket `04`: a
public type with no producer is the exact defect this Slice was written to close.

## Design

[design.md](./design.md) — the caller, the call graph and its ownership table, the interfaces
read back off the caller, the seam delta, the conformance table and both state-and-failure
sequences. **It is not restated here**; [decisions.md](../../rules/decisions.md) forbids one
statement having two homes.

## Testing Decisions

**No test spends a credential.** `whatsappd`'s `memoryBackend` is its own reference
implementation and `libsqlBackend` runs against a `file:` URL in a temp directory, so every seam
below is exercised against a seeded database with no socket.

| Seam | Test observes |
|---|---|
| `channel.openMirror` | a temp libSQL file opens, migrates, and reads at one revision |
| `channel.peersOf` | a seeded mirror in, one row per conversation out |
| `channel.messagesFor` | paging terminates across a timestamp collision, nothing skipped or repeated |
| `ingest.runIngest` | a temp home, a seeded mirror, real files on disk |
| `transcript.writeTranscript` | the three defect cases above, each as a named failing test first |
| `cli` handlers | argv in, `Outcome` out — no filesystem |

## The gate

Numbered and executable. [definition-of-done.md](../../design/definition-of-done.md) row 1 runs
this list.

1. `ambient pair <source>` creates the credential and database under the Place `home` granted
   for that Source, and writes nothing outside `~/.ambient`.
2. `ambient peers <source>` prints one row per conversation — Peer id, subject, message count,
   newest Instant — and writes nothing at all.
3. `ambient peers <source>` against a Source with no database exits non-zero, says which file is
   missing, and writes nothing.
4. `ambient ingest --into <slug>` for a Chat whose `peer` is empty writes nothing, exits
   non-zero, and names the file to edit.
5. The same, for a Peer absent from that Source's `allow` list.
6. Ingesting a Chat writes one Transcript line per message the mirror holds for that Peer, and
   the count matches a direct `COUNT(*)` against the mirror exactly.
7. Every line written carries `from: "live"`, and `readTranscript` returns every field
   value-identical.
8. A record whose media is `stored` becomes a line whose media is `Stored` carrying **our** Blob
   hash, and those bytes exist under `~/.ambient/blobs/`.
9. A record whose media is `failed` becomes a line carrying a declared failure state — never a
   line with no media, and never a line implying the bytes were read.
10. A revoked record becomes a line that says so; an edited record carries its edit; reactions
    appear as state on their message and **no separate reaction line is written**.
11. Running the same ingest twice appends nothing and leaves `transcript.jsonl`
    **byte-identical**. *(defect D1 — today a key-order difference alone rewrites the file)*
12. Re-ingesting after the mirror's media moved from `failed` to `stored` **upgrades** the line,
    and no re-ingest ever replaces a `Stored` hash with a failure state.
    *(defect D2 — today this happens silently while reporting `written: 0`)*
13. Two writers against one Transcript: either both succeed with both sets of lines present, or
    one returns a failure. **Never both succeeding with one set lost.** *(defect D6)*
14. Ingesting into a Chat that already holds Archive lines appends only Live lines and leaves
    every Archive line byte-identical.
15. `ambient peers` and `ambient ingest` both succeed with **nothing paired and no runtime
    running** — the read needs no socket and no lease.
16. `vp check` pass·pass, `vp test` green with no skips, `vp run shape` clean, and
    `pnpm dlx fallow dupes` no worse than **0 lines**.

## Out of Scope

Unchanged from [scope.md](./scope.md): speaking, interpretation, Ambient's own scheduling,
identity merging, the pairing screen, and re-opening ADR 003. Added by the frontier:

- **Classifying the 375 failed media downloads.** Retired to
  [roadmap.md](../../design/roadmap.md)'s Research queue, blocking the point at which the
  knowledge base must be trusted.
- **Writing contacts, aliases and groups anywhere.** They are already durable in the mirror,
  which is the actionable store. KNOWLEDGE reads them when KNOWLEDGE exists.

## Further Notes

**What is not established.** Nothing has ever driven `ambient pair` end to end — every pairing
so far was a spike. Gate row 1 is the first time it is asserted.

**What the mirror cannot tell us.** `AccountRecord` carries no self address; *which* address is
the principal exists only on a live runtime — Decided 53. Irrelevant per message, because
`fromMe` is on every record. Recorded so KNOWLEDGE does not rediscover it.

**A comment in `whatsappd` is still wrong.** `model/message.ts:106` promises that `download()`
transparently re-uploads expired media. It never fires — the gate reads a field the error object
does not carry. Verified in the working tree at `97e4d601`, 2026-08-18. It affects nothing here
because this Slice downloads no media, and it is written down so it is not believed later.
