# ADR 004 — A Transcript line is a discriminated union on Provenance

**Status:** Accepted · **Date:** 2026-08-17 · **Slice:** IMPORT

**Written after the code, and that is the finding.**
[seams.md](../design/seams.md) reserves `DESIGN-IT-TWICE` for an interface *"written through
by many callers **and** hard to change later"*. `transcript` met both clauses — two Readers
plus KNOWLEDGE, and a line format now on **13,134 lines on disk** — and got one design,
authored inside a grill round, with no alternative written down. This ADR supplies the
missing comparison against the shipped shape, so a future reader can calibrate how much to
trust it.

---

## Context

Two Readers converge on one Write path ([ADR 003](003-history-import-is-an-archive.md) §4).
They do not carry the same facts, and the difference is **structural, not incidental**:

| Envelope fact | Archive | Live account |
|---|---|---|
| sender identity | a display label, e.g. `Rex` | `{ id, mode: "lid" \| "pn", alt? }` |
| message id | absent | present |
| reply edge | **0 in 13,134** | `quoted { id, from }` |
| mentions, reactions | absent | present |
| edits, deletions | 334 / 61 | present |
| Wall clock + Zone | required — the source names no offset | meaningless; it carries an Instant |

The question the format must answer: **can a reader tell "this message had no reply" from
"this Reader cannot see replies"?**

## The alternatives

**A — one flat shape, optional fields.** Every field optional; absent means either.

```ts
{ at, wall?, zone?, id?, who, text, quoted?, mentions?, media? }
```

**B — a union discriminated on Provenance.** Each variant carries only what its source has.

```ts
| { from: "archive"; kind: "message"; wall; at; zone; who: { label }; text; … }
| { from: "archive"; kind: "event";   … }
| { from: "live";    kind: "message"; at; id; who: { id; mode; alt? }; quoted?; … }
| { from: "live";    kind: "reaction"; at; target; emoji }
```

**C — one shape plus a capability descriptor**, naming per line which fields the source could
have supplied.

## Graded

| Axis | A | B | C |
|---|---|---|---|
| Distinguishes unknowable from absent | ❌ impossible | ✅ **unrepresentable by construction** | ⚠️ possible, but by convention a compiler cannot check |
| Dead fields per line | 4 on every live line | none | a descriptor on every line, ~43k of them |
| Cost to a consumer | one shape to learn | a switch on `from` — which KNOWLEDGE must do anyway, since *known* and *witnessed* are different claims | two things to learn, and their agreement to trust |
| Fit with [errors.md](../rules/errors.md) | ❌ the "optional-field state machine" it names | ✅ | ⚠️ |
| Reversibility | — | adding a variant is additive | a descriptor vocabulary is forever |

## Decision

**B.** The rule it encodes, which is the whole point:

> **Unknowable from this source = the field is absent from that variant's type.**
> **Absent = optional within a variant that has it.**

`raw` is preserved on every Event line, and the Archive's own `_chat.txt` is kept as the
primary source, so a classification we get wrong is re-readable without a re-export.

## Consequences

- KNOWLEDGE switches on `from`. That is not ceremony: *known* and *witnessed* are different
  claims and `product.md` requires the distinction.
- The live variants exist before anything produces them. **This is the cost, and it was
  taken knowingly**: declaring both halves now is what stops the second Reader inventing a
  parallel format. It also means the conformance rule in
  [slices.md](../rules/slices.md) flags them until INGEST lands.
- Reactions, edits and deletions arrive after their message on whatsappd's `Update` stream,
  so they are their own line kind. Rewriting a line to attach a reaction would break
  append-only, and therefore idempotency.

## What would falsify this

1. **KNOWLEDGE finds the switch on `from` costly at every call site.** Then the union is at
   the wrong altitude and a lifted accessor is the fix, not a flatter line.
2. **A third Reader shares no fields with either variant.** The union grows by one and stays
   correct — but three variants sharing nothing means Transcript was never one format.
3. **INGEST discovers the live variants are wrong in shape**, having been written without a
   producer. Most likely of the three. It is an amendment here, not a rewrite.

## Amendments

### 1 · 2026-08-18 — `LiveReaction` is state on its message, not a line

**Falsifier 3 fired, and it was the one this ADR called most likely.** The live variants
were written without a producer. INGEST built one, and two of the three were wrong.

**What changed.** `TranscriptLine` was `ArchiveLine | LiveMessage | LiveReaction`. It is now
`ArchiveLine | LiveMessage`, and `LiveReaction` is the shape of an entry in
`LiveMessage.reactions` — `{ subject, emoji, by?, at? }`, with no `from`, no `kind` and no
`target`, because a reaction that lives on its message needs none of them.

**Why the body above is wrong on this point.** Its Consequences say:

> Reactions, edits and deletions arrive after their message on whatsappd's `Update` stream,
> so they are their own line kind. Rewriting a line to attach a reaction would break
> append-only, and therefore idempotency.

Every clause is true of the **event log**, and `channel` does not read the event log. It
reads the **mirror**, which is current state ([ADR 005](./005-channel-binds-to-the-durable-runtime.md)):
a removed reaction is filtered out of the record, a changed emoji replaces in place, an edit
has already replaced the content and a revoke has already replaced the arm. Measured, not
argued — `docs/planning/ingest/findings/07-backends-and-the-mirror-read.md` §5.

So there is no trail to append and nothing to rewrite. A re-read produces the same line, and
`writeTranscript`'s merge already handles a changed one. **Append-only survives; what was
wrong was the premise that reactions arrive separately at all.**

**What this cost, and what it bought.** A public type with no production call site shipped
for two days and turned out to model the wrong stream. That is precisely the defect INGEST
was written to close, so it closes it on itself rather than shipping a second one. Ticket
[`04`](../planning/ingest/issues/04-ingest-a-chat.md) made the choice explicit: give it a
producer or delete it.

**What survives.** The decision — a union on provenance, with unknowable fields *absent*
from the variant rather than optional in it — held on contact. `from: "live"` lines now
exist, `keyOf` still keys them by message id, and the Archive half is untouched. The three
`LiveMedia` states beyond `Stored` were all reached by real records.

**Still unproduced:** `LiveMedia`'s `Expired` arm. `channel` maps a Source `failed` record
to `Failed`, and nothing yet distinguishes an expiry. Left declared, and named here so it is
not mistaken for something with a producer.
