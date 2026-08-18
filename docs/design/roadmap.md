# Roadmap

The anchor. When you are deep in one thing and need to know where you are, what is already
settled, or what breaks if you go backwards — this is the page.

**Hard cap: 200 lines.** The last attempt's ledger hit 2000 and nobody read it. When a
slice closes, delete its detail and leave two lines in the Ledger.
**Slices have names, not numbers.** Order changes; identity should not.

---

## You are here

> **INGEST closed** — 16/16 gate; `vp check`, 75 tests, shape clean and 0 duplication.
> `ambient pair · peers · ingest` exist. Proven on the real account: **85 conversations
> listed** with no socket, no lease and no runtime, and **911 Live lines ingested onto the
> 13,134 Archive lines** of `capxul-devs`, whose 2,900,784 bytes came through
> byte-for-byte identical. 71 attachments became 67 Blobs; 43 the Source no longer holds are
> declared rather than dropped. A second ingest wrote nothing and did not rewrite the file.
>
> **METHOD is still active, and INGEST was its first full run.** All six steps executed on
> one Slice for the first time. It produced product *and* four cohorts of deficits in
> [../planning/method/deficits.md](../planning/method/deficits.md) — the fourth found by
> running step 5, and the standing rule there is that deficits are **logged, not fixed**.
>
> **KNOWLEDGE is next.** It now has both halves of its material: an Archive's history and a
> Live account kept current. What it does not have is MEDIA — an unprocessed voice note is a
> hole, not a degraded entry — so KNOWLEDGE can start, but *trusting* it cannot.

---

## Status board

| Slice | State | What it is |
|---|---|---|
| **SKELETON** | ● closed | Home layout, `ambient` CLI, config + schema validation. The conventions, as code. |
| **IMPORT** | ● closed | An **archive** → transcripts + blobs. `archive`, `transcript`, `blobs`, one CLI verb. No credential. Raw only. |
| **METHOD** | ◐ active | How a slice is built, as skills rather than folklore. `map-slice`, `plan-slice`, `close-slice`, vendored dependencies. **Not product.** |
| **INGEST** | ● closed | A **live account** → transcripts + blobs. `channel` hides `whatsappd`; `ingest` owns the order of the writes. `pair · peers · ingest`. **No Cursor** — the Mirror is current state. Raw only. |
| **KNOWLEDGE** | ○ next | The OpenKnowledge project, templates, ontology validator/queue/indexer, hand-operated passes → skills. |
| **HARNESS** | ○ | Pi session construction: `cwd`, model policy, per-session MCP list, skills, typed receipts. |
| **LOOPS** | ○ | Triggers, cadences, the lease, the job runner. The one place Effect lands. |
| **CAPABILITIES** | ○ | Chat folders as runtime instances; the reflector MCP; background agents. |
| **MOUTH** | ○ | The speaker. |
| **MEDIA** | ○ off-path | STT, vision, extraction. Hash-keyed, cached. Any time after IMPORT. |
| **EVALS** | ○ off-path | Cases as directories, offline replay. Starts once HARNESS exists. |

`○` not started · `◐` active · `●` closed

## Dependencies — read before pivoting

```
SKELETON ──> IMPORT ──> KNOWLEDGE ──> HARNESS ──> LOOPS ──> CAPABILITIES ──> MOUTH
                 │  └──> INGEST ●        │
                 └──> MEDIA              └──> EVALS
```

- **IMPORT before INGEST was forced**, and it held: a full sync is one-shot per credential,
  so `transcript` had to exist before the next pairing. KNOWLEDGE needs material rather than
  currency, so one archive unblocks it and INGEST keeps it fresh.
- **SKELETON is under everything.** Changing the home layout after IMPORT means rewriting
  what is on disk. This is why it goes first and why its interfaces get designed twice.
- **KNOWLEDGE is not trustworthy without MEDIA.** An unprocessed voice note is a hole, not
  a degraded entry. MEDIA can land any time after IMPORT, but must precede *trusting* the
  knowledge base.
- **HARNESS automates what KNOWLEDGE proved by hand.** Building it earlier means guessing
  at passes that do not exist yet — the old repo's mistake.
- **Going backwards is cheap left of KNOWLEDGE and expensive right of it**: right of it
  there is content on disk shaped by the earlier decisions.

## Why this order

**Shape before content.** email-pa discovered its conventions *after* 92 pages existed and
its scaffolder arrived last, so they had to be retrofitted. Conventions are generated and
validated by code before anything writes into them.

**But shape needs real data.** IMPORT is foundational too — it stops at raw transcripts and
blobs, giving real material to shape against without committing to an invented model.

**Operate it by hand until it is good, then automate.** Claude Code plus a human *is* the
harness during KNOWLEDGE. Pi comes last, not first.

Rejected orderings — breadth-first, harness-before-knowledge — are recorded with
their rubrics in [../history/grills/003-roadmap-order.md](../history/grills/003-roadmap-order.md).

---

## Ledger

Append-only. Two lines per closed slice, or per pivot. Newest first.

- **2026-08-18** — **INGEST closed.** `channel` binds to `whatsappd`'s durable runtime
  ([ADR 005](../adr/005-channel-binds-to-the-durable-runtime.md)) and Ambient writes nothing
  inside the one-shot window; `ingest` owns the order of the writes. Real account: 85
  conversations listed with no socket or lease, 911 Live lines onto 13,134 Archive lines
  with all 2,900,784 of their bytes identical, 67 Blobs from 71 attachments, and a second
  run that wrote nothing.
  **Learned: the Mirror is current state, so there is no Cursor** — backfill-versus-live was
  an artefact of reading the wrong store. Two more, both by being wrong first: `libsqlBackend`
  **creates** the file it is pointed at, so an unpaired account read as an empty one until
  `Unpaired` existed; and `LiveReaction` had no producer because reactions are state, not
  events ([ADR 004 amendment 1](../adr/004-transcript-line-is-a-union-on-provenance.md#amendments),
  which that ADR's own falsifier 3 predicted).

- **2026-08-17** — **The method is a rule, not folklore.**
  [../rules/slices.md](../rules/slices.md): map → design → frontier → plan → build → close,
  one gate each, an open question carrying a kind. Nine upstream skills vendored — those
  something here names, closed under their dependencies — because `modules.md` requires
  `codebase-design`'s words *exactly*. `close-slice` gains **definition-of-done row 10**, the
  call graph, read not run.
  **Learned:** IMPORT passed rows 1–9 while its topology was wrong, so every existing row
  measured behaviour and none measured shape. And vendoring all 35 skills was copying instead
  of thinking — the set had to be *traced*, not swept in.
- **2026-08-17** — **IMPORT closed**, then corrected on the real home. All three Archive
  forms produce one Transcript, global deduplicated Blobs, a verbatim primary source and a
  hash-addressed Receipt; 16/16 gate. Reader v2 uses WhatsApp's structural mark and
  atomically replaces corrected Transcripts: 13,134 lines, 1,139 refs → 980 verified Blobs.
  **Learned:** counting by prose regex was wrong twice — 174 "events" were word occurrences,
  and the corrected 105 over-classified 73 Messages while missing 19. The source-marked
  answer is **13,083 Messages + 51 Events**, and the primary source is kept so a
  misclassification is re-readable without a re-export.
- **2026-08-17** — **INTAKE split into IMPORT and INGEST.** The halves share only an output
  type; the order is forced because a full sync is **one-shot per credential**, so the write
  path ships first. **ADR 003 gained two amendments.** Settled by measurement: zip names
  decode as UTF-8 (0 of 1,140 flagged), the dedup key is the **wall clock** (1 collision in
  13,134), and the Transcript line is a **union on provenance**.
- **2026-08-17** — **The lexicon exists.** [../../CONTEXT.md](../../CONTEXT.md), governed by
  [../rules/language.md](../rules/language.md): one meaning per noun, plus the words not to
  use. Written because *"backfill"* named two operations and produced four wrong answers in
  one session.
- **2026-08-16** — **Conventions made runnable.** `vp run shape` checks what AGENTS.md only
  claimed — file length, the six slots, `internal/` privacy, no `../..`, no `throw`, every
  cross-link. The contract split into one file per rule under [../rules/](../rules/), each
  naming its check or *"not currently checked"*. Duplication baseline **0 lines**.
- **2026-08-16** — **INTAKE scoped** against the principal's real iOS account. The mirror
  spans four years with no media refs; the accepted log spans ten days and carries them —
  so history import and continuous ingestion read different stores. **Corrects
  `thesis.md`'s cold start**: the graph is rich (1,560 contacts, 913 chats, 2,417 aliases)
  but conversation history is thin (2,739 messages, 90% from 2026). True of people, not of
  conversations. Six open questions block the spec; the highest-value one is whether
  `whatsappd` can pull deeper history.
- **2026-08-16** — **SKELETON closed.** `ambient init · doctor · chat add · agent add`;
  18/18 gate against real temp directories. Design-it-twice on both load-bearing seams —
  `home` → [ADR 001](../adr/001-home-interface.md), `work` → [ADR 002](../adr/002-work-interface.md),
  provisional. **OpenKnowledge is vendored, not called**: `ok init` writes a nested `.git`
  and six editor directories to deliver one file of defaults.
  **Learned:** six ADR 001 statements were wrong on contact and are in its Amendments, while
  the decision they support survived all six — which is the case for amendments over edits.
- **2026-08-16** — Design phase closed. Product model, knowledge flow, seam map and
  engineering contract agreed in one session; nine slices named and ordered. No code.

---

## Research queue

Answer before the slice that needs it — not before.

| Question | Blocks | Note |
|---|---|---|
| What did the MCP spec change? | CAPABILITIES | Statelessness; better with many agents on many servers. **Read the spec — do not design from memory.** |
| How does Pi take per-session MCP config? | HARNESS, CAPABILITIES | email-pa sets `enableMCP: false` after a stray server polluted a client's directory |
| Does OK `search` hold at thousands of docs? | MOUTH | Index-as-judgement is fine either way; ranking is the question |
| Do the 375 failed media downloads come back under pacing? | **trusting** KNOWLEDGE | INGEST `S2b`, deferred off its critical path. The 22-vs-353 split was a regex over signed URLs; there is no media rate limiting anywhere. One run: drain the same set twice, paced and unpaced, reading the typed error. Recipe in [../planning/ingest/findings/06-media-failure-classification.md](../planning/ingest/findings/06-media-failure-classification.md) |

## Decision index

Where each thing was settled, so nothing gets re-litigated from memory.

| Decision | Lives in |
|---|---|
| What Ambient is; the seven opinions | [thesis.md](thesis.md) |
| The nouns; sources, modes, principal, mandate, background agents | [product.md](product.md) — **Settled/Open at the bottom is current truth** |
| Mechanical vs reasoning; media; the schema; `now` | [knowledge-flow.md](knowledge-flow.md) |
| Modules, ownership, dependency direction | [seams.md](seams.md) |
| The `home` interface, and why the alternatives lost | [../adr/001-home-interface.md](../adr/001-home-interface.md) |
| The `work` interface — **provisional** | [../adr/002-work-interface.md](../adr/002-work-interface.md) |
| The home layout, CLI verbs, config schemas, the gate | [../planning/skeleton/spec.md](../planning/skeleton/spec.md) |
| Every domain noun, and the word not to use for it | [../../CONTEXT.md](../../CONTEXT.md) |
| The archive reader, the transcript line, the import verb | [../planning/import/spec.md](../planning/import/spec.md) |
| Why history import reads an archive — **and its two amendments** | [../adr/003-history-import-is-an-archive.md](../adr/003-history-import-is-an-archive.md) |
| How `ambient doctor` runs, file by file | [../walkthroughs/doctor.md](../walkthroughs/doctor.md) |
| Every engineering rule — one file each, with its check | [../rules/](../rules/), indexed by [../../AGENTS.md](../../AGENTS.md) |
| How a slice is built — the six steps and their gates | [../rules/slices.md](../rules/slices.md) |
| Running a slice, step by step, from the operator's seat | [../walkthroughs/slice.md](../walkthroughs/slice.md) |
| The Transcript line, and the two shapes it beat — **plus amendment 1, where `LiveReaction` stopped being a line** | [../adr/004-transcript-line-is-a-union-on-provenance.md](../adr/004-transcript-line-is-a-union-on-provenance.md) |
| Why `channel` binds to a durable runtime, and what a one-shot sync costs | [../adr/005-channel-binds-to-the-durable-runtime.md](../adr/005-channel-binds-to-the-durable-runtime.md) |
| Pairing, the Mirror read, the two refusals, and the sixteen gate rows | [../planning/ingest/spec.md](../planning/ingest/spec.md) |
| Why the method needed writing down, with the evidence | [../planning/method/deficits.md](../planning/method/deficits.md) |
| What closing a slice requires | [definition-of-done.md](./definition-of-done.md) |
| What OpenKnowledge already solves | [../history/research/open-knowledge.md](../history/research/open-knowledge.md) |
| Why the old repo failed | [../history/grills/001-old-repo-teardown.md](../history/grills/001-old-repo-teardown.md) |
| Slice ordering, and what was rejected | [../history/grills/003-roadmap-order.md](../history/grills/003-roadmap-order.md) |

## How to pivot

1. Update **You are here** and the **Status board**.
2. Add a dated **Ledger** line saying what changed and why.
3. Check **Dependencies** for what the change invalidates, and say so explicitly.
4. If it overturns something in the Decision index, edit that document — never leave two
   answers alive in two places.
