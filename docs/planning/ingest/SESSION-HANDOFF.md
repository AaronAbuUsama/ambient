# INGEST — session handoff

**Closed 2026-08-18.** All six steps ran. This file is the record of the run; what INGEST
*is* now lives in [`spec.md`](./spec.md), [`design.md`](./design.md) and
[ADR 005](../../adr/005-channel-binds-to-the-durable-runtime.md).

---

## Where it is

**Closed. 16/16 gate.**

| Step | State | Produced |
|---|---|---|
| 1 · Map | done | [`scope.md`](./scope.md) — 17 questions, all closed, dissolved or retired |
| 2 · Design | done | [`design.md`](./design.md) — **the first time `design-slice` ever ran** |
| 3 · Frontier | done | 13 answered · 4 dissolved · 1 retired to the roadmap |
| 4 · Plan | done | [`spec.md`](./spec.md), 16 gate rows, and 5 tickets in [`issues/`](./issues/) |
| 5 · Build | done | `00 · 01 · 02 · 03 · 04`, all `done`. Two new modules: `channel`, `ingest` |
| 6 · Close | done | 16/16, and the roadmap moved to KNOWLEDGE |

## What shipped

`ambient pair <source>` · `ambient peers <source>` · `ambient ingest --into <slug>`.

- **`channel`** hides `whatsappd` entirely. `pair` spends the one-shot; `openMirror` reads
  current state with no socket, no lease and no runtime. It writes no Ambient state.
- **`ingest`** owns the order of the writes — Blobs, then one `writeTranscript` call.
- **`home`** grew the Source unit, so `doctor` reports on a Source directory like any other.
- **`transcript`** lost its `LiveReaction` line arm and gained `reactions` on `LiveMessage`.

**Proven on real data**, against copies so `~/.ambient` was never written to:

```
ambient peers ambient        85 conversations · store mtime unchanged
ambient ingest capxul-devs   911 lines of 911 read, revision 40, 1.7s
                             71 attachments → 67 Blobs · 43 the Source no longer holds
                             14,045 lines = 13,134 archive + 911 live
                             archive prefix 2,900,784 bytes BYTE-IDENTICAL
re-run                       0 written, byte-identical, inode unchanged
doctor                       exit 0
```

## The four things this Slice learned

1. **The Mirror is current state, so there is no Cursor.** Reading the event log grew a
   Cursor, a resume position and a backfill-versus-live distinction out of nothing. All
   three were artefacts of reading the wrong store.
2. **`libsqlBackend` creates the file it is pointed at.** Without a check, reading an
   unpaired account succeeds and reports zero conversations. Gate row 3 would have passed
   vacuously; `Unpaired` is why it does not.
3. **A public type with no producer models the wrong thing.** `LiveReaction` was a line for
   two days. Reactions are state — [ADR 004 amendment 1](../../adr/004-transcript-line-is-a-union-on-provenance.md#amendments).
4. **State the instrument with every number.** *"353 transport failures against 22
   expiries"* was repeated for two days across four reports. It was a regex over signed CDN
   URLs. The correct reading is **375 unclassified failures**.

## What is still open, and deliberately

- **`LiveMedia`'s `Expired` arm has no producer.** `channel` maps a Source `failed` record
  to `Failed`; nothing distinguishes an expiry yet. Named rather than quietly shipped.
- **Scale is unmeasured above one account.** Every read measurement holds one transaction
  open over ≤ 911 messages. [ADR 005](../../adr/005-channel-binds-to-the-durable-runtime.md)
  falsifier 2.
- **The `personal` account is still unpaired**, and its one-shot is unspent. The pipeline is
  now proven, so spending it is a decision rather than a risk.
- **375 media failures** — on the roadmap's research queue, blocking *trusting* KNOWLEDGE,
  not KNOWLEDGE.

## The account is paired, and the sync is on disk

*Instrument: `sqlite3 COUNT(*)` over `~/.ambient/sources/ambient/whatsapp.db` after a clean
stop, 2026-08-18. WAL checkpointed to 0 bytes.*

```
wa_messages          6,724      wa_chats     85      wa_groups   23
wa_contacts             69      wa_accepted_batches  41
media files            199      store        85 MB   whatsapp.db 11 MB
```

**This is the `ambient` Source — the agent's own account.** It is **not** the account the
Capxul Devs Archive came from; that one is `personal` and is **still unpaired**. Its one-shot
is unspent and should stay that way until the pipeline is proven on this data.

Batches that landed: `initial_bootstrap` 156 · `recent` 2,583 · `full` 4,121.

**A spent credential sits beside it** at `sources/ambient-spent-090726/` — a first attempt that
paired through the auth-only store and lost its sync. Kept as evidence, deletable.

## What this Slice also produced, which is not product

[`method/deficits.md`](../method/deficits.md) gained **cohorts two and three — deficits 7–23**,
found by running the six-step rule rather than reading it. Ten are missing surfaces in the
method itself; the sharpest is **10: there is no entry point, nothing runs a step.** The step
report now has a template at the foot of that file, and it is a cap on length as much as a
shape.

## Standing lessons

- **State the instrument with every number.** The 353-vs-22 media split was a regex over
  signed CDN URLs: `404` matches 14 of 375 records and the nonsense token `777` matches the
  same 14. The correct reading is **375 unclassified failures**.
- **Check the agent's summary against source.** Three of five research passes needed a
  correction, and every check cost under a minute.
