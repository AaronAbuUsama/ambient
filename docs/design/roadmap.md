# Roadmap

**Hard cap: 200 lines.** The previous attempt's ledger hit 2000 and became sprawl. When an
area closes, delete its detail and leave two lines of outcome.

A roadmap here means: **the major areas, and the order we do them in.** Not one section in
detail and a pile of themes.

---

## The nine areas

| # | Area | What it is |
|---|---|---|
| 1 | **Skeleton** | Home layout, `ambient` CLI, config + schema validation. The conventions, as code. |
| 2 | **Intake** | whatsappd adapter. Accounts, sources, allowlist, sync → transcripts + hash-addressed media blobs. Raw only. |
| — | **Media processing** | Hash-keyed processors: STT, vision, extraction. **Off the critical path** — self-contained, does not gate the shape. Any time after Intake; required before Knowledge is trustworthy. |
| 4 | **Knowledge** | The OpenKnowledge project, templates, the ontology validator/queue/indexer, and the hand-operated passes that become skills. |
| 5 | **Harness** | Pi session construction: `cwd`, model policy, per-session MCP list, skill discovery, typed run receipts. |
| 6 | **Loops** | Triggers, cadences, the lease, the job runner. |
| 7 | **Capabilities** | Chat folders as runtime instances; the reflector MCP; background agents. |
| 8 | **The mouth** | The speaker. |
| 9 | **Evals** | Cases as directories, deterministic assertions, offline replay. Cross-cutting. |

**Order: 1 → 2 → 4 → 5 → 6 → 7 → 8. Media any time after 2. Evals from 5.**

The two orderings that were grilled and rejected are recorded in
[grills/003](../history/grills/003-roadmap-order.md).

---

## Why this order

**Shape before content.** email-pa discovered its conventions *after* 92 pages existed, and
`new-unit` — the scaffolder that encodes them — arrived last. That retrofit is the mistake
being avoided. Conventions must be generated and validated by code before anything writes
into them.

**But the shape needs real data to be designed against.** So Intake is foundational too:
area 2 stops at raw transcripts and blobs on disk, before any interpretation. You get real
material to shape against without committing to a knowledge model you invented in the
abstract.

**Media is needed before Knowledge is trustworthy** — an unprocessed voice note is a hole,
not a degraded entry — but it is self-contained and does not gate the shape, so it is not a
sequenced area.

**Harness after knowledge**, because the harness's job is to automate passes that already
work. Claude Code plus a human *is* the harness during area 4. That is the method:

> Operate it by hand until it's good, then automate the loop that does it.

**Evals from area 5**, because that is the first point where there is machine behaviour to
assert. Before that the assertions are `lint` and schema validation, which area 1 owns.

---

## Area 1 — Skeleton

**Status: active. Not started.**

**Do not copy the old CLI verbatim — its shape was wrong.** `src/home/` exposed eleven
functions and twelve interfaces over file reading: large interface, thin implementation,
every caller learning the layout. Port the *behaviours* behind one interface. See
[seams.md](seams.md).

**The question.** Is there a single command that creates a correct Ambient home, and a
single command that tells you when one is wrong?

**Prior art, and it worked.** The old repo's `src/cli.ts` + `src/home/` (1038 lines):
`ambient init` created the home idempotently; `doctor` re-derived health from disk with a
non-zero exit; `activate` scaffolded a chat folder and its mandate; every scanner was
fail-closed, so an unknown key failed loudly rather than being ignored. Port the design,
rewrite the code.

**In scope.**

- The home layout, decided and documented — every path, what owns it, what may write it
- `ambient init` — idempotent, creates the home and seeds templates
- `ambient doctor` — re-derives health from disk, names the exact wound, non-zero exit
- `ambient chat add` / `ambient agent add` — scaffold a chat folder or a background agent
  folder from a template. **The scaffolder is how a convention becomes real.**
- Config validation, fail-closed: home config, chat config, agent config
- `schema.yaml` — the closed ontology vocabulary, validated
- `ok init` on the knowledge base, with folder frontmatter and page templates

**Out of scope.** Any content. Any model call. Any loop. Nothing here reads a message.

**Gate.** `ambient init` on an empty machine produces a home that `ambient doctor` calls
healthy. Break any file by hand — a bad key, a missing section, a malformed schema — and
`doctor` names it precisely and exits non-zero. `ambient chat add` produces a folder that
is valid by construction.

**Known risks.** Deciding the layout without real data in front of us; mitigated by keeping
area 2 immediately after and expecting one revision. The schema's domain coverage is
genuinely open — six types drafted, and a principal's life is wider.

---

## Area 2 — Intake

Named only: **whatsappd adapter, accounts and sources with modes, the allowlist, sync to
transcripts and hash-addressed media blobs. Raw only — no interpretation.**

Blocked on one decision, not a task: reading real history means pairing `whatsappd` as a
linked device on the principal's personal WhatsApp. The allowlist is the mitigation.

Do not plan this until area 1's gate is met.

---

## Before area 1 is built

1. **[AGENTS.md](../../AGENTS.md)** — done. The five Effect-lite rules and the deep-module tests.
2. **[seams.md](seams.md)** — done. Every module, ownership, dependency direction.
3. **Design-it-twice on `home` and `work`** — agreed, both. `work`'s result is marked
   provisional. **Run these in a fresh context**, entering at `README.md`.
4. Detailed interfaces for area 1 only, plus a sketch of area 2.

## Research queue

Answer before the area that needs it — not before.

| Question | Blocks | Note |
|---|---|---|
| What did the MCP spec actually change? | 7 | Statelessness; better with many agents on many servers. **Read the spec — do not design from memory.** |
| How does Pi take per-session MCP config? | 5, 7 | email-pa sets `enableMCP: false` after a stray server polluted a client's directory |
| Schema coverage for a whole domain | 1 | Six types drafted; needs business, code, calendar, and per-install extension without going open-ended |
| Does OK's `search` hold at thousands of docs? | 8 | Index-as-judgement is fine either way; ranking is the question |

---

## Handoff — resuming in a fresh context

1. `README.md` — the map
2. `thesis.md` — what Ambient is, the category, the seven opinions
3. `product.md` — the nouns; **Settled and Open at the bottom are the current truth**
4. `research/open-knowledge.md` — **the substrate. Much of the apparent product surface is
   already solved here.**
5. `knowledge-flow.md` — mechanical vs reasoning, media, the schema, `now`
6. This file

`kernel.md` is history and lessons and defers to the above. `grills/` are dated records.

**Decided, and most likely to be wrongly re-litigated:**

- **`cwd` is the chat's own folder** — that is what scopes its skills and writes. No
  conflict with one shared knowledge base, because OpenKnowledge is addressed over MCP.
- **The knowledge base and the chat folders are separate trees.** A chat folder is a
  runtime instance directory, not knowledge, and lives outside the OK content dir.
- **No separate graph store.** Entities are OK documents with typed frontmatter; the
  ontology tool is a validator, queue and indexer, never a CRUD layer.
- **Shape before content.** Conventions are generated and validated by the CLI before
  anything writes into them.
