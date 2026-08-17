# `archive`

Turns an Archive text file or ZIP into Message values and media streams. It
knows no network, phone, or home. Read [`types.ts`](./types.ts) first.

## What it owns

Input-form detection, raw UTF-8 ZIP names, the exported line grammar, exact
Wall clocks, media Markers, Archive identity, and the list of lines it could
not read.

## Invariants

1. `readArchive` remains a pure string seam; `openArchive` detects bare text,
   one-file ZIP and flat media ZIP without a caller flag.
2. Day/month order is detected from the whole file and never guessed.
3. The Wall clock is kept as written and resolved under an IANA Zone per
   Message. A fixed offset is refused.
4. Sender labels remain labels; no identity is inferred.
5. Events, Placeholders, edits and deletions are distinct values, never flags
   that flatten an event into a Message or hide missing media.
6. ZIP filenames are decoded as raw UTF-8 regardless of bit 11, and media is
   opened one entry at a time rather than loading the Archive whole.
7. The Archive SHA-256 and its own `_chat.txt` bytes stay beside the read so a
   caller can persist a re-parseable primary source and Receipt.
8. Every unreadable line is numbered, and every failure is a value in
   `types.ts`.

## How to test it

`vp test src/modules/archive` exercises the grammar with strings and small
unflagged UTF-8 ZIP fixtures.

## Inside

| File | What it knows |
|---|---|
| `types.ts` | read result, entry signature, failure vocabulary |
| `service.ts` | read assembly and problem rendering |
| `internal/line.ts` | exported line grammar and sender split |
| `internal/classify.ts` | event, Placeholder, edit and deletion shapes |
| `internal/time.ts` | Wall clock validation and IANA Zone resolution |
| `internal/zip.ts` | lazy ZIP enumeration, UTF-8 names and entry streams |
| `fixtures/` | small committed ZIPs with the measured filename defect |
| `archive.test.ts` | the string and file-form interface gate |
