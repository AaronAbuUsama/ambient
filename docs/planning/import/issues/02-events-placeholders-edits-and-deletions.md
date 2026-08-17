# 02 — Events, Placeholders, edits and deletions

**What to build:** the rest of what an Archive can actually say. After ticket 01 a Transcript
holds text messages; after this one it holds the shape of the conversation.

Three things stop being flattened into text:

- **Events** become their own line kind, not Messages. **51** in the measured Archive.

  **Corrected twice on contact.** The first count, 174, was raw word occurrence. The second,
  105, was a prose regex: it turned 73 ordinary Messages such as *"I added the fix"* into
  Events and missed 19 generated rows including calls, settings, community changes and a
  rename. The source already carries the boundary: WhatsApp prefixes generated bodies with
  U+200E. After formal Message shapes are recognised first, the remaining marked rows are
  Events. On the real Archive, 820 body-leading marks decompose into 692 Markers, 12
  Placeholders, 61 deletions, 4 polls and **51 Events**. No vocabulary regex decides whether
  somebody spoke.
- **Placeholders** — `image omitted` and its siblings — become a line whose media state is
  `NoHandle` with `why: "placeholder"`, never a line with no media at all. Measured: **1,131
  of 1,139** attachments carry one in the without-media export.
- **Edits and deletions** are preserved as flags. Measured: **334** edited, **61** deleted.

A without-media Archive is **not a degraded import**. It is the shape the principal chose,
and after this ticket the Transcript says so rather than implying the conversation had no
media.

**Blocked by:** 01.

**Status:** done

## Shape

`media` becomes **total** — one success arm and the failure arms — so a line cannot carry
media without saying which state it is in. For an Archive, `NoHandle` is the only failure
reachable: `Expired`, `Failed` and `NeverDriven` all describe a CDN an Archive never touches.
`why` distinguishes `placeholder` from `not-in-archive` (ticket 03).

```ts
| { from: "archive"; kind: "event"
    wall: string; at: number; zone: string
    event: "added" | "removed" | "left" | "renamed" | "icon" | "admin"
         | "number-changed" | "other"
    who: { label: string }; subject?: string; raw: string }
```

`raw` keeps the line as written. An event we classify as `other` is still readable later
without a re-parse — the same reason the primary source is kept in ticket 04.

## Acceptance criteria

- [x] A membership event becomes a line of `kind: "event"`, never a message.
- [x] Ordinary prose using words such as `added`, `removed` or `left` remains a Message;
      Event classification uses the Archive's structural mark.
- [x] Every event carries `raw`, so an unclassified one loses nothing.
- [x] A Placeholder becomes a line with media state `NoHandle` and `why: "placeholder"`.
- [x] `media` is total: a line carrying media always states its state, and `Stored` is
      representable (ticket 03 produces it).
- [x] Edited and deleted messages carry their flags.
- [x] An Archive line still cannot carry a message id, a reply edge, mentions or a reaction —
      those fields are **absent from the variant's type**, not optional in it.
- [x] Counts for events and Placeholders are available to the caller for ticket 04's receipt.

Gate rows 3, 8, 9 of [the spec](../spec.md).

## Governed by

- [`errors.md`](../../../rules/errors.md) — *"prefer discriminated unions … over boolean flags
  and optional-field state machines, so illegal states are hard to represent."* A `system?:
  true` flag, which the prototype used, is exactly what this rule rejects.
- [`modules.md`](../../../rules/modules.md) — this is a change to `archive` and `transcript`
  `types.ts` files; the test still goes through the interface only.
- [`language.md`](../../../rules/language.md) — *Placeholder* and *Marker* are distinct nouns
  in [`CONTEXT.md`](../../../../CONTEXT.md). Do not use one for the other.
- Build with `tdd`.

## Watch for

The four media states come from the close of scoping in
[`scope.md`](../../intake/scope.md), where each is *"a declared error"* with a distinct
remedy. Do not add a fifth for "the Archive names a file it does not contain" — ticket 03
shows that case is a decoding fault, not a new state.
