# `blobs`

The global content-addressed Blob store. A home-granted Place binds the root;
callers know only hashes. Read [`types.ts`](./types.ts) first.

## What it owns

SHA-256 addresses, streaming writes, deduplication, and byte reads. A Blob is
global: the same bytes in four Chats occupy one file.

## Invariants

1. The SHA-256 of the bytes is their only address.
2. `put` streams and closes a temporary file before publishing its hash.
3. Identical bytes are stored once; the second `put` writes no second Blob.
4. The root is a Place granted by `home`; callers and Blobs never choose it.
5. Every failure is a value from `types.ts`; nothing throws.

## How to test it

`vp test src/modules/blobs` uses a real temporary directory and a Place from
`home`.

## Inside

| File | What it knows |
|---|---|
| `types.ts` | the three verbs and failure vocabulary |
| `service.ts` | binds a Place to the three verbs |
| `internal/hash.ts` | SHA-256 and hash validation |
| `internal/store.ts` | streaming filesystem behavior and deduplication |
| `blobs.test.ts` | the interface gate against a real filesystem |
