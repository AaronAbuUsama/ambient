# 04 — The import receipt, and `_chat.txt` as the primary source

**What to build:** after an import, the Chat folder can answer *"where did this come from,
and what could you not read?"* without the original file still existing.

The import keeps the export's own `_chat.txt` — **1.4 MB, 0.46% of the 306 MB Archive** —
beside a receipt naming the Archive by hash. The media bytes are already in the global Blob
store, so copying the whole zip would store them twice.

```
chats/<slug>/imports/<sha256-of-archive>/
  _chat.txt      the primary source, verbatim, re-parseable forever
  receipt.json   archive hash + bytes + zone + reader version + counts + span + findings
```

This is where **provenance stops being a promise**. `product.md` requires that a fact know
where it came from; before this ticket, *"I imported a file once"* is nowhere on disk.

**Blocked by:** 01, 03. The receipt records Marker counts, and a receipt that silently omits
media counts is the exact failure this area exists to prevent.

**Status:** done

## The one edit this area makes to SKELETON

`home` gains an `imports` **Grant** on the Chat handle, beside the existing `transcript` and
`media` grants, plus its rows in the `converge` and `plan` lists.

`imports/` is **`foreign`** in [ADR 001](../../../adr/001-home-interface.md)'s sense: `home`
creates the slot and vouches for its kind, and **never reads inside it**. That is not
optional — `home` parses only files whose size is bounded by configuration, never by traffic,
and `_chat.txt` is bounded by traffic.

Scaffolding it here rather than in ticket 01 follows the rule in
[`skeleton/spec.md`](../../skeleton/spec.md): *"A directory is scaffolded in the area that
gives it a writer."*

## What the receipt records

Counts, not content. Enough to answer the question without re-reading anything:

- the Archive's `sha256` and byte length, and the input form it was
- the Zone used, and whether it was given or defaulted
- the **Reader version** — this is the answer to *"the source carried it but our Reader was
  too old to capture it"*, recorded once per import instead of on 43,000 lines
- messages written, messages skipped as already present, span
- Markers seen, resolved, unresolved
- Placeholders, events, edits, deletions
- **the line numbers of anything unreadable**

## Acceptance criteria

- [x] `home` grants `imports`, and `doctor` vouches for the directory without reading inside.
- [x] `_chat.txt` is written under `imports/<sha256>/` byte-identical to the Archive's own.
- [x] The receipt names the Archive by `sha256` and records every count above.
- [x] A line the parser cannot read is **skipped, counted with its line number, and does not
      fail the import.** No fourth line variant is added — the primary source on disk is where
      that line survives.
- [x] An unresolved-Marker count above zero is printed as a finding, not left in the file.
- [x] Importing the same Archive twice produces one `imports/<hash>/` directory, not two.
- [x] Importing a *different* export of the same conversation produces a second receipt, so
      the two runs are distinguishable.
- [x] `doctor` still opens no file whose size is bounded by traffic.

Gate rows 4, 11, 12 of [the spec](../spec.md).

## Governed by

- [ADR 001](../../../adr/001-home-interface.md) — the `Place` escrow rule and the `foreign`
  owner kind. Adding a Grant is one row in the converge list and one in the plan list; it is
  not a new interface.
- [`modules.md`](../../../rules/modules.md) — *"One durable transition has one authoritative
  mutation path."* The receipt is written by the import handler, once.
- [`errors.md`](../../../rules/errors.md) — an unwritable `imports/` is a declared value.
- [`decisions.md`](../../../rules/decisions.md) — **if adding the Grant contradicts anything
  ADR 001 states, record it in that ADR's `## Amendments`, never in its body.** Six of its
  statements were already wrong on contact and are recorded there; a seventh is not a
  failure, it is the record working.
- Build with `tdd`.

## Watch for

SKELETON's gate has 18 numbered assertions and this ticket touches the module they cover.
Assertion 16 (`path.join` appears nowhere outside `home`) and 17 (`home` opens nothing
traffic-bounded) are the two most likely to break. They must both still pass.
