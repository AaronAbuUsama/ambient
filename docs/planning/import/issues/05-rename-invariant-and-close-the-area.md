# 05 — The rename invariant, and closing IMPORT

**What to build:** proof that a Chat folder is a **label and not an identity**, then the area
closes.

A Chat is identified by `(source, peer)` in its own config. Verified during the grill: no chat
config records its own slug, the global config does not list chats at all, chats are found by
listing the directory, and Blobs are addressed by hash. So renaming a Chat should be `mv` and
nothing should notice — including after an import has written a Transcript, Blob refs, an
`imports/` directory and a receipt into it.

That is the point at which it could quietly stop being true, which is why the check lands
here and not earlier.

**Blocked by:** 01, 02, 03, 04.

**Status:** done

## The invariant

> **No Chat slug appears in any file outside that Chat's own folder.**

It is what makes a badly-chosen name cheap to fix, and it is why IMPORT never derives a slug:
913 chats measured, **757 with no subject at all**, and 5.8% of the named ones colliding. A
human names a Chat; the folders are therefore also the allowlist, and there is no second
mechanism to keep in sync.

## Acceptance criteria

- [x] `chat add x` → import an Archive with media → `mv chats/x chats/y` → `doctor` exits `0`.
- [x] After the rename the Transcript is still readable and the Blob refs still resolve.
- [x] Re-importing the same Archive into the renamed Chat appends nothing.
- [x] Grepping the home for the old slug finds it **only** inside that Chat's own folder.
- [x] `doctor` opens no file whose size is bounded by traffic — SKELETON gate assertion 17
      still passes with `imports/`, `transcript.jsonl` and `media/` all populated.

Gate rows 14, 15 of [the spec](../spec.md).

## Then close the area

Run the [`close-slice`](../../../../.claude/skills/close-slice/SKILL.md) skill. It runs every
row of [`definition-of-done.md`](../../../design/definition-of-done.md) and **reports before
writing** — a failing row is the answer to *"can we close it"*, not something to fix as part
of closing.

```bash
vp check                  # row 2
vp test                   # rows 1 and 3 — name the gate file and its assertion count
vp run shape              # rows 4 and 6
pnpm dlx fallow dupes     # row 5 — the baseline is 0 lines, 0.0%
```

**Row 2 was red when this ticket was written, and is not any more.** `vp check`'s lint half
failed inside vendored skill assets that reference an `@oxlint/plugins` devDependency this
repo does not carry, so its ESTree types resolved to an error type and oxlint's own
`no-redundant-type-constituents` fired — correctly, about code we neither author nor compile.
It arrived with `53bce37`, before this slice existed. Resolved by scoping `fmt` and `lint`
out of vendored paths, both `.agents/skills/` and its `.claude/skills/` symlink projection —
exclude one name and the tools find the same files by the other. **Left here as the record:
the checker was wrong about its scope, not the code about its content.**

Then rows 7–9 by reading:

- **row 7** — status board: IMPORT becomes `● closed`, **INGEST** becomes `◐ active`, and
  **You are here** names it.
- **row 8** — a dated ledger entry, newest first, two lines. **Delete IMPORT's Active
  detail** in the same commit; the ledger line is what survives. The roadmap has a hard cap
  of **200 lines** and is currently at exactly 200, so something must go for anything to be
  added.
- **row 9** — any statement in [ADR 003](../../../adr/003-history-import-is-an-archive.md) or
  [ADR 001](../../../adr/001-home-interface.md) that did not survive contact goes in that
  ADR's `## Amendments`, never in its body. ADR 003 already carries two.

Then re-run `vp run shape`: the roadmap edit may have broken a cross-link.

## What must NOT be closed with it

INGEST has one open question and it is not this area's to answer: a full history sync is
delivered **once per credential** — 43,334 messages, 1,506 chats, seven batches of ~4,800, on
a callback that must not block — and nothing yet says what happens if the process dies at
batch four. Carry it into INGEST's scoping. **Do not spend another pairing on a tool that
does not write.**
