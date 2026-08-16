# Roadmap

**Hard cap: this document stays under 200 lines.** The previous attempt's ledger reached
2000 and became sprawl nobody read. One section in detail, the next one named in a line,
everything after that as unordered themes. When a section closes, delete its detail and
replace it with two lines of outcome.

## The gate discipline

```
plan the section  →  build it  →  review  →  STOP  →  plan the next
```

Never plan more than one section in detail. Never start the next before reviewing the last.
A section closes on its **gate** — a specific thing that is either true or not.

---

## Section 1 — The knowledge base exists and is worth reading

**Status: not started.**

**The question.** Can Ambient read a real WhatsApp history and produce a knowledge base
that tells Aaron something true about his own world he would otherwise have had to dig for?

**Why this first.** Everything downstream is worthless without it, and the cold start is
the binding constraint: the test number has nothing canonical on it. The real history lives
on the principal's personal WhatsApp. See `thesis.md` → *The cold start problem*.

**Step zero, and it is a decision, not a task.** Reading that history means pairing
`whatsappd` as a linked device on Aaron's personal WhatsApp. That is a real thing to be
comfortable with. Nothing else in this section can start until it is settled. The
allowlist is the mitigation — opt-in, conversation by conversation, nothing by default.

**In scope.**

- `ok init` a fresh home; folder frontmatter and templates for the page shapes
- A minimal TypeScript `bin/`: `sync` (whatsappd → `transcript.jsonl` + media blobs),
  `stub` (unknown senders → Person docs at `status: unreviewed`), `lint` (frontmatter vs
  schema), `index` (derived read model)
- First-draft `schema.yaml` — the closed vocabulary, hand-written
- Allowlist a handful of genuinely information-rich chats; history import
- **Media pipeline for voice notes and images.** Not optional: an unprocessed voice note is
  a hole in the transcript, not a degraded entry
- **Then operate it by hand.** Claude Code in the folder, building pages against real
  history, until the skills are obvious. The skills get written from what actually
  happened, not guessed

**Out of scope.** Speaking. The Pi harness. Background agents. Email. Chat folders as
runtime instances — nothing here needs a mandate, because nothing here talks.

**Gate.** Aaron opens the knowledge base and finds at least one thing that is true, that
he did not tell it, and that he would have had to go digging for. Plus: `lint` clean,
every page's claims cite a source inside the base, `[assumed]` markers present and counted
rather than absent.

**Known risks.** The schema draft covers six types and the domain is wider. Identity
resolution across numbers is reasoning, not mechanics — *propose with evidence, never
merge*. History volume may swamp a single pass; expect to shard by chat.

---

## Section 2 — The loops run themselves

Named only, one line: **encode the hand-operated passes as skills, put them under a Pi
harness with cadences and typed run receipts, and make `now` a real generated fold.**

Do not plan this until Section 1's gate is met.

---

## Themes, unordered

Not phases. Not committed. Rough sense of where this goes.

- **The mouth.** A speaker in one chat, `cwd` = its folder, reading knowledge over MCP.
  Latency shape, silence as a first-class outcome, the send tool bound to its chat.
- **Chat folders as runtime instances.** config + mandate + skills + notes, hot-reloaded.
- **Background agents.** The reflector MCP; jobs off-thread; results as receipts.
- **Eval-driven development.** Cases as directories, deterministic assertions first, judge
  only for voice, cases mined from production, replay offline. See `grills/002`.
- **Email as a second `ingest` source.** The architecture must already accept it.
- **The Root.** Whatever writes configuration when doing it by hand becomes annoying.
- **Disclosure.** What may be *said* where. Becomes real the day the mouth arrives.
- **Other people's installs.** Not everyone is a CTO; the schema and the config have to be
  extensible by a non-engineer.

---

## Research queue

Answer before the section that depends on it — not before.

| Question | Blocks | Notes |
|---|---|---|
| What did the MCP spec actually change? | Background agents | Statelessness; better with many agents on many servers. **Read the spec — do not design from memory.** |
| How does Pi take per-session MCP config? | Chat folders as instances | email-pa sets `enableMCP: false` deliberately after a stray server polluted a client dir |
| Schema coverage for a whole domain | Section 1, partly | Six types drafted; needs business, code, calendar, and per-install extension without going open-ended |
| Does OK's `search` hold up at thousands of docs? | The mouth | Index-as-judgement is fine either way; retrieval ranking is the question |

---

## Handoff — resuming in a fresh context

Read in this order. Do not skip 4; it prevents rebuilding things that already exist.

1. `README.md` — the map
2. `thesis.md` — what Ambient is, the category, the seven opinions
3. `product.md` — the nouns; **Settled and Open at the bottom are the current truth**
4. `research/open-knowledge.md` — **the substrate. A large amount of apparent product
   surface is already solved here.**
5. `knowledge-flow.md` — mechanical vs reasoning, media, the schema, `now`
6. This file — where we are

`kernel.md` is history and lessons; it defers to the above by its own precedence line.
`grills/` are dated records — `002`'s harness proposal is superseded, its four decisions
stand.

**The three things most likely to be re-litigated by a fresh context, already decided:**

- **`cwd` is the chat's own folder.** That is what scopes its skills and its writes. It
  does not conflict with one shared knowledge base, because OpenKnowledge is addressed over
  MCP, not by filesystem path.
- **The knowledge base and the chat folders are separate trees.** A chat folder is a
  runtime instance directory, not knowledge, and sits outside the OK content dir.
- **No separate graph store.** Entities are OK documents with typed frontmatter. The
  ported ontology tool is a validator, a queue and an indexer — never a CRUD layer, because
  OK already is one.

**The method, which is not negotiable:** operate it by hand until it is good, then automate
the loop that does it. Pi comes last, not first.
