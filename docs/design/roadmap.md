# Roadmap

The anchor. When you are deep in one thing and need to know where you are, what is already
settled, or what breaks if you go backwards — this is the page.

**Hard cap: 200 lines.** The last attempt's ledger hit 2000 and nobody read it. When a
slice closes, delete its detail and leave two lines in the Ledger.
**Slices have names, not numbers.** Order changes; identity should not.

---

## You are here

> **METHOD closed** — the six steps have a driver. `/slice <SLICE>` reads where a slice is
> from seven `ls`/`grep` signals, reports, asks, dispatches one step by repository path, and
> owns the **one** call site for `render-slice` and the step report, which had six and none.
> `vp run shape` refuses a module with no [`seams.md`](seams.md) row. **DRIVER — the work
> inside METHOD that built all this — is closed: all twenty of its tickets are terminal**,
> including 08 and 09, which METHOD closed without. `vp run shape` is clean for the first time.
>
> **KNOWLEDGE is active.** Both halves of its material exist — an Archive's history and a
> Live account kept current — but not MEDIA, and an unprocessed voice note is a hole rather
> than a degraded entry. It can start; *trusting* it cannot.

---

## Status board

| Slice | State | What it is |
|---|---|---|
| **SKELETON** | ● closed | Home layout, `ambient` CLI, config + schema validation. The conventions, as code. |
| **IMPORT** | ● closed | An **archive** → transcripts + blobs. `archive`, `transcript`, `blobs`, one CLI verb. No credential. Raw only. |
| **METHOD** | ● closed | How a slice is built, as skills rather than folklore. `/slice` drives the six steps; `map-slice` … `close-slice` do them. **Not product.** |
| **INGEST** | ● closed | A **live account** → transcripts + blobs. `channel` hides `whatsappd`; `ingest` owns the order of the writes. `pair · peers · ingest`. **No Cursor** — the Mirror is current state. Raw only. |
| **KNOWLEDGE** | ◐ active | The OpenKnowledge project, templates, ontology validator/queue/indexer, hand-operated passes → skills. |
| **HARNESS** | ○ | Pi session construction: `cwd`, model policy, per-session MCP list, skills, typed receipts. |
| **LOOPS** | ○ | Triggers, cadences, the lease, the job runner. Where the Effect **runtime** lands — `Schema` already landed at the parse boundary, [ADR 006](../adr/006-schema-is-the-parse-boundary.md). |
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

Two lines per closed slice, or per pivot. Newest first, and **only the newest three live
here** — the rest is [`history/ledger.md`](../history/ledger.md), appended to and never
edited. That split is what keeps this file under its cap; the record is not shortened by
being moved.

- **2026-08-20** — **DRIVER closed.** Its last eleven tickets shipped and METHOD's two
  deferrals with them; the reviewer is now [ours](../../.agents/skills/code-review/SKILL.md),
  on three axes, the third reading `design.md` and `seams.md`.
  **Learned: every numeric check in `diagrams.md` passed while four connectors shared one
  corridor and three module names were clipped off the canvas.** What found both was opening
  the page and looking at it.
- **2026-08-19** — **METHOD closed.** `/slice` drives the six steps: seven `ls`/`grep` signals,
  report, ask, dispatch by repository path. Alignment moved to the front of step 1; the deficit
  register became tickets in [history](../history/method-deficits.md).
  **Learned: `disable-model-invocation: true` blocks skill-to-skill dispatch, not only a model
  auto-starting one** — flagging the six step skills would have left the driver unable to call any.
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

## Research queue

Answer before the slice that needs it — not before.

| Question | Blocks | Note |
|---|---|---|
| How does Pi take per-session MCP config? | HARNESS, CAPABILITIES | email-pa sets `enableMCP: false` after a stray server polluted a client's directory |
| Do the 375 failed media downloads come back under pacing? | **trusting** KNOWLEDGE | INGEST `S2b`, deferred off its critical path. The 22-vs-353 split was a regex over signed URLs; there is no media rate limiting anywhere. One run: drain the same set twice, paced and unpaced, reading the typed error. Recipe in [../planning/ingest/findings/06-media-failure-classification.md](../planning/ingest/findings/06-media-failure-classification.md) |
| Does an ontology shaped against one chat survive the second Source? | **trusting** KNOWLEDGE | KNOWLEDGE fog, retired 2026-08-20. Shaped against 14 labels in one engineering group; email-pa's had 206 Documents across many counterparties. **Trigger:** the first time a second Source lands, re-run `T1`'s stratified sampling against it and compare the type distribution. Method in [../planning/knowledge/findings/06-what-the-corpus-holds.md](../planning/knowledge/findings/06-what-the-corpus-holds.md) |

**Two closed 2026-08-20 by KNOWLEDGE.** *MCP spec* — **answered**, current revision is
`2026-07-28` and `initialize` is deleted; it post-dates the assistant's training, so *"read
the spec"* earned itself ([findings/05](../planning/knowledge/findings/05-mcp-spec-and-the-tool-boundary.md)).
*OK `search` at scale* — **retired**, [ADR 007](../adr/007-knowledge-is-files-not-a-client.md)
means we never call it; measured first at max 100, no wildcard.

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
| Why external data is decoded by a Schema, and where `effect` enters | [../adr/006-schema-is-the-parse-boundary.md](../adr/006-schema-is-the-parse-boundary.md) |
| Why `knowledge` writes files, and OpenKnowledge is a format rather than a client | [../adr/007-knowledge-is-files-not-a-client.md](../adr/007-knowledge-is-files-not-a-client.md) |
| Pairing, the Mirror read, the two refusals, and the sixteen gate rows | [../planning/ingest/spec.md](../planning/ingest/spec.md) |
| Why the method needed writing down, with the evidence | [../planning/method/deficits.md](../history/method-deficits.md) |
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
