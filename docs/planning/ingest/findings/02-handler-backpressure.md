# INGEST · R2 — handler backpressure and batch loss in `whatsappd`

**Question.** `whatsappd` awaits each subscribed handler before the next event and
before the transition to `online`. During a one-shot full history sync of ~43,000
messages arriving as ~7 `full` batches of ~4,800 each, what happens if a handler does
per-batch disk I/O that takes seconds — and can a batch ever be lost?

**Sources.** All citations are to `~/projects/whatsappd` at the state read on
2026-08-18 (read-only). Paths below are relative to `/Users/abuusama/projects/whatsappd`.
Baileys citations are to the vendored `packages/whatsappd/node_modules/baileys` at
version `7.0.0-rc14` (`package.json`), which is the primary source for
Baileys-side behaviour.

Everything marked **READ** is quoted or directly derived from a cited line.
Everything marked **INFERRED** is my reasoning over cited lines and is flagged as such.

---

## Verdicts, in one table

| # | Question | Verdict |
|---|---|---|
| 1 | Ordering / backpressure contract | Handlers are awaited inside `dispatch`; delivery is serialised **globally per session** across all event kinds *and* the session's own state transitions. ADR-**0013**. |
| 2 | Timeouts | **No timeout, watchdog or grace period can fire while a handler is running.** `syncGraceMs` governs only the "returning device forced to `online`" backstop, is **never armed at all** on the fresh-pairing full-sync path, and its callback queues *behind* the running handler even when it is armed. |
| 3 | Throw / reject | A throw or rejection — sync or async — **kills the session terminally, no reconnect**. Not swallowed, not logged by the library, surfaced as the rejection of `start()`/`stop()`. **The batch is dropped and never retried.** |
| 4 | Loss modes | Six enumerated below. The dominant three: handler rejection (batch dropped, session dead), runtime teardown unsubscribing before the queue drains, and a throw in the Baileys-side mapping layer. |
| 5 | Slow consumer | The socket **buffers without bound** in `EventQueue`; whatsappd applies no backpressure to Baileys and Baileys applies none to the WhatsApp socket. A 30 s handler causes unbounded memory growth, not a transport stall. Whether WhatsApp *itself* abandons remaining `full` batches is **not answerable from this source**. |
| 6 | Runtime vs raw session | Different in *when* they subscribe and *how* they tear down, identical in delivery semantics. **Neither is safe for a one-shot sync without the caller adding a retry-free-safe design** — see §6. The runtime is the safer of the two, but adds two failure modes of its own (lease expiry, unsubscribe-before-drain). |

---

## 1. The ordering / backpressure contract

### Where a handler is awaited

**READ** — `packages/whatsappd/src/subscription.ts:75-106`. `dispatch` builds one
promise per *subscription*, resolves the matching handler for the event kind, and
awaits all of them:

```ts
async dispatch(event) {
  const pending = [...subscriptions].map(({ handlers }) =>
    Promise.resolve().then(() => {
      switch (event.type) {
        ...
        case "conversation_sync":
          return handlers.conversationSync?.(event.batch);
        ...
      }
    }),
  );
  const results = await Promise.allSettled(pending);
  const rejected = firstRejection(results);
  if (rejected) throw new SubscriptionHandlerError(rejected.reason);
}
```

Two structural facts fall out of that snippet:

- **Fan-out within one event is concurrent, not serial.** `[...subscriptions].map(...)`
  starts every subscription's handler before awaiting any of them, and
  `Promise.allSettled` (line 103) lets all of them finish even when one rejects.
  Two subscribers therefore run their disk I/O for the same batch in parallel.
- **The `Promise.resolve().then(...)` wrapper (line 77) converts a synchronous throw
  into a rejection**, so "throws synchronously" and "returns a rejected promise" are
  the same case from line 103 onward. Confirmed by test — see §3.

### Where the serialisation is

**READ** — `packages/whatsappd/src/session.ts:422-430`. One promise chain per session:

```ts
let eventPipeline = Promise.resolve();

function enqueue(work: () => Promise<void>): Promise<void> {
  const task = eventPipeline.then(work);
  eventPipeline = task;
  void task.catch(signalPipelineFailure);
  return task;
}
```

**READ** — `session.ts:581-598`. The socket-drain loop `await`s each enqueued unit
**before pulling the next event off the iterator**:

```ts
const events = conn.events[Symbol.asyncIterator]();
while (true) {
  const next = await Promise.race([...]);
  ...
  await enqueue(async () => {
    try { await handle(next.result.value); }
    catch (error) { throw error instanceof SubscriptionHandlerError ? error : new SessionProcessingError(error); }
  });
}
```

**READ** — `session.ts:432-442`. The session's own state transitions ride the *same*
chain and themselves await the connection handler:

```ts
async function apply(input: Input): Promise<void> {
  const next = transition(status, input, ctx, Date.now());
  if (next === status) return;
  ...
  status = next;
  await dispatcher.dispatch({ type: "connection", status });
}
```

**READ** — `session.ts:515-516`. `conversationSync` is dispatched with no phase gate
at all — batches are delivered whether or not the session has reached `online`:

```ts
case "conversation_sync":
  return dispatcher.dispatch({ type: "conversation_sync", batch: ev.sync });
```

### Scope of the serialisation

**READ + INFERRED.** One `eventPipeline` per `createSession` call
(`session.ts:422`, inside the `createSession` closure at `session.ts:376`), and one
`dispatcher` per session (`session.ts:406-408`). So delivery is serialised **per
session, across every event kind, and across the connection state machine** — not
per event kind and not per subscriber. A `conversationSync` handler blocks `message`,
`update`, `contact`, `group`, `presence` and `connection` alike. (INFERRED from the
single shared chain; asserted directly by the test in §2.)

### The ADR

The number in the session docs is correct: **ADR-0013**, `docs/adr/0013-one-typed-handler-subscription-is-the-live-session-api.md`, `status: accepted`.

The rule, quoted (`0013…md:10-12`):

> Matching asynchronous handlers across all subscriptions are awaited before the
> session accepts the next normalized event; rejection fails the processing pipeline
> rather than being logged and skipped.

And the consequence that answers most of this brief (`0013…md:34-46`):

> - Slow handlers deliberately backpressure live ingestion; persistence and media
>   capture dominate the negligible dispatcher cost.
> - The backpressure reaches the connection state machine, because subscriber
>   dispatch and the session's own transitions share one serialized chain. A handler
>   that never returns therefore holds the session at `authenticated` / `draining`
>   rather than merely delaying events, and does so silently: the grace timer that
>   would force `online`, and any diagnostic the session might log, are queued behind
>   the handler that is not finishing. This is the price of the ordering guarantee and
>   is accepted; it is documented in `docs/runbooks/operations/session-faults.md` §3
>   rather than mitigated, because a watchdog cannot fire on the blocked event loop
>   that produces the worst case.

ADR-0021 (`docs/adr/0021-session-failures-have-one-precedence.md:8-19`) extends the
awaited-handler rule across teardown and fixes the reporting precedence:
subscriber rejection > teardown failure > run failure.

**Verdict (1).** Handlers are awaited at `subscription.ts:103`; the serialisation is
**global per session** (one chain, all kinds, plus transitions); the ADR is **0013**
and it says rejection *fails the pipeline* rather than being logged and skipped.

---

## 2. Timeouts — there are none that can reach a running handler

### Every timer in the library

**READ** — exhaustive `grep` for `setTimeout|setInterval|AbortSignal|timeout` over
`packages/whatsappd/src`. The complete list of timers:

| Timer | Site | What it does |
|---|---|---|
| `verdictTimer` | `session.ts:415,481` | Pairing-code silent-rejection window (`verdictWindowMs`, default `30_000` at `session.ts:398`) |
| `syncTimer` | `session.ts:421,454-459` | The `syncGraceMs` backstop (default `3_000`, `session.ts:399`) |
| backoff `delay` | `session.ts:296,662` | Reconnect wait |
| pacer `delay` | `pacer.ts:10` | Outbound send min-gap |
| lease `heartbeat` | `runtime/runtime.ts:743-752` | `setInterval` at `leaseTtlMs / 2` (TTL default `30_000`, `runtime.ts:378`) |
| operation retry | `runtime/operation-executor.ts:174` | Outbound operation retry |

**There is no handler watchdog, no per-dispatch timeout, and no `AbortSignal.timeout`
anywhere on the ingestion path.** The `AbortSignal` in
`subscription.ts:55,62-73` is a *cancellation* handle for the subscription itself
(it removes the subscription); it does not abort a handler that is already running.

### What `syncGraceMs` actually governs

**READ** — `session.ts:454-459`:

```ts
function armSync(): void {
  clearSync();
  syncTimer = setTimeout(() => {
    void enqueue(() => apply({ t: "synced" }));
  }, syncGraceMs);
}
```

**READ** — `armSync()` has exactly **one** call site, `session.ts:499`:

```ts
case "open":
  await apply({ t: "open" });
  if (initialSyncComplete) armSync();
  return;
```

**READ** — `initialSyncComplete` comes from the credential:
`baileys/auth-state.ts:69` → `initialSyncComplete: Number(creds.accountSyncCounter ?? 0) > 0`.

**INFERRED, high confidence.** Therefore:

- `syncGraceMs` is the **returning-device backstop only** — the comment at
  `session.ts:418-420` says exactly that ("Baileys skips history once
  `accountSyncCounter` proves the first history/app-state sync already completed").
- On the scenario in this brief — a **fresh pairing** that asks for full history
  (`syncFullHistory` default `true`, `session.ts:141-146`) — `accountSyncCounter` is
  0, so `initialSyncComplete` is `false`, so **`armSync()` is never called and no
  sync timer exists at all**. The path to `online` is `conversation_sync_complete` →
  `clearSync()` + `apply({t:"synced"})` (`session.ts:511-514`), which is itself an
  event on the pipeline.
- Note a small doc/code discrepancy worth flagging to whoever owns whatsappd:
  `docs/runbooks/operations/session-faults.md:95-96` says "Removing the offending
  handler body should produce `online` within `syncGraceMs` (3s by default)" without
  the returning-device qualifier. On a fresh pairing there is no such timer.

### Can it fire while a `conversationSync` handler is awaiting?

**No.** The `setTimeout` *callback* runs (assuming the event loop is not blocked), but
all it does is `void enqueue(() => apply({ t: "synced" }))` — which chains onto the
same `eventPipeline` behind the in-flight handler (`session.ts:425-430`). It cannot
preempt.

**Strongest evidence — a test asserts exactly this.**
`packages/whatsappd/tests/session.test.ts:193-257`, *"timer transitions wait for
message delivery and fail the session pipeline"*. It configures `syncGraceMs: 5`
(line 232), suspends a `message` handler on a promise (lines 236-240), waits 20 ms —
four grace periods — and asserts:

```ts
await messageStarted;
await new Promise<void>((resolve) => setTimeout(resolve, 20));
expect(onlineDelivered).toBe(false);   // line 252
```

The `online` transition had **not** been delivered. Releasing the handler then lets
it through (`expect(onlineDelivered).toBe(true)`, line 255).

**Verdict (2).** No timeout, watchdog or grace period can fire against a running
handler. `syncGraceMs` governs only the returning-device forced-`online` backstop; on
a fresh full-history pairing it is never armed; even when armed it queues behind the
handler. The runbook says the same in prose
(`docs/runbooks/operations/session-faults.md:65-101`), and names it a consumer bug the
library will not mitigate.

**One timer *does* keep running during a slow handler** and it matters: the runtime's
lease `heartbeat` (`runtime/runtime.ts:743-752`) is a plain `setInterval`, off the
event pipeline. It renews as long as the handler *yields* to the event loop. A handler
doing `await`ed disk I/O yields; a handler doing synchronous `fs.writeFileSync` in a
tight loop does not, and then the lease silently lapses — see §4, mode E.

---

## 3. Throw / reject — the load-bearing answer

### The path a rejection takes

1. **`subscription.ts:103-105`** — `Promise.allSettled` collects; `firstRejection`
   finds the first rejected result; `dispatch` throws
   `new SubscriptionHandlerError(rejected.reason)`. The original reason is preserved
   by identity on `.cause` (`subscription.ts:42-50`).
2. **`session.ts:589-597`** — the enqueued unit rethrows it unwrapped
   (`error instanceof SubscriptionHandlerError ? error : new SessionProcessingError(error)`),
   so `await enqueue(...)` rejects and breaks out of the socket-drain `while` loop.
   The rejection is *also* signalled onto `pipelineFailure` via `enqueue`'s
   `void task.catch(signalPipelineFailure)` (`session.ts:428`), which the
   `Promise.race` at `session.ts:583-587` observes — belt and braces, same outcome.
3. **`session.ts:604-617`** — `runOnce` tears the socket down (`conn?.end()`),
   classifies via `failureFrom`/`preferredFailure` (`session.ts:325-342`) — a
   `SubscriptionHandlerError` becomes `kind: "subscriber"` — and throws a
   `SessionFailure`.
4. **`session.ts:641-654`** — `supervise`'s catch:

```ts
if (reason instanceof SubscriptionHandlerError || reason instanceof SessionProcessingError)
  return failTerminal(failure);
```

   **This is the load-bearing line: `session.ts:645-646`.** A subscriber failure does
   **not** take the retryable-close branch at `session.ts:650-653`. It goes to
   `failTerminal` (`session.ts:620-635`), which sets `stopped = true`, applies
   `{ t: "stop" }`, and throws. **No reconnect. No retry. The supervisor loop is over.**
5. **`session.ts:685-696`** — the failure surfaces as the rejection of `start()`,
   unwrapped to the original cause (`session.ts:688-690`), and again from `stop()`
   (`session.ts:802-810`).

### Is it swallowed? Logged?

- **Not swallowed.** It is the *highest-precedence* failure the session can report
  (ADR-0021 precedence list; `session.ts:334-342`).
- **Not logged by the library on this path.** `logger.error({ err: reason }, "session run errored")`
  at `session.ts:648` sits *after* the `failTerminal` early-return at line 646, so a
  subscriber failure never reaches it. The only observable is the rejected
  `start()`/`stop()` promise (and, under the runtime, the `closed` frame — §6).
- **It kills the session.** Terminally, with `stopped = true`.

### Is the batch retried or dropped?

**Dropped. There is no retry, anywhere.** Confirmed three ways:

- **No retry code exists.** The only recovery loop is `supervise`'s reconnect
  (`session.ts:641-668`), and a subscriber failure is routed around it at line 645-646.
  Nothing re-reads, re-delivers or persists an undelivered batch: `EventQueue`
  (`baileys/socket.ts:337-372`) is consume-once with no replay, and `subscribe`
  (`subscription.ts:62-74`) has no backlog to hand a new subscriber.
- **ADR-0025** (`docs/adr/0025-pre-acceptance-replay-remains-an-explicit-unknown.md:6-16`)
  states the position outright:

  > whatsappd's durability guarantee begins at the Backend acceptance transaction. …
  > The product therefore makes no lossless-delivery, at-least-once, exactly-once, or
  > automatic-recovery claim for a pre-acceptance process death. In-process acceptance
  > failures still fail closed, publish no Client update, and stop the Runtime.

- **Two tests assert the drop.**

  `tests/session.test.ts:146-191` — *"a rejected subscription handler fails the session
  pipeline"*. A **synchronously throwing** `message` handler (lines 180-182); the
  *next* event on the iterator is a `receipt` update, and:

  ```ts
  await assert.rejects(session.start(), failure);
  expect(updateDelivered).toBe(false);   // line 189 — the next event never arrived
  expect(ended).toBe(true);              // line 190 — the socket was torn down
  ```

  `tests/runtime.test.ts:1127-1180` — *"a backend failure publishes nothing and stops
  processing with the original failure"*. The store fails **once** and then works. The
  test's own comment (lines 1160-1161) is the finding:

  > Not logged and skipped: the runtime is down, and the next event never reaches the
  > store even though the store would now accept it.

  and it asserts `messageAccepts === 1` (line 1164), an empty mirror (line 1173), and a
  `closed` frame carrying the original outage (lines 1176-1178).

### And the full-history request cannot be re-asked

**READ** — `session.ts:135-147` (`syncFullHistory` doc) and
`docs/architecture/history-semantics.md:21-24`:

> The request for a full history sync can be made **once, at Pairing, and never
> again**. It rides in `companion.requireFullSync` on the registration node …
> and Baileys sends that node only while `creds.me` is absent …

**INFERRED, high confidence.** So a handler that throws on batch 3 of 7 does not
merely lose batch 3 — it ends the session, and reconnecting with the same credential
will **not** re-request the full sync. Recovering the remaining ~4 batches would
require re-pairing (new credential), or falling back to the per-chat
`requestHistory()` path, which ADR-0010 / `history-semantics.md:97-110` explicitly
describe as fire-and-hope with no completion, exhaustion or delivered-count signal.

**Verdict (3).** A throw or rejection mid-batch is not swallowed, is not logged on
that path, kills the session terminally with no reconnect, and **the batch is dropped
and never retried**. Because the full-sync request is a once-per-credential pairing
artefact, the remaining batches are lost with it.

---

## 4. Loss modes — every way a `conversationSync` batch fails to reach a subscriber

Ordered from the socket inward.

### A. Baileys drops it before whatsappd sees it

**READ** — `node_modules/baileys/lib/Socket/socket.js:499-507`: on close Baileys emits
`connection.update {connection:'close'}`, then `ev.removeAllListeners('connection.update')`
and **`ev.destroy()`**. Anything sitting in Baileys' own consolidating buffer
(`Utils/event-buffer.js:25-97`, `BUFFER_TIMEOUT_MS = 30000` at line 34) that has not
been flushed is gone. Not observable from whatsappd.

### B. The mapping layer throws inside the Baileys listener

**READ** — `baileys/socket.ts:571-577`:

```ts
sock.ev.on("messaging-history.set", (payload) => {
  logger.info(historySetTelemetry(payload), "messaging history set");
  rememberRecent(recent, payload.messages);
  for (const event of toMessagingHistoryEvents(payload, selfAddress(sock), makeDownload)) {
    queue.push(event);
  }
});
```

`selfAddress` **throws** when the socket has no registered identity
(`baileys/socket.ts:179-183`: `throw new TypeError("no account identity: cannot name the author of a message")`).

**INFERRED.** This listener is registered on a Node `EventEmitter`
(`event-buffer.js:1,26,36-40`). A throw from a synchronous `EventEmitter` listener
propagates out of `ev.emit(...)` into Baileys' `await execTask()`
(`Socket/messages-recv.js:1571-1578`), where `exec` is wrapped in
`.catch(err => onUnexpectedError(err, identifier))` — i.e. **Baileys logs it and
continues**. The batch never reaches `queue.push`, whatsappd's pipeline never learns
of it, and **nothing fails**. This is the one silent-loss mode where the session stays
apparently healthy. It is a narrow window (identity is normally present well before
history arrives — see the `selfAddress` docblock at `baileys/socket.ts:160-178`), but
it is not structurally impossible.

Also in this layer: `toMessagingHistoryEvents` (`baileys/socket.ts:215-246`)
**deliberately suppresses** an empty payload unless it answers a request
(lines 226-243). For a `full`-typed batch that normalised to zero rows, no
`conversation_sync` event is emitted. That is by design; it is loss only in the sense
that the *arrival* is not observable.

### C. A batch arrives after the queue is closed

**READ** — `baileys/socket.ts:342-343`:

```ts
push(ev: RawEvent): void {
  if (this.done) return;      // ← silent drop
```

and `baileys/socket.ts:598-602`, which closes the queue on `connection.update` close:

```ts
if (u.connection === "close") {
  const fault = classifyDisconnect(u.lastDisconnect?.error, intentional);
  queue.push({ t: "close", fault });
  queue.close();
}
```

**Mitigation that already exists (READ):** the iterator drains the buffer *before*
honouring `done` (`baileys/socket.ts:362-365`), so events already buffered when
`close()` runs are still delivered. Only pushes that arrive *after* the close event
are dropped.

### D. No subscriber is registered when the batch is dispatched

**READ** — `subscription.ts:76`: `[...subscriptions].map(...)` over an empty `Set`
yields `[]`; `Promise.allSettled([])` resolves; `firstRejection` finds nothing.
**A batch dispatched with zero subscribers is consumed silently and successfully.**
There is no buffering and no replay for a late subscriber (`subscription.ts:62-74`).

Two concrete instances:

- **Subscribed too late (raw `createSession`).** The caller must call `subscribe()`
  before `start()`. Note `start()` "resolves only once the session has ended"
  (`runtime/runtime.ts:762-765`), so `await session.start(); session.subscribe(...)`
  never subscribes at all.
- **Unsubscribed too early (the runtime).** `runtime.ts:589-623`, `release()`:
  `off?.()` at **line 602** runs the unsubscribe **before** `open?.stop?.()` at
  **line 623**. **INFERRED, high confidence:** any batch still sitting in the
  `EventQueue` buffer when `release()` starts is dispatched to an empty subscription
  set and vanishes. `release()` is reached from `runtime.stop()` (line 654), from a
  lost lease (`renewOnce`, lines 696-708), and from the session dying on its own
  (`ended` → `halt`, lines 769-772).

### E. The handler rejects — §3

Batch dropped, session terminal, no retry. Under `createWhatsAppRuntime` the realistic
triggers are:

- **Data-store failure** — `runtime.ts:473-479`; test `runtime.test.ts:1127-1180`.
- **Media capture failure** — `runtime.ts:514-521` awaits `captureMessage` per message
  before accepting anything, so one unreadable media byte-stream in a 4,800-message
  batch rejects the whole batch. (ADR-0015: media bytes captured immediately and
  durably.)
- **Lease expiry** — `runtime.ts:470-472`:

  ```ts
  if (claim.expiresAt <= Date.now())
    throw new AccountNotHeldError(accountId, "expired", `the claim lapsed at ${claim.expiresAt}`);
  ```

  with `leaseTtlMs` defaulting to `30_000` (`runtime.ts:378`) and the renewal heartbeat
  at TTL/2 (`runtime.ts:750`). Asserted by test `runtime.test.ts:2004-2027`, whose own
  comment (lines 2010-2011) names the scenario: *"as it would be for a worker whose
  loop stalled past the TTL"*. **INFERRED:** a `conversationSync` handler that blocks
  the event loop synchronously for >15 s starves the heartbeat, the lease lapses, and
  the very next `accept()` rejects — turning a slow handler into a dead session.

### F. A batch arriving during `stop()`

**READ** — three sub-cases.

- **Raw `session.stop()`** (`session.ts:779-811`): sets `stopped = true`,
  `conn?.end()`, then **awaits the supervisor** (line 787-789). The drain loop keeps
  pumping the buffer until the iterator reports `done`, so buffered batches *are*
  delivered — provided the caller awaits `stop()`. **INFERRED, high confidence** from
  `session.ts:581-599` plus the buffer-before-`done` ordering at `socket.ts:362-365`.
- **`stop()` racing socket creation** (`session.ts:576-579`): if `stop()` landed while
  `openSocket()` was in flight, the freshly opened socket is `end()`ed and `runOnce`
  returns without entering the drain loop. Startup-only window.
- **`runtime.stop()`**: loses buffered batches — mode D above.

**Verdict (4).** Six modes: (A) Baileys-side drop on close, (B) a throw in the mapping
layer — the only silent one that leaves the session healthy, (C) push after
`queue.close()`, (D) zero subscribers (subscribed too late, or unsubscribed too early
by `runtime.release()`), (E) handler rejection — the dominant mode, (F) `stop()` races.
Notably **not** a loss mode: "session not yet `online`" — `conversation_sync` dispatch
has no phase gate (`session.ts:515-516`), and the test at `session.test.ts:825-867`
confirms a returning session reaches `online` with zero sync batches rather than
gating on them.

---

## 5. Slow-consumer effects — 30 s per batch

### What the code shows

**READ** — `baileys/socket.ts:336-372`, the whole queue:

```ts
class EventQueue {
  private readonly buffer: RawEvent[] = [];
  ...
  push(ev: RawEvent): void {
    if (this.done) return;
    if (this.resolve) { this.resolve({ value: ev, done: false }); this.resolve = undefined; }
    else { this.buffer.push(ev); }
  }
```

**There is no capacity bound, no high-water mark, no drop policy and no push-back
signal.** `push` is synchronous and always succeeds while open.

**READ** — the producers are plain synchronous `EventEmitter` listeners
(`baileys/socket.ts:517-603`), and Baileys' emitter is Node's
(`node_modules/baileys/lib/Utils/event-buffer.js:1,26,36-40,134`), whose `emit`
ignores listener return values.

**INFERRED, high confidence.** Therefore the backpressure chain **stops at
`eventPipeline` and does not reach the transport**:

- The slow handler stalls `enqueue`, which stalls the drain loop, which stops calling
  `events.next()`.
- But `EventQueue.push` never blocks, so Baileys keeps emitting.
- Baileys' `processNodeWithBuffer` (`messages-recv.js:1571-1578`) does
  `ev.buffer(); await execTask(); ev.flush();` — `execTask` completes as soon as
  whatsappd's synchronous listener returns, which is immediately.
- The websocket therefore keeps reading and keeps acking
  (`sendMessageAck`, `messages-recv.js:361`, called inside `exec`).

**Consequence at the stated scale (INFERRED):** 7 batches × ~4,800 messages, 30 s of
handler time each. Batches 2..7 accumulate in `buffer` as fully-normalised
`ConversationSyncBatch` objects — every `InboundMessage` for ~43,000 messages resident
in memory at once, plus the LRU of raw `WAMessage` envelopes capped at 500
(`RECENT_CAP`, `baileys/socket.ts:49`). Under the runtime, `captureMessage` also holds
media byte-streams per message during the awaited loop at `runtime.ts:516-517`. The
failure mode of a slow consumer here is **memory pressure and a delayed `online`, not
a stalled or timed-out transport**. Total wall-clock delay to `online` is at least
7 × 30 s = 3.5 min, during which `phase` stays `authenticated`.

### What the code cannot tell you — mark this clearly

**Not answerable from `whatsappd` source:**

1. **Whether WhatsApp's servers abandon delivery of the remaining `full` batches if
   the client is slow to drain.** whatsappd never applies transport backpressure, so
   from WhatsApp's point of view the client is *fast* regardless of handler speed —
   which suggests the question may not arise. But nothing in this repo observes the
   server side. What would answer it: a live full-sync run against a real account with
   an artificially slowed `conversationSync` handler, counting `chunkOrder` /
   `progress` values on `messaging-history.set` (`baileys/socket.ts:258-274` already
   logs exactly that telemetry at `info`) against an unslowed control run.
2. **Whether Baileys' own 30 s buffer auto-flush (`event-buffer.js:34,49-54`) or its
   20 s `awaitingSyncTimeout` (`Socket/chats.js:1095-1110`) interact badly with a
   blocked event loop.** These are timers; a handler that yields lets them fire, a
   handler that blocks does not. Effects are unmeasured here.
3. **Whether history-sync notifications are re-delivered if never acked.** Not
   exercised by any code or test in this repo.

**Verdict (5).** Unbounded in-memory buffering; no backpressure to Baileys, none from
Baileys to WhatsApp, no socket timeout triggered by a slow handler. A 30 s/batch
handler costs memory and delays `online` by minutes. Whether WhatsApp abandons the
remaining `full` batches is **unanswered by this source** and needs a live measurement.

---

## 6. The runtime path vs the raw session path

| | `createWhatsAppRuntime` | raw `createSession` |
|---|---|---|
| When it subscribes | `runtime.ts:761`, **before** `opened.start?.()` at line 766 — cannot miss a batch by subscribing late | Caller's responsibility. `await start()` first = never receives anything (`start()` resolves only when the session ends) |
| Awaited-handler semantics | Identical — it *is* a subscriber (`runtime.ts:506-574`) | Identical |
| On handler rejection | Session dies → `supervisor` rejects → `ended()` → `halt()` (`runtime.ts:769-772`); a `closed` frame carrying the original error is published to watchers (`runtime.ts:659-664`) | `start()`/`stop()` reject. Nothing else observes it |
| Durability | Writes commit **before** publishing to clients (`runtime.ts:473-479`); a failed accept publishes nothing (test `runtime.test.ts:1127-1180`) | None. Whatever the caller does |
| Extra failure modes it adds | Lease expiry rejects the batch (`runtime.ts:470-472`); `release()` unsubscribes before draining (`runtime.ts:602` vs `623`) | — |
| Extra risk it removes | Late-subscribe; silent success on a failed write; unobserved session death | — |

**Verdict (6).** The *delivery guarantee to the handler* is the same object in both
cases — one `createSubscriptionDispatcher` (`session.ts:406-408`), the same
`Promise.allSettled` + throw. What differs is everything around it. **The runtime is
the safer of the two** because it subscribes before the socket opens, commits durably
before publishing, and surfaces a dead session as a `closed` frame instead of an
unobserved rejected promise.

**But "safe for a one-shot sync" is the wrong frame for either.** Neither path retries
a batch, and the full-history request cannot be re-asked on the same credential
(`history-semantics.md:21-24`). So a one-shot sync is safe only if the handler is
built so that **rejection is impossible in practice** — which, given the runtime's own
handler rejects on data-store failure, media-capture failure and lease expiry
(`runtime.ts:470-472, 473-479, 514-521`), is a property of the *backend* you hand the
runtime, not of the runtime.

**INFERRED recommendation for INGEST.** If a batch must not be lost:

1. Use the runtime (subscribes early, writes durably), **not** raw `createSession`.
2. Raise `leaseTtlMs` well above worst-case per-batch handler time, or ensure the
   handler always yields so the heartbeat can run.
3. Make the durable write for a batch idempotent and *unconditionally succeeding* — a
   single rejection ends the sync permanently.
4. Do **not** call `runtime.stop()` until `conversation_sync_complete` has moved the
   session to `online`; stopping mid-sync drops whatever is buffered (`runtime.ts:602`).
5. Treat "a batch was lost" as unrecoverable-without-repairing and design the
   observability to notice it: `baileys/socket.ts:258-274` already logs
   `chunkOrder` / `progress` / `isLatest` per `messaging-history.set` at `info`, and
   `context.chunkOrder` / `context.progress` reach the handler on every batch
   (`baileys/history.ts:128-141`). Counting them is the cheapest gap detector available.

---

## What this does not establish

- **Server-side behaviour.** Nothing here observes what WhatsApp does when a client
  drains slowly. §5 marks this explicitly. `docs/architecture/history-semantics.md`
  documents live measurements for `requestHistory` (the on-demand path), **not** for a
  slow consumer of the pairing full sync.
- **The ~43,000 / ~7 × ~4,800 shape itself.** No measurement in this repo corroborates
  it. The only initial-sync figures in `history-semantics.md:10-19` are ~7,665 messages,
  labelled indicative, from issue #9 — and `history-semantics.md:43-44` states plainly
  that *"Every history depth recorded in this document was measured with the request
  off."* There is therefore **no recorded measurement of a full-history sync's batch
  count or size** in these sources. The batch shape in the question is unverified here.
- **Real per-batch handler cost.** No benchmark exists for `captureMessage` over
  thousands of messages; §5's memory reasoning is structural, not measured.
- **Whether mode B (mapping-layer throw) is reachable in practice.** The `selfAddress`
  docblock (`baileys/socket.ts:160-178`) argues identity always exists before messages
  arrive. No test exercises the throw from inside the `messaging-history.set` listener.
- **Baileys' `historyCache` dedup** (`event-buffer.js:27,33,76-79`,
  `MAX_HISTORY_CACHE_SIZE = 10000`) was read but not traced through
  `consolidateEvents`. Whether a 43,000-message sync can evict entries and change what
  is emitted is **unverified**.
- **`packages/whatsappd/tests` has no test that drives a `conversationSync` handler
  slowly or makes one throw.** The two `conversationSync` occurrences in the test suite
  are `session.test.ts:262` (a comment) and `session.test.ts:858` (a counter asserted
  to be 0). Every handler-failure and handler-slowness assertion cited in §2 and §3
  uses `message` or `connection` handlers. Because the dispatcher switches on event
  type inside one shared code path (`subscription.ts:78-100`) the behaviour is the
  same by construction — but **it is inferred for `conversationSync`, not directly
  tested.** A test that suspends and then rejects a `conversationSync` handler mid-batch
  would close this gap and is the single cheapest thing that would.
