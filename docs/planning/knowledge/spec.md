# KNOWLEDGE — spec

**Slice:** KNOWLEDGE · **State:** specified · **Specified:** 2026-08-20

**The question this Slice answers.** 13,134 real messages are on disk and the knowledge base
holds zero documents. What turns the first into the second, and what is allowed to do the
turning?

## The frame

**What it is allowed to get wrong.** The *content* of any document. Every one is written at
`status: unreviewed`, is corrected by a reasoning pass or by hand, and is regenerable from
material that stays on disk. A wrong prose paragraph costs one edit.

**What it must never get wrong**, in the order the damage is unrecoverable:

1. **Claim presence it did not have.** All 13,134 lines are `from: "archive"` — *known*,
   never *witnessed*. `Person.source` is required, not optional.
2. **Merge two identities mechanically.** The collisions are in the data: two label pairs
   differ only by a leading `~ `. Proposing is mechanical; merging is judgement.
3. **Break the format.** The whole trade in [ADR 007](../../adr/007-knowledge-is-files-not-a-client.md)
   is that conformance is free. A document OpenKnowledge will not open costs this Slice its
   one external check — and it is that ADR's falsifier 1.
4. **Write something malformed.** The tool validates and **refuses**. This is what the
   OpenKnowledge MCP was kept for and it survives dropping it.
5. **Automate a pass before it is good by hand.** HARNESS automates what KNOWLEDGE proves.

## Problem Statement

`~/.ambient/knowledge/` holds `.ok/` and `.okignore` and **zero documents** — measured
2026-08-20, `find -name '*.md'`. Beside it sit 13,134 Transcript lines and 980 Blobs,
spanning 18 months of one engineering group chat.

`schema.yaml` ships six types, is validated for legality by `doctor`, and is **read by
nothing**: [`skeleton/spec.md`](../skeleton/spec.md) §3.4 says so in as many words —
*"used by nothing in SKELETON. KNOWLEDGE is where `ontology lint` reads it."*

Nothing in the repository can create, validate, queue or index a knowledge document.

## Solution

Two modules and four CLI verbs.

`knowledge` owns the base on disk — the layout, the frontmatter codec, validation, the work
queue and the derived index. It **validates on write and refuses**, so no caller can route
around the ontology. It depends on `home` and `failure` and nothing else, deliberately: it is
the module every later pass writes through, and the thing it must never grow is knowledge of
where its input came from.

`observe` owns the mechanical pass — Transcript Lines to Observations, minus what the base
already holds — and the order of the writes. **No model, no clock.**

```bash
ambient ontology lint                            # frontmatter vs schema.yaml
ambient ontology next --type=person --limit=20   # the work queue: status: unreviewed
ambient ontology index                           # rebuild the derived read model
ambient observe --from <slug>                    # Lines → Observations → documents
```

The shape is [`design.md`](./design.md) and is not restated here.

## User Stories

**As the principal, I point Ambient at a chat I have already imported and get documents.**
`ambient observe --from capxul-devs` walks 13,134 lines and writes one document per sender it
has not seen, each at `status: unreviewed`, each carrying `source: history`.

**As the principal, I ask what still needs my judgement.** `ambient ontology next
--type=person --limit=20` returns documents and nothing else. Nothing queued is a quiet day
and costs nothing.

**As the principal, I open the folder in OpenKnowledge and correct a page by hand.** It opens
because the format matches. My edit is not overwritten, because identity is `(type, name)`
and a second run proposes nothing new.

**As an agent, I cannot corrupt the ontology.** A write with a missing required field, an
unknown type or an illegal enum value comes back as a `Refusal` value, and nothing reaches
disk.

## Implementation Decisions

**1 · `home` grows two Places and no methods.** `knowledge` and `index`, both properties
matching `blobs` exactly. `disk.ts:51` already computes the knowledge path for scaffolding
and merely does not export it.

**2 · The index is outside the knowledge base.** [`design.md`](./design.md) § Alternatives
B2. It is rebuilt by every pass and disposable by construction; inside the base it would
churn the git history of a tree whose value is being hand-readable. The home's `.gitignore`
already excludes `blobs/` and `state.db` — measured — so it gains one line.

**3 · Identity is `(type, name)`, never a path.** Found by a failing assertion in the
step-3 spike: refusing to overwrite *by filename* silently duplicates.

**4 · A type does not give you its folder.** `Person` → `person/`, never `people/`. The
mapping is declared, not derived — same source.

**5 · Every write lands as a single `rename`.** Measured: a non-atomic edit registers a
**phantom document** in OpenKnowledge's permanent removal ledger, and the viewer is the one
thing ADR 007 keeps.

**6 · Frontmatter decodes through an Effect `Schema`.**
[ADR 006](../../adr/006-schema-is-the-parse-boundary.md) — external data is decoded at the
boundary and nothing downstream sees `unknown`. It is also what makes the encoding canonical,
which is how 13,134 Transcript lines re-encode byte-identically.

**7 · Three schema changes, each with the decision that produced it.**

| Change | From | Decided by |
|---|---|---|
| `Media.kind` gains `sticker` | `enum(image\|voice\|audio\|video\|document)` | `G1` / `B5` |
| `Commitment.source_message` → `source_window` | required `text` with no possible value | `G4` / `B4` |
| Source gains `self_label` | absent | `G3` / `B3` |

The first two are `schema.yaml`, shipped by [`skeleton/spec.md`](../skeleton/spec.md) §3.4.
The third is `config.yaml` and lives in `home/internal/config.ts`.

**8 · `observe` writes no Receipt**, departing from `import` and `ingest`. Both write one
because an Archive read is one-shot and a crash mid-import is unrecoverable. A mechanical
pass is idempotent and re-runnable from material still on disk, so a Receipt would claim
provenance nothing needs.

**9 · The wider schema delta is not adopted.** `T1` proposed `Meeting`, `Account` and
`Decision`, and reshaped `Commitment` and `Issue`. Only the three changes above are in scope
— the rest is a reasoning-pass question and is named under **Out of Scope**.

## Design

[`design.md`](./design.md) — the caller, the call graph, the interfaces, the seam delta, the
conformance table, and every alternative with what killed it. **Not restated here.**

## Testing Decisions

**Bytes, not objects, at the disk seam.** `base.write` is tested by reading the file back,
because format conformance is the trade this Slice makes and it is not observable from inside
our own types.

**The pure functions are tested by direct call.** `lint`, `next`, `index`, `observe.from` and
`observe.unseen` take a list and return a value. No fixtures, no temp directory.

**One test nothing else covers: the foreign format.** ADR 007's falsifier 1. Write documents
with `fs` only, then `ok preview` and `ok lint` them. It is the one check that fails if the
trade stops holding — and it is the only place in this repository where `ok` is legitimately
run, because it is a **test**, not the product.

**`toStrictEqual`, never `toEqual`.** ADR 006 amendment 1: `toEqual` treats `{ text:
undefined }` and `{}` as equal, so a suite using it cannot observe a change in key presence —
which is exactly the class of change that rewrote 638 of 1,000 lines.

## The gate

Numbered and executable. [`definition-of-done.md`](../../design/definition-of-done.md) row 1
reads this list.

| # | Assertion |
|---|---|
| 1 | `vp check` is pass·pass and `vp test` is green |
| 2 | `home.knowledge` and `home.index` are `Place` properties; `home.test.ts` asserts both |
| 3 | `ambient init` on an empty root writes a home whose `knowledge/` is exactly `[.ok, .okignore]` |
| 4 | `ambient doctor` exits `0` on that home, and `1` naming `schema.yaml` when it is deleted |
| 5 | `schema.yaml` carries `sticker` in `Media.kind` and `source_window` on `Commitment`; `doctor` accepts both |
| 6 | `config.yaml` accepts `sources.<name>.self_label`, and rejects a non-string with a named problem |
| 7 | The home's `.gitignore` excludes the index |
| 8 | `ambient ontology lint` on a base with a missing required field names **the file, the key and the expected form** |
| 9 | `ambient ontology lint` on a clean base exits `0` and prints nothing |
| 10 | `ambient ontology next --type=person --limit=20` returns only `status: unreviewed` documents, at most 20 |
| 11 | `ambient ontology index` writes to `home.index`, and deleting that file then re-running reproduces it **byte-identically** |
| 12 | `ambient observe --from capxul-devs` writes one document per distinct sender label — **14 on the real Transcript** |
| 13 | Every document it writes carries `status: unreviewed` and `source: history` |
| 14 | A second `observe` run writes **0** documents and leaves every file's inode unchanged |
| 15 | A hand-edit to a document survives a second `observe` run byte-identically |
| 16 | An Observation with a missing required field is returned as a `Refusal` and **nothing reaches disk** |
| 17 | An Observation naming a type absent from `schema.yaml` is refused the same way |
| 18 | Documents written by `fs` alone are found and passed by `ok preview` and `ok lint` — ADR 007 falsifier 1 |
| 19 | No file under `src/` exceeds 250 lines without a declared exception |
| 20 | No module imports another module's `internal/` |

## Out of Scope

- **MEDIA itself** — speech-to-text, vision, extraction. `G1` decided this Slice closes
  before it; `B5` only labels stickers so the queue stops lying.
- **The wider schema delta** — `Meeting`, `Account`, `Decision`, and reshaping `Commitment`
  and `Issue`. `T1` proposed them from 14.63% of the corpus and they are real, but adopting a
  type is a judgement about what the ontology is *for*, not a build task.
- **Any reasoning pass.** `digest`, `synthesis` and `consolidate` are operated by hand and
  written down as skills afterwards. That is the point of the Slice, and it is not code.
- **`now` as a live fold** — needs typed Receipts, which arrive with HARNESS.
- **The consolidation loop** — a cadence needs LOOPS.
- **An MCP server of our own** — still the end goal, and now a smaller problem.
- **GitHub as a Source** — named by the principal, absent from the model, and unreachable
  from one Archive.

## Further Notes

**Every number here was measured on 2026-08-20 and names its instrument.** 13,134 lines and
13,083 messages by `wc -l` and `grep -c`. 14 distinct sender labels by `grep -o | sort -u`.
980 Blobs by `ls | wc -l`; their types by parsing headers, **not** by `file`, which reports
no dimensions for WebP on this machine and gave a wrong answer once in this Slice. 703 holes
by `grep -c '"text":"","media"'`, of which 381 are stickers — 223 WebP blobs, 207 at 512×512,
and exactly 95 Ogg voice notes.

**One inference this Slice withdrew.** The map read 21 GitHub issue links across 18 months as
evidence that `Issue` is mis-shaped. It is not: the count measures GitHub mentioned *inside
WhatsApp*, and GitHub is its own Source. The measurement stands; the inference does not.

**The estimate held.** [`knowledge-flow.md`](../../design/knowledge-flow.md) guessed *"roughly
250 lines of TypeScript"*. The step-3 spike measured `lint + next + index` plus the shared
read and the interface at **250 code lines on the nose**, and all five verbs at 326.
