# INGEST · S1 — does the existing Transcript Write path accept a Live-account line, and how fast

**Question.** `LiveMessage`, `LiveReaction`, `LiveWho` and `LiveMedia` have existed in
`src/modules/transcript/types.ts` since IMPORT with **no producer** — `grep -rn 'from:
"live"' src/` returns four hits, two type declarations and two lines of the deserialiser.
Does `writeTranscript` actually accept one, end to end, and at what cost? Answered before a
WhatsApp pairing is spent on it.

**Instrument.** Throwaway code in `.spike-private/live-line/` (gitignored, not committed):
`spike.ts` (the five measurements), `order.ts` (isolates one cause), `concurrent.ts` (one
consequence). Synthetic lines only — invented ids, `lorem`-style text, `Persona NN` labels.
Every run built its own home under `mkdtemp`, asserted the root was inside that temp
directory before the first write, and went through the real path: `openHome` →
`converge()` → `chat(...).converge()` → `chat.transcript()`. Module code called directly
via `node --import ./scripts/module-aliases.ts`, never reimplemented. **Apple M1 Pro,
16 GB, macOS 26.1 (darwin 25.1.0), APFS, Node v24.19.0.**

---

## Verdicts

| # | Measurement | Verdict |
|---|---|---|
| 1 | Does it accept a Live line at all | **Yes, and no field is dropped or coerced.** 1,000 mixed lines in, 1,000 out, 1000/1000 value-identical. It is **not** byte-for-byte: 638/1,000 came back with their JSON keys **reordered**. |
| 2 | Throughput | **372,721 lines/s in one batch** — 50,000 lines in 134 ms, 14,203,605 bytes, 284.1 B/line. **10 lines/s one line at a time at 43,334 lines deep.** The batch number is the one that does not describe a live account. |
| 3 | Idempotency | **`written: 0`, correct — and the whole file is rewritten anyway.** The Live dedup key is the message id, so the sharp case is safe: two different messages with identical text in the same millisecond do **not** collapse. Two copies of one id **inside one batch** both get written. |
| 4 | Reactions | **An append-only log, never state.** Add, change, other-reactor and removal are four separate lines; nothing supersedes anything. Replay is idempotent. A re-delivery with a shifted `at` duplicates. |
| 5 | Failure arms | **Eight of eight came back as `{problems: […]}`. Nothing threw.** A torn last line self-heals on the next write. |

**The bottom line: the path accepts a Live line and loses nothing on the way in. What it is
not fit for is the shape of a live account — one line at a time, re-delivered, and written
by more than one caller at once.** Six defects, below; two of them lose data.

---

## 1 · Acceptance and round-trip fidelity — 1,000 synthetic lines

Instrument: 1,000 lines from the generator (888 messages / 112 reactions; text, media in
all five `LiveMedia` states, `fromMe` and not, `lid` and `pn` modes, `alt` and `pushName`
present on some, quoted, mentions, `edited`/`viewOnce`/`ephemeral`), one `writeTranscript`,
one `readTranscript`, then a per-line comparison at two strengths — key-sorted JSON (value
identity) and raw JSON (key-order identity).

```
written=1000 skipped=0 messages={"written":888,"skipped":0} readBack=1000
value-identical:     1000/1000   (mismatched: none)
key-order-identical:  362/1000   (reordered: 638)
  produced order:  from,kind,at,id,who,text,msgKind,media
  read-back order: from,kind,at,id,who,msgKind,text,media
```

Nothing is dropped and nothing is coerced. `who.alt`, `who.pushName`, `quoted`, `mentions`
order, the three optional `true` flags, `emoji: null`, and every `LiveMedia` state survive.
`readTranscript` returns the lines in write order.

**Reordered, though**, and the reorder is not cosmetic — it is the cause of defect **D1**.
`types.ts:71-82` declares `text` before `msgKind`; `store.ts:171-185` reconstructs
`msgKind` before `text`. A producer that builds the object in the order its own type
declares it round-trips to a differently-ordered object.

## 2 · Throughput

Instrument: `performance.now()` around one `writeTranscript`; `fs.statSync().size` for
bytes; `process.memoryUsage().heapUsed` after.

| Shape | Wall clock | Rate |
|---|---|---|
| 50,000 lines, one call, empty transcript | **134.1 ms** | 372,721 lines/s |
| the same 50,000 again (all duplicates) | **341.3 ms** | — |
| `readTranscript` of 50,000 | 79.0 ms | 633,000 lines/s |

50,000 lines occupy **14,203,605 bytes — 284.1 B/line**; the measured account-wide
43,334 would be ≈ 12.3 MB. Resident heap after the write: 136 MB, i.e. O(transcript), not
O(batch).

**One line per call — the live shape — is where it falls over.** `writeTranscript`
(`service.ts:28`) loads and re-parses the entire transcript on every call:

```
       0 existing lines →   0.2 ms per single-line append   (5,035 lines/s)
    1000 existing lines →   2.4 ms                          (  414 lines/s)
   10000 existing lines →  22.0 ms                          (   45 lines/s)
   43334 existing lines → 101.9 ms                          (   10 lines/s)
```

That is 0.00235 ms per existing line — linear, so a whole ingest is quadratic. Measured
end to end over 43,334 lines at four batch sizes:

| Batch size | Total wall clock | Effective rate |
|---|---|---|
| 1 | **≈ 2,206 s (≈ 37 min)** — extrapolated, not run | 20 lines/s |
| 100 | 20.44 s | 2,120 lines/s |
| 1,000 | 2.12 s | 20,480 lines/s |
| 5,000 | 0.44 s | 98,142 lines/s |
| 43,334 (one call) | 0.06 s | 670,605 lines/s |

The extrapolation is `k·N²/(2·batch)` with `k = 0.00235 ms`; it predicts 22.1 s at batch
100 against 20.44 s measured (8 %), so the batch-1 figure is credible to within a few
minutes. **Batching is worth three orders of magnitude and costs nothing but a buffer.**

## 3 · Idempotency and the dedup key

Instrument: write a batch, `statSync` the inode and mtime and read the bytes, write the
identical batch again, compare.

```
re-write same 2,000: written=0 skipped=2000
  bytes identical: true
  inode CHANGED 514859262→514859263 — the whole file was rewritten
  mtime CHANGED
```

**The count is right and the disk behaviour is not.** `written: 0` is reported, and
`replace()` (`store.ts:237-250`) still wrote a full temp copy and renamed it over the
original. See **D1**.

**The sharp question — does an Archive-shaped key collapse two different Live messages? —
is answered no.** `key.ts` keys a Live message on `["live", "message", id]`, not on
wall-clock-plus-text:

```
two distinct ids, same text, same ms: written=2 skipped=0 onDisk=2
  replayed:                           written=0 skipped=2
```

Two messages with identical text in the same millisecond stay two lines, and a replay
skips both. The key is fit for Live in the case it was designed against.

It is not fit in two others, **D3** and **D4**:

```
same id twice in ONE batch:  written=2 skipped=0 onDisk=2
  then one more of that id:  written=0 skipped=1     ← the duplicate is now "correct"
```

and a re-delivery with a changed field silently overwrites the stored one (**D2**):

```
re-send of a Stored-media id carrying NeverDriven: written=0 skipped=1
  media now on disk: {"state":"NeverDriven"}          ← the blob hash is gone
id SAMEID at 1000 then 9999: written=0 skipped=1 onDisk=1 at=9999
```

## 4 · Reactions

Instrument: one transcript, one target, reactions applied one call at a time, reading the
whole transcript back after each.

```
add heart                                : written=1 → reactions on disk=1 [heart]
same who, +1 (changed)                   : written=1 → 2 [heart +1]
other who, heart                         : written=1 → 3 [heart +1 heart]
removal (emoji null)                     : written=1 → 4 [heart +1 heart null]
replay the whole log                     : written=0 skipped=4 → 4   (idempotent)
same emoji, same ms, twice in one batch  : written=2 → 6 [heart +1 heart null fire fire]
same who+target+emoji, at 1000 then 1001 : written=1 → 2
```

**Two reactions on one target coexist; a removal appends a fifth line rather than
retracting the first.** That is a defensible design for an append-only Transcript — the
evidence is kept and the current state is a fold — but *nothing in the repo folds it*, and
the Transcript's readers will each have to. It should be written down as a decision rather
than discovered by a reader. The `at` in the reaction key (`key.ts:9`) makes the fold
lossy in one direction: the same reaction re-delivered a millisecond apart is two lines
that a fold cannot tell from a genuine remove-and-re-add (**D4**).

## 5 · Failure arms

Instrument: eight induced failures, each wrapped in `try/catch`, reporting whether the
result was a value or a throw. `errors.md` requires a value.

| Arm | Result |
|---|---|
| transcript file `0444`, new line to append | `{problems:[Unwritable(EACCES …)]}` |
| parent directory `0555` | `{problems:[Unwritable(EACCES …)]}` |
| `Place` pointing at a directory | `{problems:[Unreadable(EISDIR …)]}` |
| `Place` under a path that does not exist | `{problems:[Unwritable(ENOENT …)]}` |
| transcript `0000` | `{problems:[Unreadable(EACCES …)]}` |
| a malformed line already on disk | `{problems:[MalformedLine]}` |
| `replace()` into a read-only directory | `{problems:[Unwritable]}` |
| a torn last line (crash mid-append) | **succeeds and repairs it** — 467 B whole → 494 B torn → 623 B after the next write, 4 lines readable |

**Eight of eight are values. Nothing threw.** The torn-line arm is the good news of this
spike: `load` (`store.ts:202-217`) truncates the partial row and `append`
(`store.ts:229`) rewrites from the last complete newline, so a crash mid-append costs one
line and repairs itself on the next write with no operator action.

---

## Defects found

None of these were patched — `src/` is untouched.

### D1 · Every replay rewrites the entire Transcript, while reporting `written: 0`

`service.ts:65` decides "did anything change" by comparing serialised JSON:

```ts
const next = merged(lines[index]!, line);
if (JSON.stringify(lines[index]) !== JSON.stringify(next)) {
```

`lines[index]` came back through `store.ts`'s `lineOf`, in *its* key order.
`next` is the caller's object, in the caller's key order. **Key order alone sets
`changed`**, and `service.ts:73` then takes `replace()` instead of the no-op. Isolated in
`order.ts` — one line, written twice, nothing else varying:

```
types.ts declaration order    keys=from,kind,at,id,who,text,msgKind  written=0 rewritten=true
store.ts reconstruction order keys=from,kind,at,id,who,msgKind,text  written=0 rewritten=false
no text at all (orders coincide)                                     written=0 rewritten=false
```

It is **pre-existing and not Live-specific** — both Archive orderings rewrite too. It is
invisible today because `transcript.test.ts` asserts the *bytes* are identical after a
re-import, and they are: the rewrite happens to reproduce them. It stops being invisible
the moment a partial replay is involved, because the lines *not* in the incoming batch are
re-encoded in the deserialiser's order:

```
replay 10 of 1,000: written=0 skipped=10 bytesIdentical=false size 284093→284093
```

Cost on a live account: a 12 MB write plus a rename on every re-sync, and — with D6 — a
window in which another writer's append can be lost.

### D2 · A Live re-delivery is last-writer-wins on every field, including a resolved media hash

`service.ts:12-19`'s `merged` guards `stored.from === "archive"`, so the "don't downgrade
`Stored` media" rule applies to Archive lines only. For a Live line it returns `incoming`
unconditionally. Measured: a message stored with `{state:"Stored", hash}` and re-delivered
carrying `{state:"NeverDriven"}` ends up `NeverDriven` on disk — **the blob reference is
lost, and `written: 0 / skipped: 1` is reported.** The same happens to `at` (1000 → 9999).
This is the mechanism edits will need, so the fix is a per-field rule, not a blanket
"first writer wins".

### D3 · Two copies of one message id inside one batch are both written

`service.ts:47-57` dedups by *occurrence index*: the nth line with a given key matches the
nth stored line with that key. That is correct for Archive, where identical text in the
same minute is a real repeat. A Live message id is unique by construction, so a batch
carrying it twice — a history-sync overlap, a re-delivered `messages.upsert` — produces two
lines, and every later replay then reports both as legitimately present.

### D4 · The reaction key contains `at`, so a re-delivered reaction duplicates

`key.ts:9` keys a reaction on `[from, kind, at, target, who.id, emoji]`. Same reactor, same
target, same emoji, one millisecond apart → two lines. A reaction has no id of its own in
`types.ts`, so there is nothing sharper to key on without changing the type.

### D5 · `writeTranscript` is O(transcript) per call

`service.ts:28` loads and JSON-parses the whole file on every call, and holds it in memory
(136 MB heap for 50,000 lines). Fine for the Archive shape — one call per import. For the
Live shape it is 10 lines/s at account depth and quadratic over an ingest.

### D6 · Two concurrent writes lose data silently, and both report success

Not asked for, found on the way. `concurrent.ts`, one `Place`, two `writeTranscript`
calls in flight:

```
two concurrent appends  → lines=3 ids=SEED,A,B         (fine — appendFile is atomic enough)
append racing a replace → lines=1 ids=SEED             ← "NEW" is gone
```

`replace()` writes a temp file from the snapshot it loaded and renames it over the
transcript, destroying an append that landed in between. **Both calls returned success
values.** This cannot happen on the Archive path — one importer, one call — and is
unavoidable on the Live path, which has at least a message writer and a media-resolution
writer. D1 makes it far likelier, because it sends ordinary idempotent replays down the
`replace()` arm.

---

## What this settled, in one paragraph

The Write path accepts a Live line: 1,000 synthetic messages and reactions went in through
`openHome` → `chat.transcript()` → `writeTranscript` and came back out of `readTranscript`
value-identical, every optional field and every `LiveMedia` state intact, and all eight
induced failures returned `{problems: […]}` rather than throwing — a torn last line even
repairs itself. The dedup key is safe in the case it was feared for: keying a Live message
on its id, not on wall-clock-plus-text, keeps two same-text messages in the same
millisecond apart. **So no pairing is at risk of writing into a path that cannot hold the
data.** What the spike settles negatively is the *shape*: this is a batch interface with an
Archive's assumptions, and a live account is neither batched nor single-writer nor
delivered once. One line at a time it manages 10 lines/s at account depth and would take
about 37 minutes to lay down 43,334 messages, against 2.1 seconds in batches of 1,000 —
so INGEST must buffer, and the buffer size is now a measured number rather than a
preference. Below that, three assumptions have to be revisited before the first live line
is written for real: a replay rewrites the whole file because key order alone decides
"changed" (D1); a re-delivery overwrites a resolved media hash because `merged` only
protects Archive lines (D2); and an append racing that rewrite is lost with both callers
told they succeeded (D6). D1 and D6 compound — the first sends ordinary idempotent
traffic down the arm that makes the second possible — so they are one fix, at
`service.ts:65` and `service.ts:73`, not two.
