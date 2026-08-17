import * as fs from "node:fs/promises";

import type { Place } from "~/modules/home/types.ts";
import type {
  ArchiveEvent,
  ArchiveMedia,
  LiveMedia,
  LiveWho,
  TranscriptLine,
  TranscriptProblemDetail,
} from "../types.ts";

type Loaded = {
  readonly lines: readonly TranscriptLine[];
  readonly completeText: string;
  readonly torn: boolean;
};

export type LoadResult = Loaded | { readonly problem: TranscriptProblemDetail };

const record = (value: unknown): value is Readonly<Record<string, unknown>> =>
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

const lineOf = (value: unknown): TranscriptLine | undefined => {
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
    value.kind === "reaction" &&
    typeof value.target === "string" &&
    (typeof value.emoji === "string" || value.emoji === null)
  ) {
    return {
      from: "live",
      kind: "reaction",
      at: value.at,
      target: value.target,
      who,
      emoji: value.emoji,
    };
  }
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
  if (value.media !== undefined && media === undefined) return undefined;
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
    ...(media === undefined ? {} : { media }),
  };
};

const causeOf = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

const codeOf = (cause: unknown): string | undefined =>
  record(cause) && typeof cause.code === "string" ? cause.code : undefined;

export const load = async (place: Place): Promise<LoadResult> => {
  let text: string;
  try {
    text = await fs.readFile(place.path, "utf8");
  } catch (cause: unknown) {
    if (codeOf(cause) === "ENOENT") return { lines: [], completeText: "", torn: false };
    return { problem: { _tag: "Unreadable", cause: causeOf(cause) } };
  }
  const lastNewline = text.lastIndexOf("\n");
  const completeText = lastNewline === -1 ? "" : text.slice(0, lastNewline + 1);
  const rows = completeText === "" ? [] : completeText.split("\n").slice(0, -1);
  const lines: TranscriptLine[] = [];
  for (const [index, row] of rows.entries()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(row);
    } catch {
      return { problem: { _tag: "MalformedLine", line: index + 1 } };
    }
    const line = lineOf(parsed);
    if (line === undefined) return { problem: { _tag: "MalformedLine", line: index + 1 } };
    lines.push(line);
  }
  return { lines, completeText, torn: completeText.length !== text.length };
};

const encoded = (lines: readonly TranscriptLine[]): string =>
  lines.map((line) => `${JSON.stringify(line)}\n`).join("");

export const append = async (
  place: Place,
  loaded: Loaded,
  lines: readonly TranscriptLine[],
): Promise<TranscriptProblemDetail | undefined> => {
  try {
    if (loaded.torn) await fs.truncate(place.path, Buffer.byteLength(loaded.completeText));
    await fs.appendFile(place.path, encoded(lines), "utf8");
    return undefined;
  } catch (cause: unknown) {
    return { _tag: "Unwritable", cause: causeOf(cause) };
  }
};

export const replace = async (
  place: Place,
  lines: readonly TranscriptLine[],
): Promise<TranscriptProblemDetail | undefined> => {
  try {
    await fs.writeFile(place.path, encoded(lines), "utf8");
    return undefined;
  } catch (cause: unknown) {
    return { _tag: "Unwritable", cause: causeOf(cause) };
  }
};
