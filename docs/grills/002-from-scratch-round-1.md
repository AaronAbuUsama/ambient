# Grill 002 — First from-scratch pass (superseded in part by 003)

Date: 2026-08-16. Written *before* the email-pa / OpenKnowledge research.
Kept because the four decisions still stand; the harness proposal does not.

**Superseded:** this round proposed writing a bespoke `run(dir, incoming)` agent loop.
The email-pa research (see `research/email-pa-teardown.md`) showed the harness should be
`@oh-my-pi/pi-coding-agent` with `cwd` set to the unit. Everything else survives.

## Take for parts

| From old repo | Verdict | Why |
|---|---|---|
| `whatsappd` (npm 0.3.0) | Keep as-is | Owns pairing, accepted log, durable outbound queue with idempotency keys |
| `src/whatsapp/` (1620) | Port on a diet | Keep `observation-mapper`, `peer`, `mirror` (lid↔phone alias resolution is load-bearing), `media-bytes` |
| `src/home/` (1038) | Port the idea, rewrite the code | Folders + YAML + fail-closed + `doctor` is the best thing in the repo |
| `src/models/` (263) | Port | Provider-defs vs role-profiles is the right split |
| `agents/github-issues/agent.yaml` | Port the idea | An agent with a bar it holds and a decline path is genuinely good |
| `src/media/` (172) | Port | describe-and-cache |
| EAV graph (~1650) | Delete | |
| 4 work stores + 4 services (~1960) | Delete | |
| `src/evals/` (661) | Delete the code, keep the ambition | |
| `src/proofs/` (2143) | Delete | The eval harness replaces it |
| `prompts/conversation.md` | Port the prose | conversation-v6 is decent writing |
| Mandate compensation prose | Delete, never write again | |

## Decisions taken

### Q1 — Database: **one table, five columns**

```sql
chats(chat_id PK, cursor, due_at, lease_until, lease_owner)
```

Everything else is files. SQLite does exactly one job — mutual exclusion and a watermark
— which is the job it is best at. Zero-database (file locks) trades a solved problem for
an unsolved one to save ~120 lines. A bigger schema is how you get back to 31 tables.

`whatsappd` already owns outbound idempotency, so Ambient does not need to.

**Failure modes:** crash after send / before write → send is idempotent on its key, fold
is stale by one run, transcript rebuilds from whatsappd's mirror. Degraded, never
corrupt. Write temp + rename → a file is old or new, never torn.

### Q2 — Agent kinds: **one**

A speaker per chat. Memory notes are a tool it calls. Sub-agents are tools with their own
prompt. **The Root is the speaker in the master chat, whose tool list additionally
includes editing the home** — self-modification IS a file write, and `git log` is the
audit trail. Background compaction splits out later, when a chat actually gets big.

Rejected: the canonized four kinds (Root / Conversation / Worker / Memory). Two shipped;
the Memory one produced model-invented predicates. Four eval suites for one product.

### Q3 — Eval execution: **record/replay now, nightly live later**

The old evals ran *inside* the live path — 136 judge calls, no gate, no reader. Inverted:
nothing is judged live, everything is judged offline against recordings, before deploy.

Cassettes make the suite fast enough to drive development (`~2s`, free, runs in CI).
Live-every-time recreates the slow proof rig being thrown away. Add a nightly live pass
once there are enough cases to guard against model drift.

### Q4 — Old home: **mine it for cases, then clean slate**

The old database's real value is not its memory — it is 142 recorded runs of things going
wrong, the best eval corpus available for free. Take ~15 cases (theology derail, invented
issue numbers, repeated self-introduction), then let the home go.

## Two invariants for the new repo

1. **The run function stays pure over its directory.** The moment it reaches past its
   directory for context, eval cases stop being directories and EDD dies.
2. **No apologetic prose in any prompt.** Every sentence telling the agent not to trust
   itself is a check that has not been written yet.

## Eval design (survives intact)

**A case is a directory.** Because the runtime's context is files, a fixture is a copy of
a chat folder plus the incoming messages.

```
evals/cases/0007-theology-derail/
  home/identity.md
  chat/{chat.md,state.md,memory/,transcript.jsonl}
  incoming.jsonl
  expect.yaml
  cassette.jsonl
```

**Deterministic assertions first.** Most real failures are not matters of taste:

```yaml
silence: true
reply:
  matches: ["which platform"]
  not_matches: ["I'm back", "caught up", "^(Hi|Hello|Hey)\\b"]
tools:
  called: [recall]
  not_called: [delegate]
grounding:
  claims_have_receipts: true      # every #\d+ and URL in the reply must appear in a
                                  # tool result from this run
```

`claims_have_receipts` kills the fabricated-issue-number class outright, and deletes the
apologetic paragraph from the bug-reports mandate.

**Judge only for voice.** "Does this read like the tenth message in the thread or the
first?" Scored offline against the recorded reply.

**Cases are born from production.** `ambient case add <run-id> --expect silence`
snapshots the run's input directory and cassette. The theology derail becomes case 0007
forever.

**The loop:** see it go wrong → `case add` (red) → change something → `ambient eval`
(offline, free) → green → deploy. Ship on a number, regress on a number.
