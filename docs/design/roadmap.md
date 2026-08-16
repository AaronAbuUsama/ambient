# Roadmap

The anchor. When you are deep in one thing and need to know where you are, what is already
settled, or what breaks if you go backwards — this is the page.

**Hard cap: 200 lines.** The last attempt's ledger hit 2000 and nobody read it. When an
area closes, delete its detail and leave two lines in the Ledger.

**Areas have names, not numbers.** Order changes; identity should not.

---

## You are here

> **SKELETON** — specified, not started. Both interfaces are designed (ADR 001, ADR 002) and
> the spec is written. Nothing is built. Nothing is blocked except INTAKE's device-pairing
> decision.

---

## Status board

| Area | State | What it is |
|---|---|---|
| **SKELETON** | ◐ active | Home layout, `ambient` CLI, config + schema validation. The conventions, as code. |
| **INTAKE** | ○ next | whatsappd adapter. Sources, modes, allowlist, sync → transcripts + blob refs. Raw only. |
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

## Active — SKELETON

**The question.** Is there one command that creates a correct Ambient home, and one that
tells you when a home is wrong?

**Do not copy the old CLI.** Its shape was wrong: `src/home/` exposed eleven functions and
twelve interfaces over file reading — large interface, thin implementation, every caller
learning the layout. Port the *behaviours* behind one interface. See [seams.md](seams.md).

**In scope.** The home layout decided path by path (what owns each, what may write it) ·
`ambient init`, idempotent · `ambient doctor`, re-derives health from disk and exits
non-zero · `ambient chat add` / `agent add` scaffolders — **the scaffolder is how a
convention becomes real** · fail-closed config validation · `schema.yaml` · `ok init` with
folder frontmatter and page templates.

**Out of scope.** Any content, any model call, any loop. Nothing here reads a message.

**Gate.** `ambient init` on a clean machine produces a home `ambient doctor` calls healthy.
Break any file by hand and `doctor` names it precisely and exits non-zero. `chat add`
produces a folder valid by construction.

**In flight.** Nothing. Design-it-twice is done on both seams —
[ADR 001](../adr/001-home-interface.md) (`home`) and [ADR 002](../adr/002-work-interface.md)
(`work`, **provisional**) — and the spec is at
[docs/planning/skeleton/spec.md](../planning/skeleton/spec.md). Next is implementation, then
the gate. Issues not yet filed.

**Risk.** The layout is being decided without real data in front of us. INTAKE follows
immediately to catch that; budget one revision.

## Next — INTAKE

**Blocked on a decision, not a task:** reading real history means pairing `whatsappd` as a
linked device on the principal's personal WhatsApp. The allowlist is the mitigation. Do not
plan the area until SKELETON's gate is met.

---

## Ledger

Append-only. Two lines per closed area, or per pivot. Newest first.

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
