# INGEST — session handoff

**Written 2026-08-18.** The single source of truth for where this Slice stands. The whole
current state as one page is [`ingest.html`](./ingest.html) — gitignored, regenerate with
`render-slice`.

---

## Where it is

**Steps 1–4 are done. Step 5, Build, is running: `00` is closed, `01` is next.**

| Step | State | Produced |
|---|---|---|
| 1 · Map | done | [`scope.md`](./scope.md) — 17 questions, all closed, dissolved or retired |
| 2 · Design | done | [`design.md`](./design.md) — **the first time `design-slice` ever ran** |
| 3 · Frontier | done | 13 answered · 4 dissolved · 1 retired to the roadmap |
| 4 · Plan | done | [`spec.md`](./spec.md), 16 gate rows, and 5 tickets in [`issues/`](./issues/) |
| **5 · Build** | **running** | `00` **done** · `01` **done** · `02` next, then `03 → 04` |
| 6 · Close | — | `close-slice` |

**`00` closed 2026-08-18.** `seams.md` carries the amended `channel` row, the new `ingest`
row and the three changed graph lines; `whatsappd@0.4.0-alpha.3` and `@libsql/client@^0.15.15`
are runtime dependencies. `vp check` pass·pass, shape clean, 53 tests, nothing under `src/`.
Two build scripts had to be answered to get there — `baileys` and `protobufjs`, both `false`,
matching `whatsappd`'s own workspace. Evidence is in the ticket's Comments.

**The page is stale.** Step 5 is not finished, and `render-slice` runs when it is.

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

## The four things a new context must not repeat

1. **The examples pair through the CREDENTIAL store.** `examples/pair-page/index.ts:303` is
   `createSession` + `libsqlStore`, which persists `wa_auth` and **no messages**. It cost one
   full sync today and 43,334 messages in August. The durable wiring — `libsqlBackend` +
   `fileMediaStore` + `createWhatsAppRuntime` — is in `.spike-private/pair/screen.ts`, which is
   whatsappd's own page with that one thing swapped. **Ticket `02` moves it into `channel`.**
2. **Verify the schema before anyone scans.** `sqlite3 <db> "SELECT name FROM sqlite_master"`
   must list `wa_messages`, not just `wa_auth`.
3. **A batch commits only after every attachment in it is fetched, one at a time.** So
   `wa_messages` sits still while `media` climbs. That is not a stall — it is
   [`findings/01`](findings/01-durable-full-sync.md) §3 exactly.
4. **Read the mirror, never the event log.** The log seam grows a Cursor and a
   backfill/live distinction out of nothing. `backend.data.read(accountId, view => …)` +
   `view.snapshot()` + `view.messages(chatId, {before})`. Measured at **88 ms**, cross-process,
   no socket and no lease — [`findings/07`](findings/07-backends-and-the-mirror-read.md).

## Start here

**`02`** — [pair a live account](issues/02-pair-a-live-account.md). Then `03` (peers) →
`04` (ingest).

**`01` is done.** Gate rows 11, 12 and 13 pass. `transcript` gained
[`internal/lock.ts`](../../../src/modules/transcript/internal/lock.ts) and a key-order-blind
change comparison; `merged` lost the provenance gate that made it a no-op for Live lines.
**D1 needed real data to see** — a replay through `readTranscript` passes on the broken code,
because those lines are already in the store's field order. Feeding the real 13,134 lines back
in the *Reader's* order rewrites the whole file before the fix and touches nothing after it.
The ticket's fourth, smaller defect — two copies of one id inside a single batch — is
deliberately left to `04`, which is where a Live batch first exists.

**`00`** — [seam rows + dependencies](issues/00-seam-rows-and-libsql.md) — is **done**, so
`new-module` will now scaffold `ingest`, and `channel` may name `whatsappd`. Nothing else may.

## What this Slice also produced, which is not product

[`method/deficits.md`](../method/deficits.md) gained **cohorts two and three — deficits 7–23**,
found by running the six-step rule rather than reading it. Ten are missing surfaces in the
method itself; the sharpest is **10: there is no entry point, nothing runs a step.** The step
report now has a template at the foot of that file, and it is a cap on length as much as a
shape.

## Standing lessons, both earned today

- **State the instrument with every number.** *"353 transport failures against 22 expiries"*
  was repeated for two days and in four reports. It was a regex over signed CDN URLs: `404`
  matches 14 of 375 records and the nonsense token `777` matches the same 14. The correct
  reading is **375 unclassified failures**.
- **Check the agent's summary against source.** Three of five research passes needed a
  correction, and every check cost under a minute.
