# IMPORT — spec

**Area:** IMPORT · **State:** specified, not built · **Specified:** 2026-08-17
**Status:** ready-for-agent

Settled by [ADR 003](../../adr/003-history-import-is-an-archive.md) and its two amendments.
Vocabulary is [CONTEXT.md](../../../CONTEXT.md) — *Archive, Reader, Write path, Transcript,
Marker, Placeholder, Wall clock, Instant, Zone, Provenance, Blob* are used here in exactly
the senses defined there, per [language.md](../../rules/language.md).

**The question this area answers.** *Can Ambient turn a file the principal exported from
WhatsApp into a Transcript and Blobs on disk, with nothing interpreted, and say honestly
what it could not read?*

**Broken into six tickets** under [`issues/`](issues/), blockers first —
[00](issues/00-seam-map-rows-for-archive-and-transcript.md) ·
[01](issues/01-import-a-text-archive.md) ·
[02](issues/02-events-placeholders-edits-and-deletions.md) ·
[03](issues/03-zip-archive-and-media-as-blobs.md) ·
[04](issues/04-import-receipt-and-primary-source.md) ·
[05](issues/05-rename-invariant-and-close-the-area.md). 02 and 03 are parallel.

---

## The frame

**Incomplete is fine. Silently wrong is not.**

IMPORT exists to give KNOWLEDGE something to be about. It is not a system of record and it
does not have to be complete — 9 of 14 sender labels in the measured Archive join to no
contact at all, and that is acceptable, because an agent can reason from *"I don't know
who this is."*

It cannot reason from *"there was nothing there"* when there was. So every requirement
below exists because breaking it would make Ambient **confidently wrong**, not because it
would make the import imperfect. Where the two conflict, incompleteness wins and is
recorded.

This is the same discipline as the media states in
[scope.md](../intake/scope.md) and the `[assumed]` marker it derives from: *record the
uncertainty rather than hide it.* It is stated as a value in `types.ts` per
[errors.md](../../rules/errors.md), never as a silent gap.

---

## Problem Statement

The principal has years of real WhatsApp history — who everyone is, what they do, what was
agreed, across many conversations. Ambient has none of it. Its own number is a test line
with nothing canonical on it.

Without that history, a fresh install has nothing to be about. `~/email-pa` worked because
it was handed a year of real email. Ambient's equivalent is the principal's personal
WhatsApp, and Ambient does not live on that account and must never pretend it did.

The live protocol is not the answer on its own. Measured on one conversation: an Archive
holds **13,117 messages over 19 months and 1,139 media files as bytes**, needs no
credential, no socket, no lease and no awake service, and cannot be rate-limited. A file
is the whole dependency.

## Solution

One command turns an exported Archive into a Transcript and Blobs inside an existing Chat.

```
ambient import <archive> --into <slug> [--zone <IANA>]
```

It parses the export, writes one Transcript line per message, puts media bytes into the
content-addressed Blob store, keeps the export's own `_chat.txt` as the primary source, and
writes a receipt saying exactly what it read, what it could not read, and under which Zone.

**Three input forms, two Archive shapes.** The Reader accepts all three and the caller says
nothing about which it has:

| Given | Shape | Media |
|---|---|---|
| a bare `.txt` | without media | every media message is a Placeholder → `NoHandle` |
| a `.zip` holding exactly one file | without media | as above |
| a `.zip` holding `_chat.txt` + flat media files | with media | Markers resolve to Blobs → `Stored` |

A without-media Archive is **not a degraded import** — it is the shape the principal chose,
and the import says so rather than implying the conversation had no media. Measured: the
without-media export of the same conversation carries a Placeholder for **1,131 of 1,139**
attachments, so what was there stays visible even when the bytes are not.

Everything it produces is marked **known, not witnessed** — Ambient learned it, it was not
there.

## User Stories

1. As the principal, I want to import an exported WhatsApp conversation, so that Ambient
   knows what was said before it existed.
2. As the principal, I want the import to need only a file, so that it does not depend on a
   credential, a paired phone, or a service being awake.
3. As the principal, I want the import to work on the without-media `.txt` export, so that I
   can seed a conversation without moving 306 MB.
4. As the principal, I want the import to work on the with-media `.zip` export, so that
   voice notes, photos and documents arrive as actual bytes.
5. As the principal, I want the import to refuse a Chat that does not exist, so that nothing
   is ever ingested by accident.
6. As the principal, I want to name the Chat folder myself, so that two conversations both
   called "THE CALL" do not collide.
7. As the principal, I want to rename a Chat folder later, so that a name I chose badly is
   not permanent.
8. As the principal, I want to run the same import twice and get the same result, so that a
   half-finished run is safe to repeat.
9. As the principal, I want to import a newer export of the same conversation, so that the
   messages since the last export are added and nothing is duplicated.
10. As the principal, I want to be told how many lines could not be read, so that a silent
    parse failure is impossible.
11. As the principal, I want to be told how many media Markers had no file behind them, so
    that a truncated Archive is visible rather than looking like a media-free chat.
12. As the principal, I want the original `_chat.txt` kept, so that a future parser fix can
    be re-run without asking me to export again.
13. As the principal, I want a receipt naming the Archive by hash, so that I can tell which
    file produced which lines.
14. As the principal, I want the Zone recorded on every line, so that a Zone I got wrong is
    fixable without a re-import.
15. As the principal, I want to state the Zone as a place and not an offset, so that
    daylight saving is handled per message rather than per file.
16. As Ambient, I want every fact from an Archive marked **known**, so that I never claim
    presence I did not have.
17. As Ambient, I want to distinguish *"this message had no reply"* from *"this Reader
    cannot see replies"*, so that I do not reason from a gap I invented.
18. As Ambient, I want media that could not be read recorded with a reason, so that I can
    say "this existed and I could not read it" rather than implying I looked and saw
    nothing.
19. As Ambient, I want the sender kept as the label the Archive wrote, so that I never
    assert an identity the source did not carry.
20. As Ambient, I want edits, deletions and group membership events preserved, so that the
    shape of a conversation is not flattened into text.
21. As Ambient, I want messages in one ordered file per Chat, so that reading a conversation
    is one read and not a merge.
22. As KNOWLEDGE, I want to read a Transcript without learning the Archive format, so that
    the format can change without changing me.
23. As KNOWLEDGE, I want media addressed by hash, so that the same forwarded screenshot in
    four Chats is one Blob and one interpretation.
24. As a developer, I want the Archive Reader testable with a string, so that the grammar
    can be exercised without a filesystem or a phone.
25. As a developer, I want one Write path, so that the live Reader cannot drift from this
    one when INGEST lands.
26. As a developer, I want the import to fail with a named value rather than throw, so that
    the caller cannot be surprised at 3am.

## Implementation Decisions

### 1. IMPORT is an area, and it is not INTAKE

INTAKE splits into two areas with opposite risk profiles. **IMPORT** reads an Archive and
needs a file. **INGEST** reads a Live account and needs a credential, a lease, and an answer
to a question that is still open — a full history sync is delivered once per credential in
about seven batches of ~4,800 messages, and nothing says what happens if the process dies at
batch four.

The order is **forced, not preferred**: the next pairing spends the account's one full sync,
so the Write path must exist before anyone scans another QR. IMPORT ships it.

### 2. There is no `intake` module

An orchestrator that wires `archive`, `transcript`, `blobs` and `home` fails the deletion
test in [modules.md](../../rules/modules.md): deleting it moves four lines into one place,
and [seams.md](../../design/seams.md) already says only the composition root wires. IMPORT
adds one command handler alongside `init`, `doctor`, `chat add` and `agent add`.

**An area is not a module.** SKELETON was one area and produced two.

### 3. Three modules, and the seam is Reader versus Write path

| Module | Owns | Why it is a module |
|---|---|---|
| `archive` | a file → messages. No network, no home, no path building. | its test surface is a **string**; testing it through an importer would be testing past the interface |
| `transcript` | the one Write path: line format, dedup key, append, read | deleting it puts the format in three places — two Readers and KNOWLEDGE — and they will drift |
| `blobs` | content-addressed bytes, deduplicated by hash | already planned in `seams.md`; global, so one screenshot forwarded to four Chats is one Blob |

`channel` keeps the job `seams.md` gave it, minus history. It is INGEST's, not IMPORT's.

Readers vary — two today, email later — so that seam is real. The Write path does not vary,
so it is a module and not a seam.

### 4. The import is a command with a receipt, never a configured Source

An Archive lives wherever it was downloaded, so it can never be a `Place`, and a Source is
standing state that `doctor` validates every run — a consumed file is not standing state,
and the day the zip is deleted `doctor` would be red forever.

So: a command. It brings the primary source **inside** the home rather than referring
outward, and it does not copy the whole Archive. Measured: `_chat.txt` is **0.46%** of the
`.zip`, and the media bytes are going into `blobs` anyway, so copying the zip would store
them twice.

```
chats/<slug>/
  imports/<sha256-of-archive>/
    _chat.txt        the primary source, verbatim. re-parseable forever.
    receipt.json     archive hash + bytes + zone + reader version + counts + span + findings
  transcript.jsonl   derived
  media/             refs only — bytes are in the global Blob store
```

`imports/` is **foreign** in [ADR 001](../../adr/001-home-interface.md)'s sense: `home`
creates nothing there and never reads inside it. It is scaffolded by IMPORT, which is the
area that gives it a writer — the scaffolding rule in
[skeleton/spec.md](../skeleton/spec.md).

The receipt is where **provenance** stops being a promise. It also carries the Reader
version, which answers the fourth uncertainty state — *the source had it but our Reader was
too old to capture it* — once per import rather than on 43,000 lines.

### 5. A Transcript line is a discriminated union on Provenance

This is the decision the whole area turns on, and it is what makes the frame enforceable.

> **"Unknowable from this source"** = the field is **not in that variant's type**.
> **"Absent"** = the field is optional *within* a variant that has it.

A single flat shape with optional fields cannot express that difference: a missing `quoted`
would mean both *"no reply"* and *"this Reader cannot see replies"*. The union makes the
second one unrepresentable, checked by the compiler, at no runtime cost. It is exactly what
[errors.md](../../rules/errors.md) asks for — *"discriminated unions … over boolean flags
and optional-field state machines, so illegal states are hard to represent."*

```ts
// the decision, not the implementation — shapes, not a working type
| { from: "archive"; kind: "message"
    wall: string; at: number; zone: string      // Wall clock kept VERBATIM
    who: { label: string }                      // a display label, never an Address
    text: string; edited?: true; deleted?: true
    media?: ArchiveMedia }

| { from: "archive"; kind: "event"              // 174 measured in one conversation
    wall: string; at: number; zone: string
    event: "added" | "removed" | "left" | "renamed" | "icon" | "admin"
         | "number-changed" | "other"
    who: { label: string }; subject?: string; raw: string }

| { from: "live"; kind: "message"               // INGEST's, declared here so it cannot drift
    at: number; id: string
    who: { id: string; mode: "lid" | "pn"; alt?: string; pushName?: string }
    text?: string; msgKind: MsgKind
    quoted?: { id: string; from: string }; mentions?: readonly string[]
    edited?: true; viewOnce?: true; ephemeral?: true
    media?: LiveMedia }

| { from: "live"; kind: "reaction"; at: number; target: string
    who: { … }; emoji: string | null }          // null = the reaction was removed
```

Measured coverage, which is why the two variants differ rather than sharing optionals:

| Envelope fact | Archive | Live account |
|---|---|---|
| sender JID **and** LID | neither | `{ id, mode, alt? }` — `alt` **is** the mapping |
| `push_name` | one label, as of export day | per message |
| message id | absent | present |
| reply edge | **0 in 13,134** | `quoted { id, from }` |
| mentions | absent | present |
| reactions | 3 in 13,134 — noise | a separate `Update` stream |
| edited | **334** | `flags.edited` |
| deleted | **61** | `Update` stream |
| membership events | added 109 · removed 22 · left 36 · icon 4 · admin 1 · number 2 | present |

**`alt` is preserved wherever it appears.** It is a `witnessed` LID↔JID join that WhatsApp
supplies for free and that nothing downstream can rebuild — measured contrast: joining a
label to a contact by name succeeds on 5 of 14.

**Reactions, edits and deletions arrive after their message**, on whatsappd's `Update`
stream. A Transcript is append-only, so they are their own line kind and a later fold
assembles them. Rewriting a message line to attach a reaction is rejected: it breaks
append-only and therefore idempotency.

### 6. Time — the Wall clock is the primary source

An export writes a Wall clock and names no offset. The Zone is stated as an **IANA name,
never a fixed offset**, so daylight saving resolves per message rather than per file, and it
is recorded on every line beside the resolved Instant.

That makes a wrong Zone a **recompute of one number**, never a re-import. Measured cost of
getting it wrong: 1 hour out moves 143 of 13,134 messages to the wrong calendar date; 7
hours out moves 4,278. Message **order within an Archive never changes** under any uniform
shift, and only 8 messages sit within an hour of the Archive/live boundary.

The Zone defaults to the host's and is **printed and recorded**, never silently assumed.

Derivation is available but is a **check, not a source**: where the same conversation also
exists on a Live account, correlating Wall clocks against Instants identifies the offset —
measured at 160 exact hits out of 167 on the real data, with no seasonal shift across two
daylight-saving boundaries. It runs when live data exists and **reports a mismatch rather
than silently correcting one.**

### 7. Media — one success arm, and `NoHandle` is the only failure an Archive can reach

`Expired`, `Failed` and `NeverDriven` all describe a CDN that an Archive never touches. So
for this area the vocabulary is `Stored` or `NoHandle`, and `NoHandle` carries **why**:
`placeholder` (the export omitted the bytes) or `not-in-archive` (a Marker naming a file the
Archive does not contain).

`media` is **total** — a line cannot carry media without saying which state it is in.

**Zip entry names are decoded as UTF-8 regardless of the archive's flag.** This is a stated
invariant with a measured reason: **0 of 1,140 entries set the UTF-8 flag** while the bytes
are UTF-8 throughout, so a spec-conformant CP437 decode silently turns **4 of 1,139** media
files — contracts and sales decks, the ones with typographic dashes and narrow no-break
spaces — into false `NoHandle`s. With the correct decode the match is exact: 1,139 Markers,
1,139 files, zero unresolved.

Counts of Markers, resolved files and unresolved Markers go in the receipt, and an
unresolved count above zero is printed. A truncated Archive is a finding, not 1,139 shrugs.

### 8. Dedup — within a source by key, across sources by a cut

The key is `(wall, sender, text)`, **NUL-separated**, keyed on the **Wall clock and not the
Instant** so that changing the Zone does not change every key and duplicate the whole file.
Measured collisions on the real Archive: **1 in 13,134**.

Across sources there is **no key matching at all** — the two Readers agree on neither the
sender field (a label against an Address) nor, for all 1,139 media messages, the text field
(a filename the Live account never sees). The Archive owns everything up to its newest
Instant; the Live account owns everything after.

This **amends [ADR 003](../../adr/003-history-import-is-an-archive.md)**, whose Consequences
say deduplication *"must key on content and time"*. Content is precisely what the two
sources do not share.

### 9. A Chat is named by a human, and the folder name is a label

IMPORT never derives a slug and never creates a Chat. `import --into <slug>` **refuses** a
slug with no folder and names `chat add` as the remedy.

Measured, on the real account: **913 chats, 156 with a subject, 757 with none.** Over the
156 named, a naive derivation gives 0 illegal slugs but **9 collisions — 5.8%**, including
two conversations both reducing to `the-call`. A rule that covers 17% of chats is not a
rule, and deriving one would put untrusted input on a path — the subject of gate assertion
12 in [skeleton/spec.md](../skeleton/spec.md).

**The folder name is a label, not an identity.** A Chat is identified by `(source, peer)` in
its own config. Verified: no chat config records its own slug, the global config does not
list chats at all, chats are found by listing the directory, and Blobs are referenced by
hash. So renaming is `mv`, and that becomes an invariant with a gate row:

> **No Chat slug appears in any file outside that Chat's own folder.**

Because the folders are the opt-in, they are also the allowlist. There is no second
mechanism to keep in sync.

### 10. What IMPORT does not write

Nothing account-level. An Archive carries no contacts, no aliases and no participant lists —
measured: 14 sender labels, zero of which are phone numbers, and no membership roster.

The 65 raw phone numbers the Archive does contain (21 distinct) sit **entirely inside
ordinary message bodies**, zero in system events. Extracting a number from prose is
interpretation, and IMPORT interprets nothing.

When INGEST arrives with 1,560 contacts and 2,417 aliases it adds a global `sources/<name>/`
directory, scaffolded by the area that gives it a writer. IMPORT leaves the roadmap's one
budgeted layout revision unspent.

## Testing Decisions

**A good test here exercises the module's own interface and nothing behind it.** No test
reaches into `internal/`, and no symbol is exported for a test's benefit.

### The seams

Three, one per module, and each is the module's `types.ts` entry point. This is the highest
seam available and no new one is introduced.

| Seam | Tested with | Why here |
|---|---|---|
| `archive`'s entry | **a string**, and a real `.zip` fixture for the entry-name and media cases | the grammar is the risk; it must be exercisable without a filesystem, a home or a phone |
| `transcript`'s entry | a `Place` from `home` against a **real temp directory** | append, idempotency and torn-tail tolerance are filesystem behaviours; a memfs stand-in models rename atomicity as fiction |
| `blobs`' entry | bytes and a real temp directory | dedup by hash is the whole contract |

The command handler is covered through the CLI's existing surface, as `init` and `doctor`
already are — it wires and does nothing else, so it has no behaviour of its own to test.

**Prior art:** `src/modules/home/home.test.ts` is the model — the spec's gate made
executable, one numbered `it` per row, against real temp directories, declared as the single
length exception in the shape checker for exactly that reason. `src/modules/cli/cli.test.ts`
is the model for testing a command through argv.

**Fixtures.** The measured Archive is personal data and stays in `.spike-private/`, which is
gitignored. Committed fixtures are small, synthetic, and constructed to carry each measured
shape: a continuation line, a 12-hour clock, a Marker, a Placeholder, an entry name with a
typographic dash, a membership event, an edited marker, a deleted marker.

## The gate

The area's §4, made executable. `close-area` runs
[definition-of-done.md](../../design/definition-of-done.md) over it.

1. Importing the without-media export writes one Transcript line per message, and the count
   matches the file exactly — for a bare `.txt` **and** for a `.zip` holding one file, with
   identical results.
2. Importing the with-media export resolves **every** Marker to a Blob — zero unresolved —
   including entry names with a typographic dash or a narrow no-break space.
3. A Placeholder becomes a line whose media state is `NoHandle` with `why: "placeholder"`,
   never a line with no media at all.
4. A Marker naming a file the Archive does not contain becomes `NoHandle` with
   `why: "not-in-archive"`, and the receipt's unresolved count is non-zero and printed.
5. Running the same import twice appends nothing the second time and leaves
   `transcript.jsonl` byte-identical.
6. Importing a newer export of the same conversation appends only what is new.
7. Re-importing under a different `--zone` changes every `at` and appends **no** duplicate
   lines — the dedup key is the Wall clock.
8. Every line carries `wall`, `at`, `zone` and `from`, and no Archive line carries a message
   id, a reply edge, mentions or a reaction.
9. A membership event becomes a line of `kind: "event"`, not a message.
10. `import --into <slug>` for a Chat that does not exist writes nothing, exits non-zero,
    and names `chat add`.
11. `_chat.txt` is present under `imports/<hash>/` byte-identical to the Archive's own, and
    the receipt names the Archive by `sha256`.
12. A line the parser cannot read is counted in the receipt with its line number, is not
    written to the Transcript, and does not fail the import.
13. Two Blobs with identical bytes are stored once.
14. `chat add x` → import → `mv chats/x chats/y` → `doctor` exits `0`.
15. Nothing under `imports/` or `blobs/` is read by `home` — `doctor` opens no file whose
    size is bounded by traffic.
16. No `throw` under `src/`, and every failure is a declared value in a `types.ts`.

## Out of Scope

- **The Live account.** Paging, cursors, leases, rate-limit backoff, the one-shot full sync
  and its crash behaviour are INGEST's, and INGEST is a separate area.
- **Identity resolution.** A sender stays the label the Archive wrote. Joining labels to
  people is KNOWLEDGE's, and it is measured to fail on 9 of 14.
- **Any interpretation.** No summaries, no entities, no model call, no phone-number
  extraction from message bodies.
- **Account-level material.** Contacts, aliases, groups — an Archive has none.
- **Media understanding.** Speech-to-text, vision and extraction are MEDIA's. IMPORT stores
  bytes and records states.
- **Deriving a slug**, and any allowlist mechanism other than which Chat folders exist.
- **Merging with live data.** A cut at an Instant, never a merge.
- **Resumability.** A file parses in seconds; a crash means run it again.
- **The pairing and first-sync screen.** It belongs to INGEST and is designed with
  `impeccable` per [artefacts.md](../../rules/artefacts.md).

## Further Notes

**Evidence.** Every number here was measured on the principal's real export and the spike
artefacts in `.spike-private/`, which is gitignored. The load-bearing ones: 13,134 messages
and 6,473 continuation lines parsed with zero unreadable; 1,139 Markers against 1,139 files;
0 of 1,140 zip entries flagged UTF-8; 1 dedup collision in 13,134; 160 of 167 Instants
matched at a single offset across 19 months; 913 chats of which 757 unnamed; 5 of 14 labels
joining to a contact.

**The prototype.** `.spike-private/prototype-archive-reader/` proved the grammar and is a
primary source, not a template. Take the grammar; its shape predates ADR 003. Two defects in
it are corrected here rather than inherited: its dedup key claims NUL separation in a comment
and uses spaces in the code, and it does not recognise the `<attached: …>` Marker form at
all — so it cannot read the with-media shape.

**Two ADR amendments already stand** against ADR 003 and are the reason this spec exists in
its current form: the live column's evidence was taken with the full-history request
disabled, and a fresh pairing then reached 43,334 messages across 1,506 chats. Decision 1
survives both, with a narrowed reason — an Archive is chosen because it needs no credential
and carries media as bytes, no longer because the live route is shallower.

**What this leaves for INGEST.** One open question: a full history sync is delivered once per
credential, in about seven batches of ~4,800 messages, on a callback that must not block —
and nothing yet says what happens if the process dies at batch four. It is the reason the
areas split, and the reason the Write path ships here.
