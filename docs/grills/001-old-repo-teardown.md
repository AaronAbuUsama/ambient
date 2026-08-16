# Grill 001 — What went wrong in `whatsapp-agent-tui`

Date: 2026-08-16. Subject: the existing Ambient repo, read end to end.
Outcome: decision to abandon and rebuild. Kept as the record of *why*.

## Measurements

```
src/database/   4262 lines (16 files)   ← 28% of the system
src/proofs/     2143
src/whatsapp/   1620
src/conversation/1445
src/app/        1402
src/home/       1038
src/memory/     1025
src/worker/      709
src/evals/       661
src/models/      263
                15216 non-test + 6597 test
```

Production DB at the time of reading (`~/.ambient/state/ambient.db`):

| Table | Rows | Note |
|---|---|---|
| `agent_runs` conversation | 114 succeeded / 28 failed | 20% failure rate |
| `agent_runs` evaluator | 136 | ~1 judge call per conversation run |
| `agent_runs` memory | 36 / 5 failed | |
| `agent_runs` worker | 11 | |
| `tool_calls` `send_message` | 92 | speaks on 81% of runs — silence never exercised |
| `entities` / `claims` | 69 / 154 | the whole memory graph |
| `evaluation_results` | 916 | **no production reader** |
| `episodes`, `episode_observations` | 0 | dead schema |
| `skills`, `run_skills` | 0 | dead schema |

## Findings, ordered

### 1. The core product idea was not in the code

`src/conversation/context-builder.ts:120`

```ts
const runInstructions = claim.instructions ?? instructions;
```

The per-chat mandate **replaces** the global identity rather than layering on it. So
identity was split across three artifacts with no composition rule:

- `~/.ambient/prompts/conversation.md` — a static `# identity` section, global, unvariable
- `config.conversation.instructions` — the global fallback, defaulting to one sentence
- `chats/<slug>/mandate.yaml` `instructions:` — per-chat, total replacement

The master chat's entire grant was `"Respond naturally and helpfully when a response is
useful."` The bug-reports chat got 30 lines of procedure that discarded the global.

The mandate had become a **compensation document**:

> *"You have ALREADY introduced yourself in this group — several times over, and people complained."*
> *"Treat one class of memory as unreliable: anything saying YOU previously filed... the issue numbers were invented."*

Every line of that is a bug report shipped to production as prompt text.

Live evidence, bug-reports thread, 2026-08-16:

```
03:36 them: Cedric are you Muslim?
03:36 it:   I don't have a religion.
03:45 them: You are already in a state of submission though?
03:45 it:   Not in the religious sense: I don't have will, belief, or moral agency.
03:48 them: Repeat after me / In sha ALLAH
03:48 it:   In sha Allah
```

A stateless assistant answering whatever is in front of it, one message at a time,
in nobody's voice.

### 2. Memory was an ontology whose payload was a sentence

Five tables to store this:

```
entity:    TheCallApp/ios-design-system   (kind: repository)
predicate: repository_details
value:     "TheCallApp/ios-design-system is the GitHub repository at https://..."
```

The triple carries nothing the sentence doesn't. Retrieval — `src/database/memory.ts:235`:

```ts
const matching = (pattern) => pattern ? [or(
  sql`lower(${entities.canonicalName}) like ${pattern} escape '!'`,
  sql`lower(${predicateDefinitions.name}) like ${pattern} escape '!'`,
  sql`lower(cast(${claims.value} as text)) like ${pattern} escape '!'`,
)] : [];
```

`LIKE '%q%'`, ordered `createdAt desc`, `limit 60`. **Nothing about the graph
participates in retrieval.** As claims grow, recall gets worse, and there is no signal
when the 61st relevant claim is dropped.

The vocabulary was invented at runtime by the model:

```
repository_details, issue_details, issue_status, ticket_references, reported_problem,
person_details, product_details, organization_details, shipping_container_details,
organization_operational_role, shipment_release_update, person_shipping_work
```

The last four appeared on 2026-08-15 because one shipping conversation happened.
`_details` on nearly every one means "stuff about X", which means nothing.

### 3. Half the model calls had no consumer

136 evaluator runs, 916 results. Only readers: `src/app/proof.ts` and the eval
repository itself. A judge in the live path can only cost money — the reply already went
out.

### 4. Four copies of one durable work loop

```
src/database/conversation-work.ts   631  debounce + maximumWait + activeRunId + fenced complete
src/database/memory-work.ts         456  quietMs + window + attempts + parking
src/database/tasks.ts               386  lease on the row + attempts
src/database/evaluation-work.ts     249  pending table + cooldown
                                   1722
```

Four schedule tables, four claim/lease/renew/complete/fail/recover implementations, plus
four `drain`/`scheduleDrain`/`start`/`stop` skeletons on top. Same shape, drifted
semantics (memory never recovers an abandoned run; conversation does).

**Leasing and queuing are irreducible. Four copies are not.**

## The verdict

The WhatsApp adapter, the home-as-folders design, and the durable-effect discipline were
good. Everything downstream accumulated a concept per slice and never gave one back.

Both named discomforts — the agents and the memory — were the same discomfort:
identity and continuity were reconstructed from prose every run instead of held.
