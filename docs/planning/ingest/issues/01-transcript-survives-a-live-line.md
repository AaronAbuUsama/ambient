# 01 — `transcript` survives a Live line

**Status:** ready-for-agent · **Blocks:** 04 · **Blocked by:** nothing

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
