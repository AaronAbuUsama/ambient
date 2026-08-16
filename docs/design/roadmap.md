# Roadmap

The anchor. When you are deep in one thing and need to know where you are, what is already
settled, or what breaks if you go backwards — this is the page.

**Hard cap: 200 lines.** The last attempt's ledger hit 2000 and nobody read it. When an
area closes, delete its detail and leave two lines in the Ledger.

**Areas have names, not numbers.** Order changes; identity should not.

---

## You are here

> **SKELETON** — not started. Two interfaces are being designed first: `home` and `work`.
> Nothing is built. Nothing is blocked except INTAKE's device-pairing decision.

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

**In flight.** Design-it-twice on `home` → `docs/adr/001-home-interface.md`. Then `work` →
`002`, marked provisional. Then the spec → `docs/planning/skeleton/`.

**Risk.** The layout is being decided without real data in front of us. INTAKE follows
immediately to catch that; budget one revision.

## Next — INTAKE

**Blocked on a decision, not a task:** reading real history means pairing `whatsappd` as a
linked device on the principal's personal WhatsApp. The allowlist is the mitigation. Do not
plan the area until SKELETON's gate is met.

---

## Ledger

Append-only. Two lines per closed area, or per pivot. Newest first.

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
| Schema coverage for a whole domain | SKELETON | Six types drafted; needs business, code, calendar, and per-install extension without going open-ended |
| Does OK `search` hold at thousands of docs? | MOUTH | Index-as-judgement is fine either way; ranking is the question |

## Decision index

Where each thing was settled, so nothing gets re-litigated from memory.

| Decision | Lives in |
|---|---|
| What Ambient is; the seven opinions | [thesis.md](thesis.md) |
| The nouns; sources, modes, principal, mandate, background agents | [product.md](product.md) — **Settled/Open at the bottom is current truth** |
| Mechanical vs reasoning; media; the schema; `now` | [knowledge-flow.md](knowledge-flow.md) |
| Modules, ownership, dependency direction | [seams.md](seams.md) |
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
