# 03 — A zip Archive, and media as Blobs

**What to build:** the principal can import a with-media export and the photos, voice notes,
videos and documents arrive as actual bytes.

```
ambient import ~/Downloads/capxul-devs.zip --into capxul-devs --zone Africa/Accra
```

Every **Marker** resolves to a **Blob** in the global content-addressed store, and the line's
media state becomes `Stored`. Measured on the real Archive: **1,139 Markers, 1,139 files,
exact.** A `.zip` holding exactly one file is a without-media Archive and behaves identically
to a bare `.txt` — the caller never says which of the three input forms it has.

**Blocked by:** 01.

**Status:** ready-for-agent

## The decoding invariant — this is the one that silently loses data

**Zip entry names are decoded as UTF-8 regardless of the archive's flag.**

Measured: **0 of 1,140** entries set the ZIP UTF-8 flag (bit 11), while the bytes are UTF-8
throughout. A spec-conformant CP437 decode therefore mojibakes them, and **4 of 1,139** media
files stop matching their Marker — a backend-migration overview, two sales decks and a
screenshot, i.e. the documents most worth reading. They would become false `NoHandle`s with
no error anywhere.

With the correct decode: 1,139 Markers, 1,139 files, **zero unresolved**.

State this as a comment where the decode happens, with the measurement. It is exactly the
class of defect that comes back later as *"the import worked, why is that contract missing."*

## Acceptance criteria

- [ ] `archive` accepts all three input forms — a bare `.txt`, a `.zip` of one file, a `.zip`
      of `_chat.txt` plus flat media — and the caller declares nothing.
- [ ] A `.zip` of one file produces a Transcript identical to the bare `.txt` of the same
      conversation.
- [ ] Every Marker resolves to a Blob; the line's media state is `Stored` and carries the
      hash.
- [ ] Entry names are decoded as UTF-8 regardless of the flag, and a fixture with a
      typographic dash and a narrow no-break space in its filename resolves.
- [ ] A Marker naming a file the Archive does not contain becomes `NoHandle` with
      `why: "not-in-archive"`, and the unresolved count is **printed**, not swallowed.
- [ ] `blobs` stores two identical byte sequences once.
- [ ] Bytes go to the **global** Blob store, never inside the Chat folder. The Chat holds refs
      only.
- [ ] A 306 MB Archive is read without holding it all in memory.

Gate rows 1 (zip form), 2, 13 of [the spec](../spec.md).

## Governed by

- **Scaffold `blobs` with [`new-module`](../../../../.claude/skills/new-module/SKILL.md)** —
  it already owns a row in [`seams.md`](../../../design/seams.md), so its precondition is met
  without ticket 00.
- [`modules.md`](../../../rules/modules.md) — `blobs` is `put · get · exists`, all by hash.
  Keep the interface that small; it is the deepest-per-line module in the area.
- [`errors.md`](../../../rules/errors.md) — a corrupt entry, an unreadable zip and an
  unresolved Marker are three declared values, not one.
- [`types.md`](../../../rules/types.md) — zip entry bytes are `unknown` at the boundary.
- **`home` owns every path.** `blobs` is handed its root as a `Place`; it never builds one.
- Build with `tdd`.

## Prior art

The old repo addressed blobs as `media:v1:<sha256>` taken from the accepted log. The hash is
the address; nothing else is. `.spike-private/exports/capxul-devs-with-media.zip` is the real
Archive for manual verification — it is gitignored and stays that way.
