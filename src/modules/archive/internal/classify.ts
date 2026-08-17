import type { ArchiveEvent, ArchiveLine, ArchiveMessage } from "~/modules/transcript/types.ts";

export type ArchiveBase = Pick<
  ArchiveMessage,
  "from" | "kind" | "wall" | "at" | "zone" | "who" | "text"
>;

const EDITED = /\s*<This message was edited>$/i;
const DELETED = /(?:^|\s)(?:This message was deleted|deleted this message)\.?$/i;
const PLACEHOLDER =
  /(?:^|\s)(<Media omitted>|image omitted|video omitted|audio omitted|sticker omitted|document omitted|GIF omitted|Contact card omitted)$/i;

const eventOf = (raw: string): ArchiveEvent["event"] | undefined => {
  if (/^.+\sadded\s.+$/i.test(raw) || /joined using .+ invite link$/i.test(raw)) return "added";
  if (/^.+\sremoved\s.+$/i.test(raw)) return "removed";
  if (/^.+\sleft$/i.test(raw)) return "left";
  if (/changed the subject|renamed (?:the )?group/i.test(raw)) return "renamed";
  if (/changed this group's icon/i.test(raw)) return "icon";
  if (/you're now an admin/i.test(raw)) return "admin";
  if (/changed their phone number/i.test(raw)) return "number-changed";
  if (/created group|end-to-end encrypted|pinned a message|disappearing messages/i.test(raw)) {
    return "other";
  }
  return undefined;
};

export const classify = (base: ArchiveBase): ArchiveLine => {
  const placeholder = PLACEHOLDER.exec(base.text);
  const edited = EDITED.test(base.text);
  const deleted = DELETED.test(base.text);
  const event = eventOf(base.text);
  if (placeholder === null && !edited && !deleted && event !== undefined) {
    return {
      from: "archive",
      kind: "event",
      wall: base.wall,
      at: base.at,
      zone: base.zone,
      event,
      who: base.who,
      raw: base.text,
    };
  }

  const text = (
    placeholder === null
      ? edited
        ? base.text.replace(EDITED, "")
        : base.text
      : base.text.slice(0, placeholder.index)
  ).trimEnd();
  return {
    ...base,
    text,
    ...(edited ? { edited: true as const } : {}),
    ...(deleted ? { deleted: true as const } : {}),
    ...(placeholder === null
      ? {}
      : { media: { state: "NoHandle" as const, why: "placeholder" as const } }),
  };
};
