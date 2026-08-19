/**
 * One `MessageRecord` → one Transcript line.
 *
 * The mirror is **current state**, not an event log: an edit has already replaced
 * the content, a revoke has already replaced the arm, and a reaction set is the
 * live set with removals filtered out. So this is a projection and never a fold —
 * nothing here applies an event, and a re-read gives the truth.
 *
 * **No reaction line is ever written.** Reactions arrive as an array on the record,
 * so they land as state on their message. That is the amendment to ADR 004 that
 * ticket `04` was written to force: `LiveReaction` had no producer, and shipping a
 * public type with no production call site is the exact defect this Slice exists
 * to close.
 */

import type { MessageRecord } from "whatsappd";
import type { LiveMedia, LiveMessage, LiveReaction } from "~/modules/transcript/types.ts";

/**
 * Drop the keys whose value is undefined, so an absent optional stays an absent
 * key rather than a present one holding nothing.
 *
 * That distinction is the whole of defect D1, and it is now load-bearing twice
 * over: `transcript`'s encoder declares these fields with `optionalKey` and
 * refuses an explicit `undefined`, so a line built carelessly would not encode.
 * Four lines, duplicated in `archive/internal/classify.ts` for the Archive
 * shapes, because modules.md forbids reaching into another module's internal/.
 */
const compact = <T extends object>(value: T): T =>
  // SAFETY: every key removed holds `undefined`. Under `strict` without
  // `exactOptionalPropertyTypes` only an optional key can hold `undefined`, so
  // what is left still satisfies every required key of `T`.
  Object.fromEntries(Object.entries(value).filter(([, held]) => held !== undefined)) as T;

/**
 * What the Source says about the bytes, mapped onto our own vocabulary.
 *
 * A record with media always produces a media state — `NeverDriven` is the honest
 * answer for a record we have not yet stored, and a line with no media at all
 * would claim there was none. Gate row 9.
 */
const mediaOf = (record: MessageRecord): LiveMedia | undefined => {
  if (!("media" in record)) return undefined;
  return record.media.state === "stored" ? { state: "NeverDriven" } : { state: "Failed" };
};

const refOfRecord = (record: MessageRecord): string | undefined =>
  "media" in record && record.media.state === "stored" ? record.media.ref : undefined;

/** The caption is the message's text. A media message with a caption has both. */
const textOf = (record: MessageRecord): string | undefined => {
  if (record.kind === "text") return record.text;
  if ("text" in record && typeof record.text === "string") return record.text;
  if ("media" in record && typeof record.media.caption === "string") return record.media.caption;
  if (record.kind === "poll") return record.name;
  if (record.kind === "location") return record.name ?? record.address;
  return undefined;
};

/** `subject` is WhatsApp's own key for the reactor, or `"aggregate"` when it named nobody. */
const reactionsOf = (record: MessageRecord): readonly LiveReaction[] | undefined =>
  record.reactions.length === 0
    ? undefined
    : record.reactions.map((reaction) =>
        compact({
          subject: reaction.subject,
          emoji: reaction.emoji,
          by: reaction.by,
          at: reaction.at,
        }),
      );

export type Mapped = { readonly line: LiveMessage; readonly ref?: string };

export const lineOf = (record: MessageRecord): Mapped => {
  const text = textOf(record);
  const quoted = record.context?.quoted;
  const mentions = record.context?.mentions;
  const reactions = reactionsOf(record);
  const media = mediaOf(record);
  const ref = refOfRecord(record);
  const line: LiveMessage = compact({
    from: "live",
    kind: "message",
    at: record.timestamp,
    id: record.messageId,
    who: compact({
      id: record.sender.id,
      mode: record.sender.mode,
      alt: record.sender.alt,
      pushName: record.pushName,
    }),
    msgKind: record.kind,
    text,
    quoted,
    mentions,
    edited: record.editedAt === undefined ? undefined : (true as const),
    viewOnce: record.flags?.viewOnce === true ? (true as const) : undefined,
    ephemeral: record.flags?.ephemeral === true ? (true as const) : undefined,
    reactions,
    media,
  });
  return ref === undefined ? { line } : { line, ref };
};
