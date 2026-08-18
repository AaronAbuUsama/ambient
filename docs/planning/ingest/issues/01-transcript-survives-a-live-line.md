# 01 — `transcript` survives a Live line

**Status:** done · **Blocks:** 04 · **Blocked by:** nothing

**Startable now, in parallel with `00`.** `transcript` already has its `seams.md` row.

## Why

`S1` wrote the first `from: "live"` line this codebase has ever produced and found **three
defects in shipped code**. All three are Live-only and **none has ever fired**, because nothing
had ever produced a Live line. They become real the day `04` lands. Verified by reading
[`service.ts`](../../../../src/modules/transcript/service.ts) directly, not taken on the spike's
word.

| | Defect | Where |
|---|---|---|
| **D2** | **Silent data loss reported as success.** `merged` requires `from === "archive"` on both sides, so for a Live line it returns `incoming` unconditionally — a re-delivery whose media is not yet fetched **overwrites** a stored hash, while the call reports `written: 0`. | `service.ts:12` |
| **D1** | Change detection is `JSON.stringify(stored) !== JSON.stringify(next)`, comparing a deserialised object against a caller's object — so **key order alone** sets `changed` and every replay rewrites the whole file. Measured on 638 of 1,000 lines. | `service.ts:65` |
| **D6** | `load()` … `replace()` is a read-modify-write with no lock. A write landing between them is lost, **with both callers told they succeeded**. | `service.ts:65`, `:73` |

A fourth, smaller: two copies of one message id **inside a single batch** are both written —
correct for an Archive, where two identical messages in one second really are two messages, and
wrong for a Live account, where a repeated id is always a re-delivery.

## Gate rows this carries

Spec rows **11**, **12**, **13**. Write each as a **named failing test first** —
[`tdd`](../../../../.agents/skills/vendor/tdd/SKILL.md).

## Done when

- Rows 11–13 pass, and every existing `transcript` and `import` test still passes untouched.
- The 13,134 Archive lines in the real home remain byte-identical after a re-import.
- `design.md` § Interfaces no longer claims `transcript` is unchanged.

## Governed by

[`errors.md`](../../../rules/errors.md) — nothing throws ·
[`types.md`](../../../rules/types.md) · [`legibility.md`](../../../rules/legibility.md) ·
`tdd` · `code-review`

## Comments

**2026-08-18 — done.** Three named failing tests first, then three fixes. All 56 tests pass,
the six pre-existing `transcript` tests untouched.

**D1 — key order is not a change.** `same()` replaces the `JSON.stringify(stored) !==
JSON.stringify(next)` comparison with one that sorts object keys before comparing. The
defect needed a *producer's* field order to fire, which is why it took real data to see:
`archive/internal/classify.ts:77` emits `{from, kind, wall, at, zone, who, text, …}` and
`transcript/internal/store.ts:97` rebuilds the loaded line as `{from, wall, at, zone, who,
kind, text, …}`. **`kind` moves.** Replaying the real 13,134 lines in the Reader's order:

```
                 pre-fix          fixed
written/skipped  0 / 13,134       0 / 13,134
byte-identical   false            true
rewritten        true             false
```

A replay through `readTranscript` shows nothing — those lines are already in the store's
order, so both versions pass. That run is a regression guard, not evidence, and it is worth
saying so: the first measurement taken here proved nothing and looked like it proved
everything.

**D2 — `merged` lost its provenance gate.** It required `from === "archive"` on both sides,
making it a no-op for the case it was written for. It is now the rule it always meant: a
`Stored` media never degrades, whichever Reader produced the line. A Blob is
content-addressed and immutable, so a later `Failed` is a statement about *fetching*, not
about bytes already held.

**D6 — one writer per Transcript.** [`internal/lock.ts`](../../../../src/modules/transcript/internal/lock.ts),
45 lines. `wx` is the atomic primitive `node:fs` gives us — there is no `flock` — so the
lock is a sibling file taken before `load()` and released in a `finally`. **Fail-fast, and
that is the spec's own choice:** row 13 asks for *"both succeed with both sets present, or
one returns a failure"*, so there is nothing worth queueing for. A holder that was killed
leaves its file behind, so a lock older than 30s is broken rather than waited on; otherwise
one SIGKILL wedges a Chat forever.

Before the fix, the row 13 test read `['seed', 'B']` — writer A's two lines gone, both
callers told they succeeded.

**The fourth, smaller defect in the ticket body is untouched.** Two copies of one message id
inside a single batch are still both written. It is correct for an Archive and wrong for a
Live account, and nothing produces a Live batch until `04`. Left for `04` to close, where the
producer exists to test it against.

```
vp test        56 passed        7 files
vp check       pass · pass      56 formatted, 48 files
vp run shape   clean            45 source files, 6 modules
fallow dupes   0 lines
```
