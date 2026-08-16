# ADR 002 — the `work` interface

> ## ⚠ PROVISIONAL
>
> **We are designing this before we have felt the loops.** Nothing here has been operated.
> [seams.md](../design/seams.md) justifies designing it early on the strength of the prior
> evidence — the old repo failed at this seam four separate times — but the honest status of
> this document is *a well-argued guess*.
>
> **Section [What would falsify this](#what-would-falsify-this) is the most important part
> of this ADR.** Read it before implementing, and re-read it after LOOPS ships. Revise this
> document rather than working around it.

**Status:** Provisional · **Date:** 2026-08-16 · **Area:** LOOPS (designed during SKELETON)

Produced by a `DESIGN-IT-TWICE` round (three parallel designs).

---

## Context

`work` owns durable work: triggers, due times, leases, claims, retry, jobs. It **decides
when and what runs**. It is the one layer where Effect is agreed
([AGENTS.md](../../AGENTS.md), *Where Effect goes*).

**The seam that must not close.** [seams.md](../design/seams.md): *"`harness` runs a session;
`work` decides that a session should run. Two seams, not one. Conflating them is what
produced four drifted copies last time."*

**The failure to beat, measured** (grill 001, finding 4):

```
src/database/conversation-work.ts   631  debounce + maximumWait + activeRunId + fenced complete
src/database/memory-work.ts         456  quietMs + window + attempts + parking
src/database/tasks.ts               386  lease on the row + attempts
src/database/evaluation-work.ts     249  pending table + cooldown
                                   1722
```

> Four schedule tables, four claim/lease/renew/complete/fail/recover implementations, **plus
> four `drain`/`scheduleDrain`/`start`/`stop` skeletons on top.** Same shape, drifted
> semantics — **memory never recovers an abandoned run; conversation does.**
>
> **Leasing and queuing are irreducible. Four copies are not.**

That last drift is the specific bug this interface must make *unrepresentable*, not merely
discouraged.

---

## What the three designs agreed on

Three independent designs, three different assigned constraints, converging. Recording the
convergence separately from the decision, because it is stronger evidence than any one
design's argument.

**1. `claim · complete · fail · nextDue` does not belong on the interface.** All three
deleted it. The reasoning, sharpest in design A: grill 001's sentence continues *"plus four
drain/scheduleDrain/start/stop skeletons on top"* — and a claim-handing interface makes
every caller write that skeleton. You get one drain loop per kind, which is exactly where
"memory never recovers, conversation does" actually lived. **The lease was never the
drifting part. The drain loop was.** So `work` does not hand out work; it owns the loop.

**2. Recovery is a predicate, not an operation.** All three:

```sql
AND (lease_until IS NULL OR lease_until <= :now)   -- ← this clause IS recovery
```

There is no `recoverAbandoned()` to omit from one loop and include in another. An expired
lease is indistinguishable from a fresh unit. A loop does not own a claim statement — it
owns a `kind` string that is bound into the shared one.

**3. Grill 002 Q1's key must generalise.** All three, independently. See below.

**4. Debounce belongs in SQL, not in `Stream`.** Including the design whose assigned
constraint was named after `Stream`, which reported: *"In-memory debounce sits in front of
the durable write, so a crash inside the quiet window loses the trigger entirely."*
Coalescing is two clamps — `MIN(MAX(...))` — and it is durable.

**5. Dedup is the primary key.** "Same blob in three chats = one unit" costs zero lines.

**6. `Clock` / `TestClock` is the single largest concrete win from Effect** — larger than
`Stream`, larger than `Layer`. It makes the burst property, the maximum wait, lease expiry
and the weekly cadence into six-line tests with no sleeping and no flake. Design A's
observation is the one worth keeping: **the old repo shipped four drifted implementations
partly because nobody could afford to write these tests.**

---

## Decision

The winning shape: **you do not call `work`, you build it.** The composition root assembles
loop declarations into a runtime that owns its own fibers.

### The outward interface is plain TypeScript

`channel`, `speaker`, `cli` and `capabilities` are not Effect modules and must never become
them. They see three functions and one two-field object — no `Effect`, no `Stream`, no
`Layer`, no `Schedule`, in neither type nor value position.

```ts
export type WorkKey = { readonly kind: string; readonly key: string }

export interface Work {
  /**
   * Record that `key` has undone work.
   * Idempotent — N notifies before it runs cause one run.
   * Resolves when the intent is DURABLE, not when the work runs.
   */
  readonly notify: (key: WorkKey) => Promise<void>

  /** Claim and run everything currently due, then resolve. For `cli` and for tests. */
  readonly drain: () => Promise<void>

  /** Keys that exhausted their retries. For `ambient doctor`. */
  readonly parked: () => Promise<ReadonlyArray<WorkKey & { attempts: number }>>
}
```

`channel`'s entire call site:

```ts
await transcript.append(entry)                        // persist FIRST
await work.notify({ kind: "chat", key: entry.chat })  // then notify
```

**Four verbs of protocol a caller had to sequence correctly become one verb of intent.**
A caller cannot sequence the protocol wrong, because there is no protocol to sequence.

### A loop is a record

```ts
export interface Loop {
  readonly kind: string

  /** How notifies for one key coalesce. Absent → due immediately. */
  readonly coalesce?: { readonly quiet: Duration.DurationInput
                        readonly maxWait: Duration.DurationInput }

  /** Self-triggering cadence. Each tick calls `keys()` and notifies each result. */
  readonly cadence?: { readonly every: Schedule.Schedule<unknown>
                       readonly keys: () => Promise<ReadonlyArray<string>> }

  readonly lease: Duration.DurationInput
  readonly retry: { readonly attempts: number
                    readonly backoff: Schedule.Schedule<Duration.Duration> }
  readonly concurrency?: number

  /**
   * PURE. Turns a claim into the description of a session.
   * `work` never runs it — it hands the result to the injected harness.
   *
   * THIS IS THE SEAM THAT MUST NOT CLOSE, MADE STRUCTURAL:
   * `work` cannot construct a session because `spec` cannot reach a harness,
   * and `work`'s implementation cannot construct a spec because only the Loop knows how.
   */
  readonly spec: (claim: Claim) => RunSpec

  /** PURE. New opaque watermark, committed in the same transaction as completion. */
  readonly advance?: (claim: Claim, receipt: Receipt) => string | undefined

  /** PURE. Other keys this receipt wakes. Same transaction as completion. */
  readonly wakes?: (claim: Claim, receipt: Receipt) => ReadonlyArray<WorkKey>
}

export interface Claim {
  readonly kind: string
  readonly key: string
  readonly attempt: number
  readonly watermark: string | undefined   // opaque to `work`
}
```

Named constants so a declaration never types the word `Effect`:

```ts
export const Cadence: { dailyAt, weeklyOn, every }
export const Backoff: { standard, patient, immediate }
```

Construction — the runtime *is* the interface:

```ts
export declare const layer: (loops: ReadonlyArray<Loop>)
  => Layer.Layer<Work, LoopMisconfigured, Store | Harness>
```

```ts
// src/composition-root.ts — the ONLY file outside src/modules/work/ that imports Effect
const runtime = ManagedRuntime.make(
  Work.layer([chat, ingest, media, digest, synthesis, consolidate, job]).pipe(
    Layer.provide(Layer.mergeAll(SqliteStore(home.db.path), PiHarness(pi)))))

const work: Work = await runtime.runPromise(Work)   // plain-TS handle from here on
channel.onMessage((m) => work.notify({ kind: "chat", key: m.chat }))

process.on("SIGTERM", () => runtime.dispose())      // ← the entire shutdown path
```

`runtime.dispose()` closes every `Scope`: every in-flight run's release fires, every lease
is returned, every fiber is interrupted. **The old repo wrote four `start`/`stop` skeletons.
This has zero lines of shutdown code.**

### The store — one table, eight columns

```sql
CREATE TABLE work (
  kind        TEXT    NOT NULL,   -- Loop.kind
  key         TEXT    NOT NULL,   -- chat slug | blob hash | 'global' | job id
  due_at      INTEGER,            -- ms epoch. NULL = nothing pending.
  deadline    INTEGER,            -- the maximum-wait ceiling for THIS burst
  lease_until INTEGER,
  lease_owner TEXT,               -- the fencing token; one uuid per claim
  attempt     INTEGER NOT NULL DEFAULT 0,
  watermark   TEXT,               -- opaque to work; written atomically with complete
  PRIMARY KEY (kind, key)
) WITHOUT ROWID;

CREATE INDEX work_due ON work (kind, due_at) WHERE due_at IS NOT NULL;
```

Two deliberate absences. **No payload column** — a job's objective is a file in its job
directory, written before `notify`; `work` schedules, it does not carry cargo. **No `parked`
column** — parked is derived as `attempt >= retry.attempts`, and *a state that is derived
cannot drift between loops*, which is precisely what happened to `attempts` across
`memory-work.ts`, `tasks.ts` and `evaluation-work.ts`.

**Four statements, and that is the whole scheduler.**

```sql
-- notify: debounce with a maximum wait, in one statement.
--   MAX(due_at, now+quiet) pushes the run out on each arrival        → the debounce
--   MIN(…, deadline)       refuses to push past the FIRST arrival's ceiling → the max wait
INSERT INTO work (kind, key, due_at, deadline, attempt)
VALUES (:kind, :key, :now + :quiet, :now + :maxWait, 0)
ON CONFLICT (kind, key) DO UPDATE SET
  due_at   = MIN( MAX(COALESCE(work.due_at, 0), :now + :quiet),
                  COALESCE(work.deadline, :now + :maxWait) ),
  deadline = COALESCE(work.deadline, :now + :maxWait),
  attempt  = 0;

-- claim: recovery is the fourth predicate. There is no `recover` operation.
UPDATE work SET lease_owner = :token, lease_until = :now + :lease,
                due_at = NULL, deadline = NULL
 WHERE (kind, key) IN (
   SELECT kind, key FROM work
    WHERE kind = :kind AND due_at <= :now AND attempt < :maxAttempts
      AND (lease_until IS NULL OR lease_until <= :now)
    ORDER BY due_at LIMIT :batch)
RETURNING kind, key, attempt, watermark;

-- complete: fenced, and the self-edge lands in the same transaction
BEGIN IMMEDIATE;
  UPDATE work SET lease_owner = NULL, lease_until = NULL, attempt = 0,
                  watermark = COALESCE(:watermark, watermark)
   WHERE kind = :kind AND key = :key AND lease_owner = :token;
  -- changes() = 0 → LeaseLost. Abort; a newer claim owns this key.
  -- then, for each key in Loop.wakes(claim, receipt): the notify statement above
COMMIT;

-- fail
UPDATE work SET lease_owner = NULL, lease_until = NULL, attempt = attempt + 1,
                due_at   = MAX(COALESCE(due_at, 0), :now + :backoff),
                deadline = MAX(COALESCE(due_at, 0), :now + :backoff)
 WHERE kind = :kind AND key = :key AND lease_owner = :token;
```

`complete` deliberately **does not touch `due_at`.** It was set to `NULL` at claim time, so
it is non-`NULL` here if and only if a notify arrived *during* the run. Leaving it alone is
the entire re-trigger behaviour — no flag, no `CASE`, no second code path.

**The rule that makes the whole test strategy work, and it is load-bearing:**

> **`work`'s SQL never reads a clock.** No `unixepoch()`, no `CURRENT_TIMESTAMP`, ever. Every
> `:now` is bound from Effect's `Clock`.

Break it and `TestClock` silently stops controlling the store while still controlling the
fibers, and every timing test dies without a failing test to tell you. Enforced by a grep in
`doctor` — AGENTS.md: *"if `doctor` cannot check it, it is not a convention."*

### Amendment to grill 002 Q1 — flagged explicitly

[README.md](../../README.md) records that grill 002's four decisions stand. **This ADR
amends Q1**, and all three designs proposed the same amendment independently.

Q1 decided `chats(chat_id PK, cursor, due_at, lease_until, lease_owner)` on the rationale
*"SQLite does exactly one job — mutual exclusion and a watermark. A bigger schema is how you
get back to 31 tables."*

> **Q1-A.** The principle stands verbatim and is not being touched. The literal five columns
> do not. The primary key becomes a **work key** `(kind, key)`; the table is named `work`,
> not `chats`; `cursor` becomes `watermark` — nullable and opaque. Three columns are added:
> `deadline`, `attempt`, `lease_owner` as a fencing token. **Eight columns, one table.**

Why: Q1's row was derived from one kind of work, and product.md's workload has four key
shapes — chat slug, content hash, `"global"`, job id. **Three of the seven loops cannot be
expressed at all under a `chat_id` primary key.** The alternative to widening the key is a
second table per kind, which is *literally the 1722-line failure*. The amendment is what
keeps there being one table.

Why `watermark` stays in `work` rather than moving to `channel`: **"the run succeeded" and
"the cursor advanced" must be one commit.** Split across two stores, a crash between them
either re-processes forever or skips a message. That is Q1's own reasoning, and it survives.

**Tripwire, agreed in advance: a ninth column, or a second table, means this design is
wrong** — not that it needs patching.

### Behaviours decided, with the reasoning that decided them

**Interruption: queue, not restart.** A message arriving mid-session lets the session finish
and then re-runs, re-debounced. `restart` is *not* built, and `harness.run(spec)` is
therefore **not** taxed with an `AbortSignal`.

The argument, from design A, is the sharpest reasoning in the set: cancel-on-arrival is a
**livelock in exactly the common case**. A person typing five short messages would cancel
five sessions and complete none. And the session may already have sent — `work` cannot know,
because that is behind `harness` and the seam must not close.

Two of the three designs offered `restart` and both listed "nobody used `restart`" as a
falsifier. Ship the one that is right; add the other when something measured demands it.

**Lease renewal is kept; a hard run timeout is not.** One design deleted renewal by
requiring `runTimeout < lease`. Elegant, and rejected: it makes recovery latency equal to
the longest a job may take. A crashed *reply* would then sit for ten minutes with a human
waiting. Instead:

> **`lease` is how long after a crash before the work is retried. It is *not* how long the
> work may take.** The renewer refreshes at `lease / 3` while `perform` runs, so a 40-minute
> job is fine under a 60-second lease.

Setting `lease` to "the longest a job might take" is the classic misconfiguration and it is
called out here so it does not get made.

**Cadence: put the period in the key.** `Schedule` state is process-local, so a daemon
restarted near a boundary can double-fire the weekly synthesis. Rather than adding a
`last_fired` column (which would trip the eight-column tripwire), the cadence's key carries
the period — `synthesis/2026-W34`, `digest/<chat>/2026-08-17`. **The primary key makes the
cadence idempotent.** Free, and done from day one.

**"A quiet day should be cheap" is the caller's filter, not `work`'s.**
`digest.cadence.keys` is `() => channel.chatsActiveSince(yesterday())`. A quiet day returns
`[]` and costs one function call and zero rows. This is why `keys` is a function rather than
a static list — and why it returns a `Promise`, so the composition root stays plain
TypeScript.

### Delivery guarantee

> **At-least-once run. At-most-one concurrent run per key. Never lost while the trigger's
> own store holds the input.**

Exactly-once is not available and never will be. The window: `harness.run` sends a WhatsApp
message, the process dies before `complete` commits, the lease expires, another worker
claims, the session runs again.

**What the caller owes.** The outbound idempotency key must be a function of
`(kind, key, watermark)` — the *input position*, not the run. `Claim.attempt` is
deliberately not part of it. `whatsappd` already owns outbound idempotency, so for the
speaker this costs nothing.

**The one rule a plain-TypeScript caller must learn: notify *after* your own durable write.**
`work` is a scheduler, not a log — it stores no payload. A crash between the append and the
notify loses the wake and nothing re-derives it.

The failure story is grill 002's, unchanged: **degraded, never corrupt.**

### Dependencies

| Dependency | Category | Verdict |
|---|---|---|
| **Store** (SQLite, `node:sqlite`) | 2 — local-substitutable | **No port.** `:memory:` is the *same engine*, not a stand-in. An in-memory fake would be a second implementation of the claim statement — *a second place for the recovery predicate to be forgotten*, which is literally the bug this module exists to prevent, reintroduced in the test suite. |
| **Clock** | 1 — in-process | **A real port that Effect ships**, with two real adapters we do not write: live and `TestClock`. Zero lines of clock abstraction, no `now()` threaded through any signature. |
| **Harness runner** | 3/4 | **A real port.** Two adapters justified without speculation: Pi in production, and the replay adapter `evals` already requires (`evals ─> harness (replay)`). Injected; `work` never constructs it. |

`work` takes an opened database handle — **it never sees a path; `home` owns paths.**

### Where Effect genuinely earns its place, and where it does not

AGENTS.md asks for this accounting honestly, and the design that was *assigned* the
Effect-native constraint delivered the most useful version of it — by reporting that two of
the three primitives its constraint was named after are the wrong tool here.

**Earns it:**

- **`Clock` / `TestClock`** — the largest win by a distance. Every timing property becomes a
  six-line deterministic test.
- **`Scope` / `acquireUseRelease`** — in-process crash, interruption and `SIGTERM` all
  release the lease through one path. Worth the dependency on its own.
- **`Layer` / `ManagedRuntime`** — `dispose()` is the complete shutdown implementation.
- **`Schedule`** — cadence and backoff as composable values rather than four cooldown
  implementations.
- **Typed error channels** — a missed case is a compile error rather than `catch (e) { log }`.

**Does not:**

- **`Stream.debounce` is not the coalescer and is not used.** In-memory debounce in front of
  the durable write loses a burst on crash. The 631 lines become nine lines of SQL — a bigger
  win, from the store, not from `Stream`.
- **`Stream.groupByKey` is the tempting-but-wrong primitive.** Per-key mutual exclusion is
  already the lease's job; `groupByKey` would be a *second* mutex, and it retains a substream
  fiber per distinct key for the process lifetime — unbounded for hash-keyed media.
- `Stream` earns roughly one thing: merging the wake queue with the poll tick into one
  source, and a concurrency cap without a hand-rolled semaphore. Real, but small.

---

## Why the other two lost

**A — minimise the interface (`signal · run · inspect`).** Owns the single sharpest finding
in the round: that the drain loop, not the lease, was the duplicated part. That finding is
adopted wholesale. It lost on two things. Its `perform` callback becomes a central switch
over every kind — its own report concedes *"`perform` becomes the largest function in the
system... the complexity does not vanish; it moves into the composition root's switch"* —
where the winner's per-loop `spec` keeps each loop's three lines next to its own
declaration. And its interface is typed in `Effect.Effect<...>`, which pushes Effect onto
`channel` and `speaker`, against AGENTS.md's own table. **Its interruption analysis and its
lease-renewal rule are both adopted** — they are the two places the winner was wrong.

**C — a loop is a declared policy, in `loops.yaml`.** Produces the best *artefact* of the
three: seven loops as a single grid where the 001 drift would have to be a visible column.
That legibility argument is real and the grid is worth keeping as documentation. It lost on
the config file. `loops.yaml` costs a schema, a parser, a validator, hot-reload semantics, a
migration path and a `reload()` verb on the interface — paid for thesis opinion 6
(users extend at runtime), which is **not exercised by this**: a loop's `causes` must map to
a session kind `harness` knows how to build, which is code, so a user-authored loop can only
recombine session kinds that already exist. C's own falsifier 9 says it: *"nobody edits
`loops.yaml` by hand in the first three months → collapse to TypeScript values and delete
all of it."* Start collapsed. **Its growth-rule discipline is adopted** (below), and its
`Transient` / `Permanent` split on harness failure is worth revisiting at HARNESS — a model
rate-limit deserves four attempts, a malformed mandate deserves none.

---

## The growth rule

Adopted from design C, because a declaration-plus-engine shape has one classic failure mode:
the declaration type grows a field per loop until it is four engines wearing one type. Three
defences, all checkable by `doctor`, none aspirational:

1. **No field of `Loop` may hold anything that can hold an engine.** `spec`, `advance` and
   `wakes` are pure and return data.
2. **A new field is legal only if at least two existing declarations would set it
   differently**, and the engine can implement it without branching on `kind`. One-user
   fields are the disease.
3. **`grep -c 'kind ===' src/modules/work/` must be 0.** The engine branching on a loop's
   identity means the declaration failed to describe the loop, and the next thing that
   happens is a second engine.

---

## What would falsify this

The most important section. Each is a concrete, checkable observation after LOOPS ships.

1. **A ninth column, or a second table.** If MEDIA needs a `priority`, or anything needs a
   stored `parked` state, the generalisation of Q1 failed and the honest answer is
   reconsidering this design — not patching the schema. *Observed at: the first migration.*
2. **A loop that is not a session.** `Loop.spec → RunSpec` assumes every unit is "hand a spec
   to `harness`". Whisper transcription is a plain API call, not an agent session. If MEDIA's
   annotate loop bypasses `harness`, `spec` is too narrow and the "work never constructs a
   session" guarantee weakens from structural to conventional. **Rated the most likely
   falsifier.** *Observed at: MEDIA.*
3. **`perform`-shaped logic appears outside `work`.** `grep -iE 'lease|due|attempt|backoff|
   retry|renew'` over the composition root. Any hit means the declaration was too narrow and
   a caller is re-implementing what `work` exists to own — which is exactly how four copies
   started.
4. **Starvation.** Measure p95 from `notify(chat/*)` to run start while a 20-minute job is in
   flight. **If it exceeds 5 seconds, the single-table claim is wrong.** The fix is a `lane`
   column or moving `job` out of the table — a redesign, not a tuning.
5. **A `work` test needs a real `sleep`.** Then something reads a wall clock, the
   no-clock-in-SQL rule is broken, and every timing test is a flake waiting to happen. The
   canary for the whole test strategy. *Observed at: any `setTimeout` in `src/modules/work/`.*
6. **`complete` grows a boolean.** The moment one loop wants "complete but stay due", four
   implementations reassemble inside one function. The original sin in disguise.
7. **Effect escapes containment.** An `import { Effect }` in `channel`, `speaker` or `cli`
   means the seam leaked and seams.md's Effect column is wrong. One grep; `doctor` checks it.
8. **Per-key policy is wanted.** *"This group is chatty — wait 60s there, 8s everywhere
   else."* Today the only answer is a second declaration plus routing in the caller, which
   relocates policy back out. Two designs independently rated this the most likely falsifier
   after MEDIA.
9. **Cross-loop ordering is required.** *"Consolidate only after every digest."* Reject it
   once; if asked twice, the declaration set is becoming a DAG and this is a workflow engine.
10. **Measured size.** The claim is 1722 lines → seven declarations plus one engine. If
    `src/modules/work/` exceeds ~700 non-test lines, or the engine alone exceeds ~400, the
    split did not buy what it promised.

**What would confirm it, for symmetry:** adding MEDIA's blob dedup and the Monday cadence
should require *zero* scheduling code — one record, one `spec`. If both land that way, the
collapse held.

---

## Note against seams.md

[seams.md](../design/seams.md) sketches `work`'s interface as `claim · complete · fail ·
nextDue`. **All three designs rejected all four verbs**, for the reason recorded above. That
document says of itself: *"One line per interface — this is a seam map, not an interface
design… Revisable. Expected to change on contact."* This is that revision, and seams.md's
line has been updated to point here. Its ownership and dependency-direction decisions are
untouched.
