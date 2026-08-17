# 01 — Import a text Archive, end to end

**What to build:** the principal can turn a without-media WhatsApp export into a Transcript
inside a Chat that already exists.

```
ambient import ~/Downloads/capxul-devs.txt --into capxul-devs --zone Africa/Accra
```

Plain text messages only — system events, Placeholders, edits and deletions are ticket 02,
and media is ticket 03. Running it twice appends nothing. Running it again under a different
`--zone` changes every resolved Instant and still appends nothing, because the dedup key is
the **Wall clock**. Importing a newer export of the same conversation appends only what is
new. A slug with no Chat folder is refused, and the message names `chat add`.

**Blocked by:** 00 — the seam-map rows.

**Status:** done

## The line format

From the grill, and it is the decision the whole area turns on. **Unknowable from this
source = the field is not in the variant's type. Absent = optional within a variant that has
it.** A flat shape with optional fields cannot express that difference.

```ts
| { from: "archive"; kind: "message"
    wall: string; at: number; zone: string   // the Wall clock is kept VERBATIM
    who: { label: string }                   // a display label, never an Address
    text: string }
```

The `live` variants are declared in the same union now, even though INGEST builds them, so
the two Readers cannot drift. `transcript` declares its own shapes — **no `whatsappd` types
cross into it** ([`new-module`](../../../../.claude/skills/new-module/SKILL.md): *"No
Drizzle, Pi, `whatsappd` or provider types"* in a `types.ts`).

The dedup key is `(wall, sender, text)`, **NUL-separated**. The prototype's key claims NUL in
its comment and uses spaces in the code; do not inherit that. Measured collision rate on the
real Archive: 1 in 13,134.

## Acceptance criteria

- [x] `archive` reads a bare `.txt` and returns messages, with **a string as the only input**
      — no filesystem, no home, no phone.
- [x] The grammar handles what was measured: 12- and 24-hour clocks, seconds present or
      absent, a narrow no-break space before AM/PM, WhatsApp's direction marks, continuation
      lines (6,473 in one file), and a sender name containing `": "`.
- [x] Day-first is detected; when nothing in the file settles it, parsing **fails with a
      declared value** rather than guessing.
- [x] `transcript` appends lines and tolerates a torn trailing line from a hard kill.
- [x] Every line carries `wall`, `at`, `zone` and `from`.
- [x] `--zone` takes an IANA name; an offset is refused. It defaults to the host's Zone and
      the default is **printed**, never silently assumed.
- [x] Re-running the same import appends nothing and leaves the Transcript byte-identical.
- [x] Re-running under a different `--zone` appends nothing.
- [x] Importing a newer export of the same conversation appends only the new messages.
- [x] `import --into <slug>` for a Chat that does not exist writes nothing, exits non-zero,
      and names `chat add`.
- [x] Nothing under `src/` throws.

Gate rows 1 (bare `.txt`), 5, 6, 7, 10, 16 of [the spec](../spec.md).

## Governed by

- **Scaffold with [`new-module`](../../../../.claude/skills/new-module/SKILL.md)** — all six
  slots at once, so the module is never briefly wrong. `internal/` must hold a real file; an
  empty directory passes the shape check and means nothing.
- **Build with `tdd`** — one red-green slice at a time.
- [`modules.md`](../../../rules/modules.md) — `types.ts` IS the module. If it cannot be
  understood alone, the shape is wrong.
- [`errors.md`](../../../rules/errors.md) — every failure is a variant in `types.ts`. Nothing
  throws. Narrow with `"problems" in result`.
- [`types.md`](../../../rules/types.md) — no `any`; the file's bytes are `unknown` until
  narrowed at the boundary.
- [`imports.md`](../../../rules/imports.md) — `~/modules/<name>/…`, never `../..`, never
  another module's `internal/`.
- [`legibility.md`](../../../rules/legibility.md) — 250 lines a file. If the gate test needs
  to exceed it, add a row to the exception list **with its reason**, as `home.test.ts` has.
- The CLI handler is one file under `cli/internal/commands/`, following `init` and `doctor`.
  `cli` is wiring only — **no logic**, and every string a human sees comes from a `describe`.

## Prior art

`src/modules/home/` for the module shape and the `Place` discipline;
`src/modules/cli/internal/commands/init.ts` for a handler; `home.test.ts` for a gate as
numbered `it`s against real temp directories. The grammar is proved in
`.spike-private/prototype-archive-reader/` — **take the grammar, not the shape**; it predates
[ADR 003](../../../adr/003-history-import-is-an-archive.md).

## Fixtures

Committed fixtures are small and synthetic. The measured Archive is personal data and stays
in `.spike-private/`, which is gitignored. Each fixture carries one measured shape.
