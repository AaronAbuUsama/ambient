import type { ArchiveEvent, ArchiveLine, ArchiveMessage } from "~/modules/transcript/types.ts";

/**
 * Drop the keys whose value is undefined, so an absent optional stays an absent
 * key. `transcript`'s encoder declares these with `optionalKey` and refuses an
 * explicit `undefined`, so a line built carelessly would not encode. The twin of
 * this lives in `channel/internal/line.ts`; imports.md forbids sharing it.
 */
const compact = <T extends object>(value: T): T =>
  // SAFETY: every key removed holds `undefined`, and under `strict` without
  // `exactOptionalPropertyTypes` only an optional key can hold `undefined`.
  Object.fromEntries(Object.entries(value).filter(([, held]) => held !== undefined)) as T;

export type ArchiveBase = Pick<
  ArchiveMessage,
  "from" | "kind" | "wall" | "at" | "zone" | "who" | "text"
> & { readonly whatsappMarked: boolean };

const EDITED = /\s*<This message was edited>$/i;
const DELETED = /(?:^|\s)(?:This message was deleted|deleted this message)\.?$/i;
const PLACEHOLDER =
  /(?:^|\s)(<Media omitted>|image omitted|video omitted|audio omitted|sticker omitted|document omitted|GIF omitted|Contact card omitted)$/i;
const MARKER = /(?:^|\s)<attached:\s*([^<>]+)>$/i;

export type Classified = { readonly line: ArchiveLine; readonly marker?: string };

const eventOf = (raw: string): ArchiveEvent["event"] => {
  if (
    raw.includes(" added this group to the community") ||
    raw.includes(" removed this group from the community")
  )
    return "other";
  if (raw.includes(" added ") || raw.endsWith(" joined from the community")) return "added";
  if (raw.includes(" removed ")) return "removed";
  if (raw.endsWith(" left")) return "left";
  if (
    raw.includes(" changed the subject") ||
    raw.includes(" changed the group name") ||
    raw.includes(" renamed the group") ||
    raw.includes(" renamed group")
  )
    return "renamed";
  if (raw.includes(" changed this group's icon")) return "icon";
  if (raw === "You're now an admin") return "admin";
  if (raw.includes(" changed their phone number")) return "number-changed";
  return "other";
};

export const classify = (base: ArchiveBase): Classified => {
  const placeholder = PLACEHOLDER.exec(base.text);
  const marker = MARKER.exec(base.text);
  const edited = EDITED.test(base.text);
  const deleted = DELETED.test(base.text);
  const poll = base.text === "POLL:" || base.text.startsWith("POLL:\n");
  if (
    placeholder === null &&
    marker === null &&
    !edited &&
    !deleted &&
    !poll &&
    base.whatsappMarked
  ) {
    return {
      line: {
        from: "archive",
        kind: "event",
        wall: base.wall,
        at: base.at,
        zone: base.zone,
        event: eventOf(base.text),
        who: base.who,
        raw: base.text,
      },
    };
  }

  const text = (
    marker !== null
      ? base.text.slice(0, marker.index)
      : placeholder === null
        ? edited
          ? base.text.replace(EDITED, "")
          : base.text
        : base.text.slice(0, placeholder.index)
  ).trimEnd();
  return {
    line: compact({
      from: "archive",
      kind: "message",
      wall: base.wall,
      at: base.at,
      zone: base.zone,
      who: base.who,
      text,
      edited: edited ? (true as const) : undefined,
      deleted: deleted ? (true as const) : undefined,
      media:
        marker !== null
          ? { state: "NoHandle" as const, why: "not-in-archive" as const }
          : placeholder === null
            ? undefined
            : { state: "NoHandle" as const, why: "placeholder" as const },
    }),
    // `Classified` is read by `archive/service.ts` as `classified.marker !== undefined`
    // and never encoded, so the key may simply be present and hold nothing.
    marker: marker === null ? undefined : marker[1]!.trim(),
  };
};
