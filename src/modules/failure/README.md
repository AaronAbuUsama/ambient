# `failure`

The step every module shares on the way to a Failure: a `catch` binds `unknown`,
and something has to turn it into text a person reads. Read
[`types.ts`](./types.ts) first.

## What it owns

The Cause — what a caught Node error leaves behind once it is a Failure — and the
one question every caller asks of a caught error, which is whether the path was
simply not there.

It owns nothing else. A Failure itself stays in the failing module's own
`types.ts`, because what can go wrong is part of that module's interface
([errors.md](../../../docs/rules/errors.md)).

## Invariants

1. It names no other module. Every module may depend on it; it depends on nothing.
2. It opens no file, holds no state and does no I/O.
3. `causeOf` always returns text. A value that is not an `Error` is still printed.
4. Only `ENOENT` is missing. Anything unidentifiable is a problem, never absence.
5. `code` is checked in one file, because it is not part of Node's `Error` type.

## How to test it

`vp test src/modules/failure` — no temporary directory and no Place. The module
has no I/O, so its test is values in and values out.

## Inside

| File | What it knows |
|---|---|
| `types.ts` | the two questions, and why `cause` is `unknown` |
| `service.ts` | binds them; the one place `ENOENT` is named |
| `internal/node-error.ts` | that Node raises an `Error` and hangs a `code` off it |

## Why it exists

`causeOf` was written six times, identically, in `archive`, `blobs`, `channel`,
`home`, `import` and `transcript`; `isMissing` twice. Six of the eight modules
already depend on `home`, so a shared module was never the new cost it looked
like — the duplication was habit rather than a decision.

The name is the part that mattered. A module called `utils` has no subject, so
anything may go in it and it rots. *Failure* is a subject this repository already
has a rule about, which is what keeps this module from becoming a drawer:
`compact` builds a value with optional keys and is about something else, so it
stays where it is used.
