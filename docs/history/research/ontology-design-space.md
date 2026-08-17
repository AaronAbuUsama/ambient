# The ontology design space — what the traditions offer, what email-pa measured

Date: 2026-08-17. Sources: the public vocabularies (FOAF, Dublin Core, schema.org, SKOS)
and formalisms (RDFS, OWL, SHACL); `~/email-pa` counted rather than read — units
`tradeoasis`, `lavin`, `bernoullis`.

Read after [email-pa-teardown.md](email-pa-teardown.md), which this partly corrects, and
alongside [knowledge-flow.md](../../design/knowledge-flow.md), which it is written to
serve.

**Nothing here is a decision.** It is the space, measured where measurement was possible.

---

## 1. The measurement, first

The teardown says of email-pa's schema:

> Seven types, seven relations, closed. The model **picks from** the vocabulary; it cannot
> invent one.

That is not what happened. Counted from `memory/ontology/graph.jsonl`:

```
tradeoasis    create 1880 · relate 29 · retract 3 · malformed lines 0

types used    Price 1353 · Document 494 · Organization 26 · Person 5 · Account 2
types dead    Thread 0 · Deal 0 · Commitment 0
```

Three facts fall out of that, and each one is load-bearing.

**`Price` is not in `schema.yaml`.** The single most numerous type in the graph — 72% of
all entities — is undeclared. The vocabulary was not closed; nothing closed it.

**Three of seven declared types were never instantiated.** Including `Commitment`, which
[knowledge-flow.md:151](../../design/knowledge-flow.md) currently calls *"what a PA
actually tracks"* and which Ambient has ported as a central type.

**Properties drifted by 5×.** `Document` declares 13 properties and carries 63.
`Organization` declares 4 and carries 30:

| Type | Declared | Measured | Examples of what appeared |
|---|---:|---:|---|
| `Document` | 13 | **63** | `container_reference_location`, `document_quality_question`, `reviewed_full`, `prepared_via`, `last_free_day` |
| `Organization` | 4 | **30** | `out_of_hours_imports`, `sea_freight_badges`, `contact_attribution_question`, `phone_profile_source` |
| `Person` | 6 | 6 | declared `notes`, wrote `note` |
| `Price` | — | 8 | the type itself is undeclared |

`Person` is the tell. It is the one type that did not drift, and even there the model
wrote `note` where the schema said `notes`. A single character, and nothing noticed —
because **nothing reads `schema.yaml`.** No script in `bin/` mentions it. The closed
vocabulary existed in a prompt and in a human's intention, and neither is a mechanism.

This is exactly the failure the teardown attributes to Ambient's EAV graph
(`shipping_container_details`, `person_shipping_work`). It happened in the "closed"
system too, at the same magnitude. The difference was documentation, not enforcement.

### The relations were never used

```
declared 7 · used 3 · works_at 4 · issued_by 24 · has_agent 1   (has_agent undeclared)
```

**29 edges across 1880 entities.** The graph part of the knowledge graph is dead weight.
Relationships were expressed as *properties* instead — `Person.org` as a string,
`Document.counterparty` as a string — because a property is one call and a relation is
two, and nothing ever asked the model to normalise.

This is a much harder number than the people-count argument the teardown used for
*"the ontology carries over; a separate graph store does not"* ([knowledge-flow.md:26](../../design/knowledge-flow.md)).
The conclusion stands and is now measured: **1.5% of the graph is graph.**

### And correction never happened

`retract` fired 3 times in 1883 ops. A later `create` on the same id silently merges over
the earlier one, so there is no record of *"we believed X and were wrong"* — only the new
value. Nothing prompts a retraction, so nothing retracts.

---

## 2. The law all of this obeys

> **Whatever the deterministic layer does not create or count, does not happen.**

Seven independent measurements, one mechanism:

| Thing | Deterministic support | Outcome |
|---|---|---|
| `Document` | `bin/extract` stubs one per attachment at `status: unreviewed` | **494** |
| `Price` | `bin/prices --load` creates them | **1353** — and undeclared |
| `Person` | nothing stubs | **5** |
| `Commitment`, `Thread`, `Deal` | nothing stubs | **0** |
| relations | nothing creates | 29 |
| `retract` | nothing prompts | 3 |
| `[assumed]` in prose | `bin/wiki now` **counts** it and surfaces it | **29 across 93 pages** |
| `[conflict: …]` in prose | declared in the skill; nothing counts it | **0** |

The last two rows are the cleanest natural experiment in the repo. Both conventions are
declared in the same file, in the same paragraph of `ontology/SKILL.md`, addressed to the
same model. One is counted by a generator. One is not. Usage: 29 versus zero.

This is the same law the repo already states as *"a convention nobody enforces is a
hope"* ([artefacts.md:38](../../rules/artefacts.md)) — but the enforcement that matters
is not only rejection. **Creation and counting are enforcement.** A type nothing stubs is
as dead as a rule nothing checks.

**Corollary, and it is the most useful sentence in this document: a type with no
mechanical stub-creator should not be in the schema.** It is a wish, and it will measure
zero.

### What the drift was actually asking for

The 63 properties are not junk. Sorted, a pattern appears — the model repeatedly invented
places to put *epistemic and workflow state*:

```
confidence · needs_review · review_flagged · review_reason · reviewed_full
resolution · resolved · document_quality_question · sensitive
contact_conflict · contact_attribution_question · status_note
source · phone_profile_source
```

Thirteen invented properties, across three types, all saying one of four things: **how
sure am I · who should look at this · what does this contradict · where did I get it.**
The schema gave it one `status` enum and no answer to any of the four, so it carved them
out of the property namespace at runtime.

`confidence` is the sharpest case: the ontology skill declares `confidence: high|medium|low`
for *wiki page frontmatter*, and the model pushed it down into the *graph*, per-fact, where
it was never declared. It wanted a per-value facet and only had a per-page one.

**The drift is a feature request log written in the wrong place.** That reframes what
`lint` is for. A validator that only rejects would have deleted this signal thirteen times
and taught us nothing.

---

## 3. The flow — what runs, what decides, and where the ontology sits

### email-pa, as measured

```
bin/sync          det    IMAP → Maildir, notmuch index
bin/extract       det    attachment → file + .txt; CREATES Document stub @unreviewed
bin/classify      det    rules from classify-rules.toml → counterparty attribution
                  ───────────── the queue: bin/docs next --limit 20 ─────────────
daily (cheap)     model  fill doc_type/ref/amount/due · harvest entity facts → bin/docs set
bin/prices        det    price lists → CREATES Price entities
bin/wiki links    det    regenerate <!-- DOCS --> blocks inside authored pages
bin/wiki index    det    regenerate the catalogue of one-line summaries
weekly (max)     model   read the week + every prior report → narrative → episodes,
                         dossier updates, propose merges, surface [assumed]
bin/wiki now      det    the fold: open items, counts, coverage, unresolved questions
```

The split is enforced by *cost*, not by taste: `daily` runs on a cheap model at low
thinking and is instructed to stop when the queue is empty — *"a quiet day should be
cheap"*. `weekly` runs at max. Anything in `daily` that starts needing judgement is
explicitly told to move to `weekly`.

**The ontology sits in exactly three places, and none of them is retrieval:**

1. **The shape of the stub.** `bin/extract` decides what an unreviewed `Document`
   carries. The schema determines what a mechanical pass can honestly assert.
2. **The contract on the fill.** What the model may write back through `bin/docs set`.
3. **The input to the generators.** `now.md`, the dashboards and the index are folds over
   typed fields. This is the only thing the graph's 1880 rows are actually *for*.

**How the agent reads.** Not by query. `wiki/index.md` is a generated catalogue where
every line is a page's own `summary:` — and every summary is judgement, not metadata. One
file read tells the agent which of 93 pages to open. The graph answered *counts* for
generated pages; the model never traversed it to find anything.

That is worth stating flatly because it retires a lot of speculative work: **the ontology
is a write-discipline and a queue. It is not the retrieval path and not a reasoning
substrate.**

### The two things both called "reasoning"

Before the Ambient flow, the distinction the whole design turns on. The word does double
duty in this field and conflating the two is what makes the architecture unclear:

```
INTERPRETATION   "yeah I'll get it to you Friday"  →  Commitment{what, who, due}
                 irreducibly a model. no rule does this, ever.
                 this is where knowledge is CREATED.

ENTAILMENT       Commitment{due, status: open} ∧ today > due       →  overdue
                 Account{handle} = Account{handle}                 →  same entity
                 Invoice ⊑ Commitment                              →  visible to commitment queries
                 must be sound. must be a script.
                 this only PROPAGATES what was already asserted.
```

An OWL reasoner does **only the second**. It cannot read a message. So "a reasoner builds
the knowledge" is the wrong shape: the model builds the knowledge, and entailment closes
over it afterwards. Every architecture question gets easier once these are named apart.

### Which layer is truth

A tempting inversion, worth naming so it is not made by accident: *the graph is truth and
the pages are generated from it.* That kills the product. A human who spots an error and
fixes the page loses the fix on the next regeneration, and the entire reason for
OpenKnowledge is that a human can co-write.

**Documents are truth; the index is a disposable reflection** —
[knowledge-flow.md:131](../../design/knowledge-flow.md) already says so. The two coexist
inside one file with a marked boundary, which is email-pa's pattern 6 and the only part of
its storage design that scaled:

```markdown
## Position
Runs the Hull depot. Prefers voice notes to text. [assumed]     ← authored, human-correctable

<!-- COMMITMENTS -->   generated from typed frontmatter. do not edit.
- 2026-08-22 · pallet pricing · open (4d)
<!-- /COMMITMENTS -->
```

Two authors, one file, neither can rot the other.

### The line is envelope versus content, not script versus model

*Deterministic* is too coarse a word and using it hides a real distinction. A phone number
is the clean illustration: as a sender JID it is **certain**, because the protocol handed it
over as a field; typed into a message body it is **a guess**, because something had to find
it in prose. Same data type, opposite reliability, and the only difference is where it came
from.

That gives three tiers, and what separates them is not the technology but **what each is
permitted to assert**:

| Tier | Source | Can it be wrong? | May assert |
|---|---|---|---|
| **Given** | the envelope — a field in the transcript or container: JID, LID, message id, timestamp, quoted-message id, blob hash, mime, byte length, group membership events | **No.** Nothing was decided; a field was read | a fact, directly |
| **Proposed** | a pattern over content — a URL regex, a phone-shaped string, a date-shaped string | **Yes, both ways.** It fires inside quoted code and misses `issue 123 in the api repo` | a **stub at `unreviewed`** — never a fact |
| **Interpreted** | a model reading content | Yes, and it knows it | a fact **with `confidence` and `sources`** |

The middle tier is where the worry lives, and it dissolves once the tier is only allowed to
propose. **Extraction does not need to be reliable, because nothing downstream trusts it.**
A regex firing on a URL inside a code block creates an unreviewed `Reference` that the
digest looks at and drops — cost: one line in a queue. It is a *recall* mechanism, not an
oracle, and its false positives are the cheapest failure in the system.

**And step 1 is not a filter.** This is the part that makes the fog: if stubs gated what the
model could see, weak extraction really would mean lost knowledge. They do not. The digest
reads the raw window as well as the stubs, so a missed `issue 123 in the api repo` is still
sitting in a sentence the model reads, and it can create the `Reference` itself. Step 1
improves recall and consistency. It never restricts step 2's inputs.

### What is actually inside "interpretation"

The word is vague enough to hide behind, so: given a window of messages and the documents
that already exist, the digest does exactly five things.

| # | Verb | Writes |
|---|---|---|
| 1 | **Resolve identity** — is this account a person; is this person that person | `Account.is`, new `Person`, `maybe_same_as` / `not_same_as` |
| 2 | **Characterise** — who they are, what this chat is for | `Person.name/role/org`, `Chat.purpose`, the prose body |
| 3 | **Extract obligations** — what was promised, by whom, by when | `Commitment` |
| 4 | **Adjudicate proposals** — was that regex hit real and does it matter | `Reference.status` |
| 5 | **Notice change** — what contradicts the page, what is newly true | episode lines, `[assumed]`, conflict flags |

Five verbs. Everything else in the seven steps is envelope-reading, validation, derivation
or rendering. That is the entire surface on which the system can be wrong in an interesting
way — which is also the entire surface worth writing evals against.

### Ambient, as planned — seven steps

Ingestion is two readers converging on one write path, per
[ADR 003](../../adr/003-history-import-is-an-archive.md): an **archive** (one-time, more
complete) and a **live account** (continuous). Everything downstream is identical.

```
0  INGEST      DET     archive zip  ─┐
                       live account ─┴→ transcript entries + content-addressed blobs
                       who sent what, when. zero judgement.

1  STUB        DET     every new sender → Account   @unreviewed
                       every new blob   → Media     @unprocessed
                       every new chat   → Chat      @unreviewed
                       ── this step IS the work queue. it decides what is ever
                          thought about at all. §2's law lives here. ──

2  INTERPRET   MODEL   media:  blob → transcript / description  (narrow models, own loop)
                       digest: window + existing docs → fill slots, write prose,
                               mark [assumed], propose identity links
                       ── the ONLY step that creates knowledge ──

3  CONSTRAIN   DET     lint: legal type · legal field form · required present ·
                       refs resolve · unknown field → queue, not reject (§6 R4)

4  DERIVE      DET     identity by declared key · subtype rollup · aging ·
                       counts, folds, coverage
                       ── the OWL-shaped step. small. sound. never a model ──

5  PROJECT     DET     index.md · now.md · generated blocks inside authored pages

6  SPEAK       MODEL   reads the projections. never queries the ontology.
```

**Two steps are the model; four are scripts.** By volume of knowledge almost everything
comes from step 2. By leverage the deterministic steps are doing four jobs a model cannot:
the queue (without it, nothing is worked on systematically), idempotence (without it the
same forwarded screenshot is described twenty times, differently), aggregates (a model
asked "how many open items" will guess), and cost (a quiet day should be free).

So *"the whole thing is built by a model with guardrails"* is accurate — provided
"guardrails" means a queue, a dedup key and a counter, not merely a validator.

Two differences from email-pa, both measured into existence by §1:

- **`lint` actually reads the schema.** email-pa's did not.
- **Step 1 stubs, and the queue forces the model's hand.** email-pa stubbed `Document` and
  got 494; it stubbed no people and got 5. The teardown reads that as *"the graph added
  nothing for humans"* — the measurement says it is a stubbing artefact.

---

## 4. The traditions — what each actually solves

None of these was designed for a private, accumulating store written by a model and
co-edited by one human. Each was designed for a different pressure, and the pressure is
what determines whether the idea transfers.

| | Built for | Transfers |
|---|---|---|
| **Dublin Core** | library cataloguing by non-cataloguers, 1995 | the *effort budget* as a design constraint; the dumb-down principle |
| **FOAF** | decentralised social graph, frozen 2014 | identifying-vs-descriptive properties; `Agent` as supertype |
| **schema.org** | crawler-tolerant markup, ~800 types | reified `Role`; a *pending* vocabulary staging area |
| **SKOS** | thesauri and concept schemes | match degrees that don't chain; `hiddenLabel` |
| **RDFS** | inference over triples | `subClassOf`, and one warning |
| **OWL** | decidable description logic | three constructs; the rest is machinery for a scale we don't have |
| **SHACL** | closed-world validation of graphs | **this is the family we are already in** |

### RDFS — and the warning

RDFS gives `rdfs:Class`, `rdf:type`, `subClassOf`, `subPropertyOf`, `domain`, `range`,
`label`, `comment`. Small and useful. But its semantics are the opposite of what a
validator needs, and this is the most commonly misread thing in the whole tradition:

> **`domain` and `range` are not constraints. They are inference rules.**

Declare `worksAt rdfs:domain Person`, then assert `acme worksAt beta`, and RDFS does not
raise an error — it *concludes that Acme is a Person*. Under RDFS semantics a schema
cannot be violated; it can only generate entailments. A system whose central promise is
that `doctor` rejects bad frontmatter cannot take its semantics from here.

What does transfer is `subClassOf`, for two jobs named later: the `Agent` supertype, and
giving per-install types a degrade path.

### OWL — three constructs, and a cost curve that doesn't apply

OWL 2 adds class expressions (intersection, union, complement, `oneOf`), cardinality
restrictions, property characteristics (`Functional`, `InverseFunctional`, `Transitive`,
`Symmetric`, `inverseOf`), identity assertions (`sameAs`, `differentFrom`), disjointness,
and tractable profiles (EL, QL, RL) beneath a decidable-but-expensive DL.

Its two governing assumptions matter more than its constructs:

- **Open World Assumption** — absence of a fact is not its negation. A reasoner cannot
  conclude "you have nothing due Friday", which is a thing this product must say out loud.
- **No Unique Name Assumption** — two identifiers may denote the same thing unless stated
  otherwise. This one is *correct* for us: two WhatsApp numbers may or may not be one
  human, and assuming difference is exactly the wrong default.

Ambient's `status: unreviewed` is a hand-rolled, per-record, actionable epistemic marker —
it separates *"we looked and there is nothing"* from *"we have not looked"*, which is what
OWA gestures at and never operationalises. It is better than OWA for this product because
it is also the work queue.

**Worth taking — three constructs, no formalism:**

- `owl:InverseFunctionalProperty` — the identity key. Declaring that a WhatsApp number
  identifies a person converts a judgement call into a computation, and simultaneously
  declares that `name` is *not* a key so nothing merges on it. This is the only piece of
  DL machinery that pays for itself here.
- `owl:differentFrom` — the negative identity assertion. Once a human rules that two
  Ahmeds are different people, that ruling has to be *recorded* or every subsequent digest
  re-proposes the same merge. email-pa proposes merges forever and remembers no rejection.
- `rdfs:subClassOf` — as above.

**Worth skipping, and why:**

| Construct | Why not |
|---|---|
| cardinality restrictions | `text` vs `text[]` and a trailing `?` already encode arity, in a notation a human reads at a glance |
| class expressions, `equivalentClass`, `disjointUnionOf` | solve classification at a scale we do not have. Twelve types, not fifty thousand |
| reasoners (HermiT, ELK, Pellet) | the entailments they compute are either trivial for a script or better done by the model. **There is no middle band for a personal assistant** |
| SPARQL | an LLM writing SPARQL against a personal store is strictly worse than reading a generated index page. email-pa settled this empirically |
| IRIs, namespaces, serialisation | cost with no consumer. Nothing is crawling a private knowledge base addressed over MCP |

OWL's value proposition was: encode enough logic that a reasoner derives what you did not
state. With a model in the loop, **the model is the inference engine** — far better at the
messy inferences (is this the same person? is this a promise?) and far worse at soundness.
The right split is deterministic code for what must be exactly right and is cheap, and the
model for what needs world knowledge. The DL-reasoner band in between is empty here.

### SHACL — the family we are already in

W3C 2017, built precisely because OWL could not validate. Shapes carry `sh:minCount`,
`sh:maxCount`, `sh:datatype`, `sh:in` (an enum), `sh:pattern`, `sh:class`, and —
decisively — **`sh:closed true`**, meaning *no properties beyond those declared*.

`schema.yaml` plus `doctor` is a hand-rolled micro-SHACL, and that is architecturally
correct rather than naive. Naming the family is worth something: it says email-pa's
13→63 drift is the exact failure `sh:closed` was invented to prevent, and it hands us one
more idea for free — **`sh:severity`**: `Violation`, `Warning`, `Info`. Not every
deviation should fail. Given that the drift was a feature request log, severity is the
difference between deleting the signal and reading it.

### The four vocabularies — the ideas, not the terms

Checked name by name, the public terms are not better than ours for this domain, because
they describe *published resources* and we describe a *live private pipeline*. The fields
that matter most here — `status: unreviewed`, `provenance: history|witnessed` — exist in
none of them, because no public ontology models work-in-progress. What transfers is design
moves:

- **Dublin Core — the effort budget.** Fifteen elements, chosen by what a non-cataloguer
  fills in ten minutes. The design constraint was *effort*, not expressiveness. The right
  size for `schema.yaml` is what one digest pass can honestly fill, not what is
  describable about a person.
- **Dublin Core — the dumb-down principle.** Every refinement must degrade to a base
  term, so a consumer that only knows the base still gets something true. Applied here:
  a per-install `Invoice` that declares itself a kind of `Commitment` stays visible to
  every generic commitment query. Without it, *"add types freely"* means *"add types
  nothing can see"* — and per the law in §2, invisible means dead.
- **Dublin Core — the one-to-one principle.** One record describes one resource; never the
  painting and the photograph of it together. Media walks straight into this: a doc about
  a screenshot is about a *file* (hash, codec, duration) and about *what it depicts* (a
  conversation, a date, people). Collapsing them files a voice note's transcript under its
  codec.
- **FOAF — `Agent` as the honest supertype.** Sometimes you know something *acted* and not
  whether it was a person or a business: a WhatsApp Business account, a shared team
  number, a group that behaves as one counterparty. Without `Agent`, the *mechanical* stub
  pass is forced to make a *reasoning* call at first contact — the exact line
  [knowledge-flow.md:59](../../design/knowledge-flow.md) draws.
- **schema.org — the reified `Role`.** `person → memberOf → Role{start, end} → org`
  instead of a bare edge, so time attaches to the relationship. `org: ref?` holds only the
  current answer and destroys the previous one on update, in a store whose whole value is
  that it accumulates.
- **schema.org — `pending.`** A staging namespace where proposed terms live before
  promotion. The model cannot extend a closed vocabulary, but it can *propose*; and §2
  says it will propose whether or not we give it somewhere to do so.
- **SKOS — matching has degrees and does not chain.** `exactMatch` versus `closeMatch`,
  with closeMatch explicitly non-transitive. That is the precise failure mode of naive
  merging: A≈B, B≈C, therefore A=C, and three people become one.
- **SKOS — `hiddenLabel`.** Searchable, never displayed; it exists for misspellings and
  OCR garbage. WhatsApp is a firehose of these — `ZEESHAN BHAI`, `Zeshan`,
  `zee (plumber)`, transliterations, autocorrect. One `aliases[]` conflates *"also known
  as"* with *"typo we have seen"*, and only one of those should ever render.

### The older lineage

- **Frames (Minsky, 1974).** A frame is slots; each slot has a default and a *demon* — a
  procedure that fires when it is filled or needed. That is [knowledge-flow.md:30](../../design/knowledge-flow.md),
  *mechanical creates slots, reasoning fills them*, rediscovered from first principles and
  correct. The piece not yet present is **slot facets**: a slot holding a value *plus*
  metadata about the value. §2 shows the model demanding exactly this, thirteen times.
- **CYC — microtheories.** Assertions are true *within a context*; contexts are first-class
  and may contradict each other. A personal assistant is drowning in this. What your
  sister says about a supplier and what the supplier says about themselves are both data,
  they conflict, and collapsing to one truth is the wrong operation. email-pa's answer was
  a prose marker `[conflict: …]` — which measured **zero**, because nothing counted it.
- **PROV-O.** Entity / Activity / Agent, `wasGeneratedBy`, `wasDerivedFrom`,
  `wasAttributedTo`. `source: enum(history|witnessed)` is the two-valued version.
  Provenance is really a *chain*: this claim came from that digest, which read that
  window, which came from that sync. Debuggability of a knowledge base is mostly this.
- **Wikidata — qualifiers, references, rank.** Every statement carries time bounds, a
  source, and a rank: preferred, normal, **deprecated**. Deprecated is the good one — you
  keep statements you now believe are wrong, marked wrong, so the same bad inference is
  not re-derived next month. email-pa retracted 3 times in 1883 ops and has no way to say
  *"we used to think this"*.
- **CIDOC-CRM — event-centrism.** No static properties at all; "this pot was made in
  Crete" is a Production event with a participant and a place. Everything gets a time and
  a source by construction. The cost is that a birthday becomes a three-node graph.
- **Topic Maps — scope, and subject identity in the model.** The road not taken versus
  RDF. Every assertion is scoped; merging is defined by identity rules rather than left to
  the application.

---

## 5. The forks that are actually open

**Is an entity a document you edit, or a view over events?** Everything in §4 about time
pushes toward events-with-roles. Everything in the current design says
documents-with-frontmatter, because that is what OpenKnowledge gives free and what a human
can co-write in a UI. The middle — events as the write path, documents as a materialised
read model — is a much bigger machine than *"a validator, a queue and an indexer"*.

**Where does contradiction live?** In the field (every value carries who said it), in the
document (parallel claim docs folded at query time), or in the queue (conflicts become
unreviewed items a human settles). Heavy-on-every-write, multiplies-documents, or
assumes-a-human-shows-up. The `[conflict]`-measured-zero result says whichever is chosen
must be *counted*, or it will not exist.

**Records at rest or triples at rest?** The reason RDF won for interchange is that a
triple carries provenance and contradiction per-fact, and records cannot. But frontmatter
is a record, deliberately, because a human edits it. The resolution already latent in the
design: **records at rest, triples on demand** — the derived index projects frontmatter
into whatever query shape the generators need, and storage never becomes triples. That
makes the existing index the answer to a question the design had not yet asked.

---

## 6. Recommendations

Ordered by evidence-per-pound. Every one is cheap; three are deletions.

**R1 — Enforce the schema. Already the plan; now it has a number.**
13 declared properties became 63 because nothing read `schema.yaml`. Ambient's `lint`
reading it is the single largest correction over email-pa. No change — confirmation.

**R2 — A type with no mechanical stub-creator does not ship.**
The strongest finding in §2. `Commitment`, `Thread` and `Deal` measured zero because
nothing created them; `Document` and `Price` measured in the hundreds and thousands
because a script did. Make it a rule on the schema: every type names the pass that stubs
it, or it is deleted. Applied to today's `schema.yaml` this immediately questions **`Issue`**
(nothing stubs it) and **`Commitment`** — no mechanical pass can detect a promise, so it
would be model-created, which is precisely the shape that measured zero. Either find the
stub (a `[assumed]`-style marker the digest emits, then swept mechanically) or cut the type
until MEDIA and INTAKE show what actually accumulates. **This is a deletion and it is the
most product-useful thing in this document.**

**R3 — Give the four epistemic questions declared homes, or the model will invent them.**
Thirteen invented properties all asked: *how sure · who should look · what does this
contradict · where did I get it*. Ambient answers the fourth (`source`) and half of the
second (`status`). The other two have nowhere to go. This does not need per-field facets —
the cheap version is a small number of declared fields carrying the same information, and
`[assumed]` in prose for the rest, **counted by a generator** so it exists.

**R4 — Make `lint` severities, not just failures, and keep a pending bucket.**
From SHACL. An illegal *field form* is a violation and fails `doctor`. An *unknown field*
on a known type is a warning that queues. The drift is a feature request log; a validator
that only rejects deletes the log thirteen times. One enum on a problem, one append-only
file — and the schema then grows from measured pressure rather than from a human guessing
before the data exists. email-pa's human guessed and produced three dead types and missed
the one that became 72% of the graph.

**R5 — Identity: mark which fields identify, and record negative rulings.**
Two constructs from OWL, both day-one problems for WhatsApp rather than someday problems.
The stub pass creates one Person per number, so a human with two numbers is two documents
on day one. Marking `numbers` as identifying makes the exact-match merge mechanical — a
script cannot be wrong about it — leaving reasoning only the genuinely ambiguous cases,
which *sharpens* the line at [knowledge-flow.md:59](../../design/knowledge-flow.md)
rather than blurring it. And a rejected merge must be recorded, or it is re-proposed every
week forever.

**R6 — Do not build the graph. Refs are properties.**
29 edges across 1880 entities. Already decided at
[knowledge-flow.md:26](../../design/knowledge-flow.md); now it has a hard number, and
`ref` / `ref[]` as *fields* is the correct shape.

**R7 — The deliverable of KNOWLEDGE is the generators, not a query language.**
The agent reads `index.md` and `now.md`; `ontology query` exists to feed those generators.
Nothing should be built for the model to query the ontology directly — email-pa ran 1880
entities through exactly this arrangement and the model never traversed the graph to find
anything.

**R8 — Solve time with an append-only episode log, not with reified roles.**
The `<!-- EPISODES -->` block is the measured mechanism that made email-pa's pages rich —
dated, append-only, generated region inside an authored page. It captures "how this
changed" without a schema redesign. Reified `Role` nodes are the correct model and the
expensive one; the log is the lazy version that already has evidence behind it.

**R9 — Skip the formalism.** No RDFS semantics (domain/range entail, they do not
constrain), no OWL reasoner, no SPARQL, no IRIs. Take `subClassOf`,
`InverseFunctionalProperty`, `differentFrom` as *ideas* expressed in the existing YAML.
We are writing micro-SHACL and should keep doing that.

### Parked, with the trigger that un-parks it

| Idea | Un-park when |
|---|---|
| Scope / microtheories | the first time two chats assert incompatible facts about one person and someone notices |
| Event-centric storage | entity pages start losing history that someone wanted back |
| Per-field facets (frames) | R3's small declared fields prove insufficient — measured, not assumed |
| Reified `Role` with time bounds | the episode log is being mined for structure by hand |
| Crosswalk to schema.org / JSON-LD | something outside Ambient wants to read the knowledge base |
| `hiddenLabel` split | alias lists start showing garbage in a UI a human looks at |

---

## 7. The schema that follows

### First, a correction: the archive stubs *more*, not less

An earlier reading of this said Ambient could honestly stub less than the current schema
assumes. That was wrong, and the measured archive says so —
[ADR 003](../../adr/003-history-import-is-an-archive.md), one chat, `Capxul Devs`:

```
13,117 messages · 19 months · 1,139 media files in the zip
sticker 22 · document 16 · poll 1 · location 1 · contacts 1
```

Everything in that list is mechanically knowable. So are: sender handle, every push-name a
sender ever displayed, first-seen and last-seen per account and per chat, group membership
events (*"X added Y"* is a system message in the export), reply/quote edges, reactions,
message counts, and response latency per pair.

The correct statement is narrower and sharper: **an inbound message proves an account
exists, not a person.** A phone number is an account. That two numbers are one human, that
an account is a person rather than a business or a shared team line — those are
interpretations, and the current schema's `Person.numbers: text[]` quietly assumes them at
stub time, forcing step 1 to make a step 2 decision.

So it is not *less* than assumed. It is **different**: fewer person-facts, far more
interaction-facts — and the current schema has slots for the former and none for the
latter.

### The shipped schema, reasoned from §2 and §6

Every type names the step that creates it. Nothing else ships.

```yaml
# ── stubbed mechanically at step 1. volume is guaranteed. ────────────────
Chat:
  jid:           text !identity
  kind:          enum(dm|group)
  name:          text?
  accounts:      ref[]
  first_seen:    date
  last_seen:     date
  message_count: number
  purpose:       text?                      # step 2 fills
  mode:          enum(ingest|speak)
  status:        enum(unreviewed|reviewed)

Account:                                    # a handle. NOT a human.
  handle:        text !identity
  service:       enum(whatsapp)
  push_names:    text[]                     # every display name ever seen — mechanical,
                                            # and the home for typos and shouting
  first_seen:    date
  last_seen:     date
  chats:         ref[]
  is:            ref?                       # → Person | Organization. step 2 fills.
  kind:          enum(unknown|person|org|service)
  status:        enum(unreviewed|reviewed)
  provenance:    enum(known|witnessed)

Media:
  hash:          text !identity
  mime:          text
  kind:          enum(image|voice|audio|video|document|sticker)
  bytes:         number
  duration_s:    number?
  from:          ref?
  chat:          ref?
  sent_at:       date
  status:        enum(unprocessed|processed|failed)
  processed_by:  text?
  provenance:    enum(known|witnessed)

Reference:                                  # an external artefact named in conversation.
  url:           text !identity             # PROPOSED tier — a regex hit, not a fact
  platform:      text?                      # github · linear · figma · sentry · …
  kind:          enum(unknown|issue|pr|ticket|doc|deploy|other)
  title:         text?
  first_seen:    date
  chats:         ref[]
  status:        enum(unreviewed|confirmed|dropped)
  provenance:    enum(known|witnessed)

# ── created at step 2, forced by a queue that step 1 built ───────────────
Person:                                     # queue: every unreviewed Account asks "who is this?"
  name:          text
  aliases:       text[]
  accounts:      ref[]
  org:           ref?
  role:          text?
  same_as:       ref[]                      # ruled identical
  maybe_same_as: ref[]                      # proposed with evidence → queued
  not_same_as:   ref[]                      # ruled distinct → stops re-proposal forever
  confidence:    enum(high|medium|low)
  sources:       ref[]
  status:        enum(unreviewed|reviewed)
  provenance:    enum(known|witnessed)

Organization:                               # same shape, + domain
  …

Commitment:                                 # queue: the digest receipt's `committed[]`
  what:          text                       # field forces the question every run
  who:           ref
  to:            ref?
  due:           date?
  sources:       ref[]
  confidence:    enum(high|medium|low)
  status:        enum(open|done|dropped)
  provenance:    enum(known|witnessed)
```

**Six types, down from seven.** What changed and why:

| Change | Driven by |
|---|---|
| **`Account` added**, `Person.numbers` removed | §3 — a message proves a handle, not a human. Lets step 1 stop guessing, and generalises to a second channel free |
| **`Issue` replaced by `Reference`** | R2 was applied wrongly the first time. `Issue`-as-a-described-problem has no stub-creator, but `Issue`-as-a-URL does: `github.com/o/r/issues/123`, `#456`, `ENG-789` are regex-extractable from message text, exactly as mechanical as a blob hash. The type is not "a problem" but "an external artefact named in conversation" — issues, PRs, tickets, docs, deploys — and it is **`Media` for URLs**: same shape, same reason, a fetch status where `Media` has a processing status |
| **`Commitment` kept, with a named forcing function** | §6 R2 said find the queue or cut it. The receipt's `committed[]` ([knowledge-flow.md:174](../../design/knowledge-flow.md)) already asks the question every digest run — that *is* the queue |
| `same_as` / `maybe_same_as` / **`not_same_as`** | §4 OWL — a rejected merge must be recorded or it is re-proposed weekly forever |
| `push_names` on Account | SKOS `hiddenLabel`, populated mechanically. Garbage lives on the handle; curated `aliases` live on the person |
| `confidence` + `sources` | §2 — the model invented these thirteen times. Give them declared homes |
| `source` → **`provenance`**, `history` → `known` | `dcterms:source` collision; and ADR 003 already calls an archive fact *known, not witnessed* |
| `first_seen` · `last_seen` · `message_count` | free from the archive, and the strongest mechanical signal of who matters |

**Two additions to the closed field vocabulary**, each with a named consumer:

```
number       message_count, bytes, duration_s — aggregates over text are wrong
!identity    marks a field as an identity key (OWL InverseFunctional).
             collision ⇒ same entity, mechanically, at step 4 — no judgement,
             and it simultaneously declares that `name` is NOT a key
```

**What is deliberately absent:** relations/edges (§1 — 29 across 1880), reified `Role`
nodes (§6 R8 — the episode log carries change instead), per-field facets (§6 parked), and
any external namespace or crosswalk (§6 R9).

### Concentration is not drift

A type that fires two hundred times in a bugs group and zero times in forty other chats is
not a schema problem. §2's test is *"does a mechanical process create one"* — not *"is it
used everywhere."* Uneven distribution across chats is what a correctly-scoped type looks
like; it is `Price` (72% of one unit's graph, absent from another) read the right way
round. The failure mode measured in §1 was types that reached zero **globally**, which is a
different thing entirely.

So the answer to *"should a type stay in the whole ontology if only one or two chats use
it"* is yes, and the cost of it sitting unused is a few lines of YAML.

### One schema per home, not per chat

The tempting next step — scope the schema per chat, so the family group is not told about
pull requests — should be resisted, and the reason is the product thesis rather than
tidiness. Ambient is *"one personality across many chats — knowledge is shared, disclosure
is per-chat"* ([email-pa-teardown.md](email-pa-teardown.md)). The person in the bugs group
is the same person as in the family group, and per-chat schemas fragment exactly the
identity the whole system exists to hold together. A `Reference` can be pasted into a DM;
a `Commitment` is made anywhere.

The unit of extension is therefore the **home** — one principal, one `schema.yaml` — which
is what [spec.md §3.4](../../planning/skeleton/spec.md) already decided with *users add
types, users cannot add field forms*.

### How it evolves: ship generic, promote under pressure

The question this leaves is what happens when a genuinely new domain arrives. The answer is
not to design for it in advance — a human guessing before the data existed is what produced
three dead types and missed the type that became 72% of email-pa's graph.

Ship the general type; let the specific one be earned. `Reference` covers issues, PRs,
tickets and docs on day one. If the bugs group generates real pressure for `assignee`,
`labels`, `milestone`, that pressure shows up as §6 R4 warnings in a pending bucket —
*measured*, with a count — and a refinement is promoted then:

```yaml
Issue:                       # per-install refinement, promoted from measured pressure
  is_a:      Reference       # ← the Dublin Core dumb-down principle: every generic
  assignee:  ref?            #   Reference query still sees these
  labels:    text[]
```

`is_a` is what stops per-install extension meaning *"add types nothing can see"* — the
degrade path is the difference between an extension and an orphan.

### One thing `Reference` must not store

Whether a GitHub issue is currently open is **not** a fact about the conversation; it is a
cached copy of another system's state, and it goes stale silently. email-pa's rule covers
this exactly: *write anything that will still be true in a year; never hand-write anything
that is only true this morning.*

So `Reference` stores identity, and what the conversation permanently established — *"Zeeshan
reported this on the 12th and nobody answered"* — while live state is fetched at step 5 and
rendered into a generated block. Stored: permanent. Generated: current. The same line that
separates the wiki from the graph.

---

## What this corrects

[email-pa-teardown.md](email-pa-teardown.md) §5 states the vocabulary was closed and the
model could not invent a type. Measured, it was neither: one undeclared type became 72% of
the graph and properties drifted 5×. The teardown's *conclusion* — that a hand-written
closed vocabulary is the right design — survives; its *evidence* does not, and the reason
matters, because the mechanism that failed is the one Ambient is relying on.

Its reading of the 4-people-versus-6-wiki-pages anomaly is also confounded: nothing stubbed
Person, so the number measures the absence of a script, not the unsuitability of typed
storage for humans.
