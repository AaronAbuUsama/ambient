import type { ArchiveEvent, ArchiveLine, ArchiveMessage } from "~/modules/transcript/types.ts";

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
    line: {
      from: "archive",
      kind: "message",
      wall: base.wall,
      at: base.at,
      zone: base.zone,
      who: base.who,
      text,
      ...(edited ? { edited: true as const } : {}),
      ...(deleted ? { deleted: true as const } : {}),
      ...(marker !== null
        ? { media: { state: "NoHandle" as const, why: "not-in-archive" as const } }
        : placeholder === null
          ? {}
          : { media: { state: "NoHandle" as const, why: "placeholder" as const } }),
    },
    ...(marker === null ? {} : { marker: marker[1]!.trim() }),
  };
};
