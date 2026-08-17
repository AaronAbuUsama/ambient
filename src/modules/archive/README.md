# `archive`

Turns an Archive's `_chat.txt` string into Message values. It knows no
filesystem, network, phone, or home. Read [`types.ts`](./types.ts) first.

## What it owns

The exported line grammar, day/month detection, exact Wall clocks, IANA Zone
resolution, continuation lines, and the list of lines it could not read.

## Invariants

1. A string is the Archive input; parsing needs no filesystem or phone.
2. Day/month order is detected from the whole file and never guessed.
3. The Wall clock is kept as written and resolved under an IANA Zone per
   Message. A fixed offset is refused.
4. Sender labels remain labels; no identity is inferred.
5. Every unreadable line is numbered, and every failure is a value in
   `types.ts`.

## How to test it

`vp test src/modules/archive` exercises the grammar with strings only.

## Inside

| File | What it knows |
|---|---|
| `types.ts` | read result, entry signature, failure vocabulary |
| `service.ts` | read assembly and problem rendering |
| `internal/line.ts` | exported line grammar and sender split |
| `internal/time.ts` | Wall clock validation and IANA Zone resolution |
| `archive.test.ts` | the string-only interface gate |
