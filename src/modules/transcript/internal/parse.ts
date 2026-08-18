/**
 * One JSON value → one Transcript line, or nothing.
 *
 * The trust boundary. Every field arrives as `unknown` and is narrowed here, so
 * a line that does not conform is refused rather than half-read — `types.md`.
 * Split out of `store.ts` when reactions landed and it crossed 250 lines:
 * deciding whether bytes are a line, and putting a line into a file, are two
 * jobs and only one of them touches disk.
 */

import type {
  ArchiveEvent,
  ArchiveMedia,
  LiveMedia,
  LiveReaction,
  LiveWho,
  TranscriptLine,
} from "../types.ts";

/** Narrowing starts here: `unknown` is an object with string keys, or it is not. */
export const record = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const whoOf = (value: unknown): LiveWho | undefined => {
  if (
    !record(value) ||
    typeof value.id !== "string" ||
    (value.mode !== "lid" && value.mode !== "pn") ||
    (value.alt !== undefined && typeof value.alt !== "string") ||
    (value.pushName !== undefined && typeof value.pushName !== "string")
  )
    return undefined;
  return {
    id: value.id,
    mode: value.mode,
    ...(value.alt === undefined ? {} : { alt: value.alt }),
    ...(value.pushName === undefined ? {} : { pushName: value.pushName }),
  };
};

const liveMediaOf = (value: unknown): LiveMedia | undefined => {
  if (!record(value) || typeof value.state !== "string") return undefined;
  if (value.state === "Stored" && typeof value.hash === "string") {
    return { state: "Stored", hash: value.hash };
  }
  if (
    value.state === "NoHandle" ||
    value.state === "Expired" ||
    value.state === "Failed" ||
    value.state === "NeverDriven"
  )
    return { state: value.state };
  return undefined;
};

/** One malformed entry refuses the whole line: a half-read reaction set is a lie. */
const reactionsOf = (value: unknown): readonly LiveReaction[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const out: LiveReaction[] = [];
  for (const entry of value) {
    if (
      !record(entry) ||
      typeof entry.subject !== "string" ||
      typeof entry.emoji !== "string" ||
      (entry.by !== undefined && typeof entry.by !== "string") ||
      (entry.at !== undefined && typeof entry.at !== "number")
    )
      return undefined;
    out.push({
      subject: entry.subject,
      emoji: entry.emoji,
      ...(entry.by === undefined ? {} : { by: entry.by }),
      ...(entry.at === undefined ? {} : { at: entry.at }),
    });
  }
  return out;
};

const archiveMediaOf = (value: unknown): ArchiveMedia | undefined => {
  if (!record(value)) return undefined;
  if (value.state === "Stored" && typeof value.hash === "string") {
    return { state: "Stored", hash: value.hash };
  }
  return value.state === "NoHandle" &&
    (value.why === "placeholder" || value.why === "not-in-archive")
    ? { state: "NoHandle", why: value.why }
    : undefined;
};

const archiveEventOf = (value: unknown): ArchiveEvent["event"] | undefined =>
  value === "added" ||
  value === "removed" ||
  value === "left" ||
  value === "renamed" ||
  value === "icon" ||
  value === "admin" ||
  value === "number-changed" ||
  value === "other"
    ? value
    : undefined;

const optionalTrue = (value: unknown): boolean => value === undefined || value === true;

const quotedOf = (value: unknown): { readonly id: string; readonly from: string } | undefined =>
  record(value) && typeof value.id === "string" && typeof value.from === "string"
    ? { id: value.id, from: value.from }
    : undefined;

export const lineOf = (value: unknown): TranscriptLine | undefined => {
  if (!record(value) || typeof value.at !== "number") return undefined;
  if (value.from === "archive") {
    if (
      typeof value.wall !== "string" ||
      typeof value.zone !== "string" ||
      !record(value.who) ||
      typeof value.who.label !== "string"
    )
      return undefined;
    const common = {
      from: "archive" as const,
      wall: value.wall,
      at: value.at,
      zone: value.zone,
      who: { label: value.who.label },
    };
    const event = archiveEventOf(value.event);
    if (
      value.kind === "event" &&
      event !== undefined &&
      typeof value.raw === "string" &&
      (value.subject === undefined || typeof value.subject === "string")
    ) {
      return {
        ...common,
        kind: "event",
        event,
        raw: value.raw,
        ...(value.subject === undefined ? {} : { subject: value.subject }),
      };
    }
    if (
      value.kind !== "message" ||
      typeof value.text !== "string" ||
      !optionalTrue(value.edited) ||
      !optionalTrue(value.deleted)
    )
      return undefined;
    const media = value.media === undefined ? undefined : archiveMediaOf(value.media);
    if (value.media !== undefined && media === undefined) return undefined;
    return {
      ...common,
      kind: "message",
      text: value.text,
      ...(value.edited === undefined ? {} : { edited: true as const }),
      ...(value.deleted === undefined ? {} : { deleted: true as const }),
      ...(media === undefined ? {} : { media }),
    };
  }
  if (value.from !== "live") return undefined;
  const who = whoOf(value.who);
  if (who === undefined) return undefined;
  if (
    value.kind !== "message" ||
    typeof value.id !== "string" ||
    typeof value.msgKind !== "string" ||
    (value.text !== undefined && typeof value.text !== "string") ||
    !optionalTrue(value.edited) ||
    !optionalTrue(value.viewOnce) ||
    !optionalTrue(value.ephemeral) ||
    (value.mentions !== undefined &&
      (!Array.isArray(value.mentions) ||
        !value.mentions.every((mention) => typeof mention === "string"))) ||
    (value.quoted !== undefined && quotedOf(value.quoted) === undefined)
  )
    return undefined;
  const media = value.media === undefined ? undefined : liveMediaOf(value.media);
  const quoted = value.quoted === undefined ? undefined : quotedOf(value.quoted);
  const reactions = value.reactions === undefined ? undefined : reactionsOf(value.reactions);
  if (value.media !== undefined && media === undefined) return undefined;
  if (value.reactions !== undefined && reactions === undefined) return undefined;
  return {
    from: "live",
    kind: "message",
    at: value.at,
    id: value.id,
    who,
    msgKind: value.msgKind,
    ...(value.text === undefined ? {} : { text: value.text }),
    ...(quoted === undefined ? {} : { quoted }),
    ...(value.mentions === undefined ? {} : { mentions: value.mentions }),
    ...(value.edited === undefined ? {} : { edited: true as const }),
    ...(value.viewOnce === undefined ? {} : { viewOnce: true as const }),
    ...(value.ephemeral === undefined ? {} : { ephemeral: true as const }),
    ...(reactions === undefined ? {} : { reactions }),
    ...(media === undefined ? {} : { media }),
  };
};
