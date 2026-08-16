# How knowledge actually gets built

The sequence of events, and the line between mechanical and reasoning. Read after
`product.md`.

---

## The finding that shaped this

email-pa's graph, counted properly:

```
distinct entities:  Price 1353 · Document 206 · Organization 18 · Person 4 · Account 2
wiki people pages:  6
```

**The graph holds 4 people. The wiki holds 6.** It excelled at Prices and Documents —
mechanical extractions from PDF letterheads with amounts, refs and due dates — and
*undercounted humans*. And the properties its Person/Org rows actually carry are
`name, role, country, city, goods, org, email, note, vat, phone, eori, address, website`.

That is a contact card. That is frontmatter. **The people knowledge lived in prose pages
all along, and the graph added nothing for them.**

WhatsApp produces no Prices and few Documents. So the *ontology* — a closed type
vocabulary — carries over; a *separate graph store* does not.

---

## The shape: mechanical creates slots, reasoning fills them

The thing that makes email-pa work is not its store. It is that a deterministic pass
creates empty records with `status: unreviewed`, and a reasoning pass fills them in. **The
work queue is a frontmatter status.** `bin/docs next --limit 20` means "here are twenty
things needing judgement", which is what lets the daily skill say *"nothing queued → say so
and stop; a quiet day should be cheap."*

### Mechanical — no model, decides nothing

| Step | What it does |
|---|---|
| `sync` | whatsappd → `transcript.jsonl` per chat, media blobs to disk, cursor advances |
| `stub` | Every sender not yet known gets a Person doc at `status: unreviewed` carrying only what is mechanically knowable: number/lid, display name, first seen, chats seen in |
| `media stub` | Every new blob gets a Media doc at `status: unprocessed`, keyed by content hash |
| `lint` | Validate every doc's frontmatter against `schema.yaml` — legal type, required props, no forbidden props |
| `index` | Rebuild the derived index from frontmatter. Disposable: delete it and it rebuilds |

### Reasoning — model, bounded by what the mechanical pass queued

| Step | What it does |
|---|---|
| `process` (media) | Transcribe, describe, extract — see below |
| `digest` (per chat, cadence) | Read the window. Fill stubs, write prose, mark `[assumed]`, promote `status` |
| `synthesis` (weekly) | Narrative, cross-chat, what changed |
| `consolidate` | Fold what the speaker noticed into the knowledge base — `workflow({kind:'consolidate'})` |

### The dividing line

**Anything a script can be wrong about, a script must not do.**

- Deterministic: who sent what and when · which docs exist · which are unreviewed · schema
  legality · aggregate counts · every derived view.
- Reasoning: who a person *is* · what an org *does* · **whether two numbers are the same
  human** · what is outstanding and why · what to watch.

Identity merging looks mechanical and is not. email-pa's harness prompt says it outright:
*"Do not merge identities — propose with evidence."*

---

## Media is a first-class pipeline, not a footnote

WhatsApp is full of media, and most of it carries the actual content. A screenshot *is* the
bug report. A voice note *is* the instruction.

**Not every chat model can process any of it**, so processing is its own loop with its own
models — separate from the speaker, separate from the digest.

| Kind | Processing | Model |
|---|---|---|
| image | describe — what it shows, any text in it | vision |
| voice note | **transcribe** | speech-to-text |
| audio | transcribe | speech-to-text |
| video | frames sampled + described; audio track transcribed | vision + STT |
| document / PDF | text extraction, then summarise | text (extraction is mechanical) |

Three rules:

1. **Keyed by content hash.** The same forwarded screenshot in three chats is processed
   once. This is the one thing the old repo got right —
   the old repo's `media_descriptions` table cached descriptions per blob ref.
2. **The result is a document**, not a database row: a Media doc beside the blob, carrying
   the transcript or description as prose plus typed frontmatter. Which means it is
   searchable, linkable, citable, and correctable by hand like everything else.
3. **Both triggers exist.** A **loop** processes the queue in the background — that is the
   default and it is what makes the speaker fast. **Just-in-time** is the escape hatch:
   the speaker asks about a blob that is still `unprocessed` and can force it, accepting
   the latency, because "I can't see it yet" is a worse answer than a slow one.

Voice notes are the sharpest case: unprocessed, a voice note is *nothing at all* — no
caption, no text, an empty hole in the transcript. Transcription is not enrichment here, it
is ingestion.

---

## CRUD is not ours to build

Entities are OpenKnowledge documents, so create/read/update/delete already exist —
attributed, CRDT-safe, versioned, and co-writable by a human in the OK UI:

| Op | Tool |
|---|---|
| Create | `write({ document: { path, template: 'person' } })` |
| Read | `exec("cat people/zeeshan.md")` · `search` · `links` |
| Update | `edit({ document: { path, frontmatter: {…} } })` — merge-patch, `null` deletes a key |
| Delete | `delete({ document })` |

**So the ported ontology tool is a validator, a queue and an indexer — not a CRUD layer.**
Four read-only verbs, no writes:

```bash
ambient ontology lint                              # frontmatter vs schema — the closed-vocabulary guard
ambient ontology next --type=person --limit=20     # the work queue: status: unreviewed
ambient ontology index                             # rebuild the derived index from frontmatter
ambient ontology query "commitments due < 2026-08-23 group by owner"
```

Roughly 250 lines of TypeScript rather than email-pa's ~600, and **exactly one write path
for any fact**.

The derived index is option C from the grill: frontmatter is truth, the index is a
disposable read model built from it, and it exists only because "every open commitment due
before Friday, grouped by owner" is not something `grep` should answer.

---

## The schema — first draft

Closed vocabulary. Hand-written. The model fills it and never extends it; `lint` enforces
that. This is a draft to react to, not a decision.

```yaml
Person:        name | aliases[] | numbers[] | org | role | status | source
Organization:  name | aliases[] | domain | role | status | source
Commitment:    what | who | due | source_message | status
Issue:         title | platform | repo | number | status
Media:         hash | kind | from | chat | duration | status | processed_by
Chat:          name | participants[] | purpose | mode
```

- **`Commitment` is the WhatsApp equivalent of email-pa's `Document`** — the thing with
  values you need to *query* rather than read. It is what a PA actually tracks.
- **`Price` has no analogue here.** That is precisely why the graph shrinks.
- **`aliases[]` is how identity resolution works** — a maintained list, not fuzzy matching
  and not embeddings. Same as email-pa.
- **`source`** carries the provenance distinction that is ours rather than
  OpenKnowledge's: *learned from the principal's history* versus *Ambient witnessed it*.

**Open:** the schema must cover the whole domain, not just people and bugs — business,
code, calendars, whatever a given principal's life contains. It should be extensible per
install without becoming open-ended. Not yet designed.

---

## `now` is a fold over run receipts

Every invocation — speaker, digest, annotation, background agent — ends with a **typed
receipt**:

```
decided     what this run settled
open[]      questions still out, and who owes the answer
committed[] what was promised
watching[]  what would change the picture
noticed[]   candidates for the knowledge base
```

`now` is a **deterministic fold** over recent receipts plus derived counts. The judgement
is the agent's; the assembly is the machine's. It exists at both levels — per chat, and
globally.

This is what the old repo's free-text "private thought" was reaching for and missing.
Prose drifts and fabricates; typed fields are checkable, dedupe across runs, and settle by
id. It also generalises past the speaker, which is how the interior stays invisible from
outside while staying legible from inside.
