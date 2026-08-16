# Grill 003 — What is the foundation, and what order do the areas go in

Date: 2026-08-16. Prompted by a roadmap draft that asserted an order without grilling it,
and put content before shape.

Shared terms: **skeleton** = home layout + CLI + config/schema validation; **intake** = raw
sync to disk, no interpretation; **harness** = Pi session construction.

---

## Q1 — What is in the foundation?

**The problem, in code.** The old repo already had this layer and it worked:

```
src/cli.ts       ambient init · doctor · activate · master
src/home/        1038 lines — initHome, scanMandates, scanAgents, scanAllSkills,
                 skillsForChat, scanConversationPrompt, DoctorReport, createMandateWatcher
```

`init` created the home idempotently; `doctor` re-derived health from disk with a non-zero
exit; `activate` scaffolded a chat folder and its mandate; scanners were fail-closed, so an
unknown key failed loudly. Meanwhile email-pa's equivalent —
`.agents/skills/email-pa/new-unit` — arrived **last**, after 92 wiki pages already existed,
which is why its conventions had to be retrofitted into content that predated them.

**What it touches**

| Dependent | Why it cares |
|---|---|
| Every later area | They all write into the layout |
| `ambient doctor` | Can only check conventions that are expressed as code |
| Other people's installs | A non-engineer needs `init` to produce a correct home |
| The schema | Fail-closed validation is what stops the model extending the vocabulary |

**The options**

```
A — Layout + CLI + config/schema only. No data. `init`, `doctor`, `chat add`,
    `agent add`, validation. Nothing reads a message.

B — A + intake. The skeleton AND the whatsappd adapter, stopping at raw
    transcripts and hash-addressed blobs on disk. Real data, no interpretation.

C — Thin vertical slice. A minimal version of every area end-to-end, then
    deepen each.
```

**You do X → what happens**

| Scenario | A | B | C |
|---|---|---|---|
| Layout turns out wrong once real data lands | revise, nothing built on it yet ✅ | caught inside the same area ✅ | already have knowledge + speaker on it ❌ |
| Conventions retrofitted afterwards | no ✅ | no ✅ | **yes — the email-pa mistake** ❌ |
| Time to something inspectable | fast, but empty | fast, and real | slow, and thin everywhere |
| Designing the layout against nothing | **yes** ⚠️ | no ✅ | no ✅ |
| Area boundary is clean | ✅ | ⚠️ two concerns | ❌ none |

**Rubric**

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ⚠️ nothing to look at | ✅ real transcripts on disk | ⚠️ thin everywhere |
| Reversibility | ✅ | ✅ | ❌ |
| Blast radius | ✅ | ✅ | ❌ touches everything |
| Correctness | ⚠️ shape designed in the abstract | ✅ shape meets real data early | ✅ |
| Fit | ✅ shape-before-content | ✅ | ❌ inverts the stated lesson |

**Recommendation: A, with B immediately after as its own area.** Keeping them separate
keeps each gate sharp — *"init produces a home doctor calls healthy"* and *"real messages
land on disk in that shape"* are different claims. C is rejected outright: it is how
conventions get retrofitted, which is the failure being avoided.

---

## Q2 — Where do the harness and evals sit?

**The problem, in code.** email-pa's `harness/run.ts` (~250 lines) came **last**, after the
`bin/` scripts and the skills already worked in a terminal. Its own README: *"All judgement
lives in the SKILL files, not here."* The old repo did the reverse — the harness and its
four service loops came first, and the knowledge never caught up.

**The options**

```
A — Harness after knowledge (5 after 4). Claude Code + a human IS the harness
    during the knowledge area; the code harness automates passes that already work.
B — Harness before knowledge (5 before 4). Everything after runs under it.
C — Harness alongside intake, because media processing needs a runner anyway.
```

**You do X → what happens**

| Scenario | A | B | C |
|---|---|---|---|
| A pass turns out to need different steps | change a skill, no code ✅ | change code + skill ⚠️ | ⚠️ |
| Media processing needs to run | plain scripts calling models — **no agent loop needed** ✅ | ✅ | ✅ but overbuilt |
| Harness designed against real passes | ✅ | ❌ guessed | ❌ guessed |
| Matches the proven method | ✅ verbatim | ❌ inverts it | ❌ |

**Recommendation: A.** Media processing is deterministic invocation of models — speech to
text, image to description — and needs no agent loop, which removes C's only argument. B is
what the old repo did.

**Evals start at area 5**, the first point where there is machine behaviour to assert.
Before that the assertions are `lint` and schema validation, which area 1 already owns.

---

## Outcome

Nine areas. Order **1 → 2 → 3 → 4 → 5 → 6 → 7 → 8, evals from 5.**

| # | Area |
|---|---|
| 1 | Skeleton — layout, CLI, config + schema validation |
| 2 | Intake — whatsappd, sources, allowlist, raw sync |
| 3 | Media processing — STT, vision, extraction |
| 4 | Knowledge — OK project, ontology tooling, hand-operated passes → skills |
| 5 | Harness — Pi session construction, receipts |
| 6 | Loops — triggers, cadences, lease, jobs |
| 7 | Capabilities — chat instances, reflector MCP, background agents |
| 8 | The mouth |
| 9 | Evals — cross-cutting, from area 5 |
