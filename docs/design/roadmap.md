# Roadmap

The anchor. When you are deep in one thing and need to know where you are, what is already
settled, or what breaks if you go backwards — this is the page.

**Hard cap: 200 lines.** The last attempt's ledger hit 2000 and nobody read it. When a
slice closes, delete its detail and leave two lines in the Ledger.

**Slices have names, not numbers.** Order changes; identity should not.

---

## You are here

> **IMPORT closed** — 16/16 gate; `vp check`, 49 tests, shape and zero duplication green.
> The real `~/.ambient` holds 13,134 Transcript lines and 980 verified Blobs from the media
> Archive; its previous contents are preserved beside it in a dated backup.
> **METHOD is active, and it is not product.** IMPORT shipped green while its topology was
> wrong — a 176-line CLI handler against 8, 8, 12 and 14 for its siblings, making `cli` the
> composition owner its own spec says it is not; an interface that met the design-it-twice
> bar and never got it; and a call graph nobody drew. The rule is written
> ([slices.md](../rules/slices.md)); METHOD turns it into `map-slice`, `plan-slice` and a
> `close-slice` that reads the graph. Evidence:
> [../planning/method/deficits.md](../planning/method/deficits.md).
>
> **INGEST is next, and METHOD's first real run.** Its scope must decide how a one-shot full
> sync resumes after a crash between seven ~4,800-message batches; do not spend another
> pairing on a tool that cannot durably write through IMPORT's Transcript path.

---

## Status board

| Slice | State | What it is |
|---|---|---|
| **SKELETON** | ● closed | Home layout, `ambient` CLI, config + schema validation. The conventions, as code. |
| **IMPORT** | ● closed | An **archive** → transcripts + blobs. `archive`, `transcript`, `blobs`, one CLI verb. No credential. Raw only. |
| **METHOD** | ◐ active | How a slice is built, as skills rather than folklore. `map-slice`, `plan-slice`, `close-slice`, vendored dependencies. **Not product.** |
| **INGEST** | ○ next | A **live account** → transcripts + blobs. `channel`: pairing, the one-shot full sync, cursors, the lease. Raw only. |
| **KNOWLEDGE** | ○ | The OpenKnowledge project, templates, ontology validator/queue/indexer, hand-operated passes → skills. |
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
                 │  └──> INGEST           │
                 └──> MEDIA               └──> EVALS
```

- **IMPORT before INGEST is forced.** A full sync is one-shot per credential, so `transcript`
  must exist before the next pairing. IMPORT builds it; INGEST uses it. KNOWLEDGE needs
  material rather than currency, so one archive unblocks it and INGEST keeps it fresh.
- **SKELETON is under everything.** Changing the home layout after IMPORT means rewriting
  what is on disk. This is why it goes first and why its interfaces get designed twice.
- **KNOWLEDGE is not trustworthy without MEDIA.** An unprocessed voice note is a hole, not
  a degraded entry. MEDIA can land any time after IMPORT, but must precede *trusting* the
  knowledge base.
- **HARNESS automates what KNOWLEDGE proved by hand.** Building it earlier means guessing
  at passes that do not exist yet — the old repo's mistake.
- **Going backwards is cheap left of KNOWLEDGE and expensive right of it**, because right
  of it there is content on disk shaped by the earlier decisions.

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

- **2026-08-17** — **The method is a rule, not folklore.**
  [../rules/slices.md](../rules/slices.md): map → frontier → plan → build → close, one gate
  each, an open question carrying a kind. 35 upstream skills vendored whole and never
  edited, because `modules.md` requires `codebase-design`'s words *exactly* and a rule must
  not depend on vocabulary that can change with no diff here. `map-slice` and `plan-slice`
  written; `close-slice` gains **definition-of-done row 10**, the call graph, read not run.
  **Learned:** IMPORT passed rows 1–9 while its topology was wrong, so every existing row
  measured behaviour and none measured shape. Slice replaces Area throughout, and the
  rejected ordering is renamed *breadth-first* — otherwise "thin vertical slice" would read
  as the thing we adopted rather than the thing we turned down.
- **2026-08-17** — **IMPORT correction re-proved on the real default home.** Reader v2 uses
  WhatsApp's structural mark, preserves rich media on poorer re-imports, and atomically
  replaces corrected Transcripts; the real ZIP produced 13,134 lines, 1,139 stored refs and
  980 content-verified Blobs, and its identical re-import was byte-identical.
  **Learned:** the first closure line's 105 is superseded — prose regex over-classified 73
  Messages and missed 19 Events; the source-marked answer is 13,083 Messages + 51 Events.
- **2026-08-17** — **IMPORT closed.** All three Archive forms now produce one Transcript, global deduplicated Blobs, a verbatim primary source and a hash-addressed Receipt; 16/16 gate and all repository checks pass.
  **Learned:** 1,139 media refs collapse to 980 unique Blobs, and the claimed 174 events were word occurrences, not lines — the conservative whole-line Reader records 105 and preserves the source for re-reading.
- **2026-08-17** — **INTAKE split into IMPORT and INGEST; IMPORT specified.** The halves
  share only an output type — one needs a file, the other a credential and an open question.
  The order is forced: a full sync is **one-shot per credential** (43,334 msgs, 1,506 chats,
  7 batches), so the write path ships first. **ADR 003 gained two amendments** — the one-year
  ceiling was measured with the full-history request *deleted* by a gate (whatsappd
  `cf44458`), and decision 1 survives on a narrower reason. Settled by measurement, not
  argument: zip names decode as UTF-8 (**0 of 1,140** flagged; a conformant decode loses 4
  documents), the dedup key is the **wall clock** (1 collision in 13,134), and the transcript
  line is a **union on provenance** so *"this reader cannot see replies"* is unrepresentable.
- **2026-08-17** — **The lexicon exists.** [../../CONTEXT.md](../../CONTEXT.md), governed by
  [../rules/language.md](../rules/language.md): 28 nouns, one meaning each, plus the words
  not to use. Written because *"backfill"* named two operations and produced four wrong
  answers in one session — and a warning inside `product.md` only reaches a reader already
  in `product.md`.
- **2026-08-16** — **Conventions made runnable.** `vp run shape` checks what AGENTS.md
  only claimed — file length against a declared exception list, the six slots, `internal/`
  privacy, no `../..`, no `throw`, and every document cross-link. The contract split into
  one file per rule under [../rules/](../rules/), each stating its rule, its argument and
  the command that enforces it or *"not currently checked"*. Closing a slice now has a
  list: [definition-of-done.md](./definition-of-done.md). Duplication baseline **0 lines**.
- **2026-08-16** — **INTAKE scoped** against the principal's real iOS account. The mirror
  spans four years with no media refs; the accepted log spans ten days and carries them —
  so history import and continuous ingestion read different stores. **Corrects
  `thesis.md`'s cold start**: the graph is rich (1,560 contacts, 913 chats, 2,417 aliases)
  but conversation history is thin (2,739 messages, 90% from 2026). True of people, not of
  conversations. Six open questions block the spec; the highest-value one is whether
  `whatsappd` can pull deeper history.
- **2026-08-16** — **SKELETON closed.** `ambient init · doctor · chat add · agent add`;
  18/18 gate against real temp directories. **OpenKnowledge is vendored, not called** — `ok
  init` writes a nested `.git` and six editor directories to deliver one file of defaults,
  so we write it ourselves. Six ADR 001 statements were wrong on contact and are in that
  ADR's Amendments. Two things parked, neither blocking: `capabilities` may already be dead
  (decide at CAPABILITIES), and ADR 002 falsifier #2 lands at MEDIA/LOOPS.
- **2026-08-16** — SKELETON specified. Design-it-twice run on both load-bearing seams:
  `home` → ADR 001 (unit handles; no cache, so hot-reload is structural), `work` → ADR 002
  (**provisional**; loops are declarations, `claim/complete/fail/nextDue` rejected).
  **Grill 002 Q1 amended** — the work key generalises from `chat_id` to `(kind, key)`.
  Layout, CLI verbs, config schemas and the gate written. No code written.
- **2026-08-16** — Design phase closed. Product model, knowledge flow, seam map and
  engineering contract agreed across one session; nine slices named and ordered.
  No code written.

---

## Research queue

Answer before the slice that needs it — not before.

| Question | Blocks | Note |
|---|---|---|
| What did the MCP spec change? | CAPABILITIES | Statelessness; better with many agents on many servers. **Read the spec — do not design from memory.** |
| How does Pi take per-session MCP config? | HARNESS, CAPABILITIES | email-pa sets `enableMCP: false` after a stray server polluted a client's directory |
| ~~Schema coverage for a whole domain~~ | ~~SKELETON~~ | **Answered** — [spec.md §3.4](../planning/skeleton/spec.md). Closed *field vocabulary*, open *type space*: users add types, never field forms. Whether the six shipped types cover a real domain is now an observation for KNOWLEDGE, not a design question |
| Does OK `search` hold at thousands of docs? | MOUTH | Index-as-judgement is fine either way; ranking is the question |

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
| How `ambient doctor` runs, file by file | [../walkthrough-doctor.md](../walkthrough-doctor.md) |
| Every engineering rule — one file each, with its check | [../rules/](../rules/), indexed by [../../AGENTS.md](../../AGENTS.md) |
| How a slice is built — the five steps and their gates | [../rules/slices.md](../rules/slices.md) |
| Why the method needed writing down, with the evidence | [../planning/method/deficits.md](../planning/method/deficits.md) |
| What closing a slice requires | [definition-of-done.md](./definition-of-done.md) |
| What OpenKnowledge already solves | [../history/research/open-knowledge.md](../history/research/open-knowledge.md) |
| Why the old repo failed | [../history/grills/001-old-repo-teardown.md](../history/grills/001-old-repo-teardown.md) |
| Slice ordering, and what was rejected | [../history/grills/003-roadmap-order.md](../history/grills/003-roadmap-order.md) |

## How to pivot

1. Update **You are here** and the **Status board**.
2. Add a dated **Ledger** line saying what changed and why.
3. Check **Dependencies** for what the change invalidates, and say so explicitly.
4. If it overturns something in the Decision index, edit that document — do not leave two
   answers alive in two places.
