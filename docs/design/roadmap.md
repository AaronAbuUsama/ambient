# Roadmap

The anchor. When you are deep in one thing and need to know where you are, what is already
settled, or what breaks if you go backwards — this is the page.

**Hard cap: 200 lines.** The last attempt's ledger hit 2000 and nobody read it. When an
area closes, delete its detail and leave two lines in the Ledger.

**Areas have names, not numbers.** Order changes; identity should not.

---

## You are here

> **INTAKE** — active, not scoped. SKELETON is closed: `ambient init · doctor · chat add ·
> agent add` work, 17/17 gate, `vp check` and `vp test` green. The next act is scoping
> INTAKE — it has not been planned yet, deliberately.

---

## Status board

| Area | State | What it is |
|---|---|---|
| **SKELETON** | ● closed | Home layout, `ambient` CLI, config + schema validation. The conventions, as code. |
| **INTAKE** | ◐ active | whatsappd adapter. Sources, modes, allowlist, sync → transcripts + blob refs. Raw only. |
| **KNOWLEDGE** | ○ | The OpenKnowledge project, templates, ontology validator/queue/indexer, hand-operated passes → skills. |
| **HARNESS** | ○ | Pi session construction: `cwd`, model policy, per-session MCP list, skills, typed receipts. |
| **LOOPS** | ○ | Triggers, cadences, the lease, the job runner. The one place Effect lands. |
| **CAPABILITIES** | ○ | Chat folders as runtime instances; the reflector MCP; background agents. |
| **MOUTH** | ○ | The speaker. |
| **MEDIA** | ○ off-path | STT, vision, extraction. Hash-keyed, cached. Any time after INTAKE. |
| **EVALS** | ○ off-path | Cases as directories, offline replay. Starts once HARNESS exists. |

`○` not started · `◐` active · `●` closed

## Dependencies — read before pivoting

```
SKELETON ──> INTAKE ──> KNOWLEDGE ──> HARNESS ──> LOOPS ──> CAPABILITIES ──> MOUTH
                 │                        │
                 └──> MEDIA               └──> EVALS
```

- **SKELETON is under everything.** Changing the home layout after INTAKE means rewriting
  what is on disk. This is why it goes first and why its interfaces get designed twice.
- **KNOWLEDGE is not trustworthy without MEDIA.** An unprocessed voice note is a hole, not
  a degraded entry. MEDIA can land any time after INTAKE, but must precede *trusting* the
  knowledge base.
- **HARNESS automates what KNOWLEDGE proved by hand.** Building it earlier means guessing
  at passes that do not exist yet — the old repo's mistake.
- **Going backwards is cheap left of KNOWLEDGE and expensive right of it**, because right
  of it there is content on disk shaped by the earlier decisions.

## Why this order

**Shape before content.** email-pa discovered its conventions *after* 92 pages existed and
its scaffolder arrived last, so they had to be retrofitted. Conventions are generated and
validated by code before anything writes into them.

**But shape needs real data.** INTAKE is foundational too — it stops at raw transcripts and
blobs, giving real material to shape against without committing to an invented model.

**Operate it by hand until it is good, then automate.** Claude Code plus a human *is* the
harness during KNOWLEDGE. Pi comes last, not first.

Rejected orderings — thin vertical slice, harness-before-knowledge — are recorded with
their rubrics in [../history/grills/003-roadmap-order.md](../history/grills/003-roadmap-order.md).

---

## Active — INTAKE

**Not scoped yet.** Scoping it is the next act, and it should be done against the real
`whatsappd` data rather than in the abstract.

**The question.** Can Ambient read a real WhatsApp account and land raw transcripts and
media blobs on disk, in the shape SKELETON defined, with nothing interpreted?

**What is already known.**

- **No device pairing is needed.** The previous build's paired credential exists and is
  backed up at `~/ambient-backups/ambient-home-20260816-161025` (`whatsapp.db`, 8.1 MB).
- Raw only. No interpretation, no knowledge, no model call.
- Two source modes exist in the config schema already: `ingest` never speaks, `speak` reads
  and speaks. The allowlist is opt-in per conversation and empty by default.
- `home` owns every path. `channel` asks `home` for a chat's `transcript` and `media`
  places; it never builds one.

**Watch for.** SKELETON's layout was decided without real data in front of us. One revision
was budgeted. This is the area that spends it — the chat ↔ source binding (`source`, `peer`)
is the most likely thing to move.

---

## Ledger

Append-only. Two lines per closed area, or per pivot. Newest first.

- **2026-08-16** — **SKELETON closed.** `ambient init · doctor · chat add · agent add`;
  17/17 gate against real temp directories; `vp check` and `vp test` green repo-wide.
  Restructured to the module shape before closing — 696-line `index.ts` became a 212-line
  `types.ts` plus an 86-line `service.ts`; 26 repetitions of one error idiom and 8
  non-empty-tuple gymnastics both to zero. **OpenKnowledge is vendored, not called**: `ok
  init` writes a nested `.git` and six editor directories to deliver one file whose every
  key is a default, so we write those files ourselves; `ok preview` confirms the format
  matches. `HomeDeps` deleted — with the spawn gone it had no members. Four ADR 001
  statements were wrong on contact and are recorded in that ADR's Amendments section.
- **2026-08-16** — Two observations parked from the spec review, **neither blocking**:
  (a) `capabilities` may already be dead — ADR 001's `Chat` returns `mcpServers` and
  `agents` already RESOLVED, which is the job seams.md gave that module; decide at
  CAPABILITIES, not now. (b) ADR 002 falsifier #2 (`Loop.spec → RunSpec` assumes every
  unit is an agent session; Whisper is a plain API call) is rated most likely and lands at
  MEDIA/LOOPS — `work` is not built in SKELETON, so it does not block.
- **2026-08-16** — SKELETON specified. Design-it-twice run on both load-bearing seams:
  `home` → ADR 001 (unit handles; no cache, so hot-reload is structural), `work` → ADR 002
  (**provisional**; loops are declarations, `claim/complete/fail/nextDue` rejected).
  **Grill 002 Q1 amended** — the work key generalises from `chat_id` to `(kind, key)`.
  Layout, CLI verbs, config schemas and the gate written. No code written.
- **2026-08-16** — Design phase closed. Product model, knowledge flow, seam map and
  engineering contract agreed across one session; nine areas named and ordered.
  No code written.

---

## Research queue

Answer before the area that needs it — not before.

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
| How `ambient doctor` runs, file by file | [../walkthrough-doctor.md](../walkthrough-doctor.md) |
| The module shape; where Effect goes; OpenKnowledge vendored | [../../AGENTS.md](../../AGENTS.md) |
| Effect's boundary; the five rules; deep-module tests | [../../AGENTS.md](../../AGENTS.md) |
| What OpenKnowledge already solves | [../history/research/open-knowledge.md](../history/research/open-knowledge.md) |
| Why the old repo failed | [../history/grills/001-old-repo-teardown.md](../history/grills/001-old-repo-teardown.md) |
| Area ordering, and what was rejected | [../history/grills/003-roadmap-order.md](../history/grills/003-roadmap-order.md) |

## How to pivot

1. Update **You are here** and the **Status board**.
2. Add a dated **Ledger** line saying what changed and why.
3. Check **Dependencies** for what the change invalidates, and say so explicitly.
4. If it overturns something in the Decision index, edit that document — do not leave two
   answers alive in two places.
