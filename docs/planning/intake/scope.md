# INTAKE — scope

Scoped 2026-08-16 against the real iOS account database at
`~/projects/whatsapp-agent-tui/.proof-private/ios/whatsapp.db` (10 MB, the principal's own
WhatsApp, already paired). **This is a scope, not a spec.** It records what the data
actually is and what that forces; the spec comes after the open questions are answered.

---

## The finding that shapes everything

`whatsappd` holds two stores, and they do not cover the same time.

| Store | Span | Volume | Carries media refs |
|---|---|---|---|
| **Mirror** — `wa_messages` | **2022-06-27 → 2026-08-15** (4 years) | 2,739 messages | **No** |
| **Accepted log** — `wa_accepted_batches` | **2026-08-05 → 2026-08-15** (10 days) | 3,440 events, 273 of them messages | **Yes** |

The mirror is WhatsApp's own history sync, projected into rows. The accepted log is the
daemon's event stream, and only covers the days the daemon has been running.

**So the two operations `product.md` already names are not a stylistic split — they read
different stores.**

- **History import** (one-time) reads the **mirror**. Four years, no media.
- **Continuous ingestion** (ongoing) reads the **accepted log**, with `seq` as a monotonic
  cursor. Media refs present.

That is a much stronger justification than the one we had, and it means the two paths
cannot share a reader.

## What is actually in the account

```
wa_contacts         1,560     wa_chats            913     wa_groups          143
wa_contact_aliases  2,417     chats with messages 408     (362 DM · 46 group)
wa_messages         2,739     wa_accepted_batches 3,440
media blobs on disk   266
```

Messages by year: **2022: 23 · 2024: 79 · 2025: 169 · 2026: 2,468.** Ninety percent is this
year. The four-year span is real but nearly empty before 2026.

Message kinds:

```
text 1,869 · unsupported 298 · image 266 · video 142 · audio 78 · revoked 45
sticker 22 · document 16 · poll 1 · location 1 · contacts 1
```

**The graph is rich; the conversation history is thin.** 913 chats and 1,560 contacts
against 2,739 messages — roughly three messages per chat, and half the chats have no
messages at all. Day one, Ambient can know *who everyone is, which groups exist, who is in
them, and what someone is called across several identifiers*. It cannot know what was said
before 2026.

That is a correction to `thesis.md`'s cold-start claim, which assumed years of conversation.
It is true of people, not of conversations — and the people half may be the more useful one.

## Shapes

```
wa_messages          account_id · chat_id · message_id · timestamp · data_json
  data_json          accountId · chatId · messageId · sender{} · ref{chatId,fromMe,id}
                     · fromMe · timestamp · receipts[] · reactions[] · kind · rawType
                     · text            (text only)
                     · context         (text only — replies/quotes)
wa_chats             account_id · chat_id · data_json{isGroup, subject, lastMessageAt}
wa_contacts          account_id · contact_id · data_json{nativeIds[], displayName, imgUrl}
wa_contact_aliases   account_id · native_id · contact_id
wa_groups            account_id · group_id · data_json{subject, participants[]}
wa_accepted_batches  account_id · seq · from_revision · revision · events_json · patch_json
  event kinds        update 1,672 · contact 1,135 · message 273 · conversation_sync 245
                     · last_seen 40 · connected 34
```

Blobs: `.whatsappd-media/<accountHash>/<sha256>.bin`. The old repo addressed them as
`media:v1:<sha256>` refs taken from the **accepted log**, never from the mirror.

## What INTAKE produces

Raw only. No interpretation, no knowledge, no model call.

- `chats/<slug>/transcript.jsonl` — one line per message, both directions
- blob refs on the messages that have them; bytes in the content-addressed store
- the identity material — contacts, aliases, groups — landed somewhere KNOWLEDGE can read
- a durable cursor per source, so a restart neither replays nor skips

`home` owns every path. `channel` asks for a chat's `transcript()` and `media()` grants; it
never builds a path.

## Open questions — answer before writing the spec

1. **Can more history be pulled?** The old repo had a `historyBackfillLimit`. If whatsappd
   can request deeper history sync, the mirror grows and the cold start improves
   materially. **This is the highest-value unknown** — it decides whether KNOWLEDGE gets
   four years or eight months.
2. **Is historical media reachable at all?** The mirror carries no media ref, so the 266
   blobs on disk are presumably recent. If a 2025 image cannot be addressed, historical
   media is permanently absent and the wiki should say so rather than imply it looked.
3. **What are the 298 `unsupported` messages?** Eleven percent of everything. If they are
   system events, ignore them; if they are a content type worth reading, that is a gap.
4. **How many of the 78 voice notes are historical?** Recent ones are processable;
   historical ones without a blob ref are holes that cannot be filled.
5. **Do we ingest identity, or only conversations?** 1,560 contacts and 2,417 aliases exist
   independently of any message. They are the richest thing in the account. Deciding they
   are in scope changes what INTAKE writes.
6. **Does the mirror need reading at all after the first import?** If the accepted log is
   authoritative going forward, the mirror is a one-time source and the steady state has
   one reader, not two.

## What this is likely to move in SKELETON

One revision was budgeted when the home layout was decided without data. Candidates:

- **The chat ↔ source binding** (`source`, `peer`) — flagged in advance as most likely.
- **Where identity lands.** Contacts, aliases and groups are per-account, not per-chat, and
  the current layout has no home for account-level material that is not knowledge.
- **Slugs.** 913 chats, many of them groups with emoji and punctuation in the subject. The
  rule is `^[a-z0-9][a-z0-9-]{0,63}$` and something has to derive a slug from a subject —
  or chats are addressed by id and the slug is chosen by a human when a chat is adopted.

## Gate — draft

1. History import over the iOS mirror produces one `transcript.jsonl` per allowlisted chat,
   message counts matching the source exactly.
2. Running it twice changes nothing — idempotent on `message_id`.
3. Continuous ingestion advances a durable cursor; a kill mid-batch replays nothing and
   skips nothing.
4. An empty allowlist ingests nothing at all.
5. Media that has a ref lands in the blob store, addressed by hash, deduplicated.
6. Messages with no reachable media are recorded as such — never silently dropped, never
   implied to have been read.
7. `vp check`, `vp test`, `pnpm shape` green; `fallow dupes` no worse than 0.0%.
