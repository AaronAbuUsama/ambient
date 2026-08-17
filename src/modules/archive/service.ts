/** `archive` assembly. The interface is `types.ts`. */

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import * as fs from "node:fs/promises";

import type { ArchiveLine } from "~/modules/transcript/types.ts";
import { classify, type ArchiveBase } from "./internal/classify.ts";
import {
  cleanBody,
  detectDayFirst,
  matchLine,
  senderCounts,
  splitSender,
  type RawLine,
} from "./internal/line.ts";
import { formatterFor, instantOf } from "./internal/time.ts";
import { looksLikeZip, openZip } from "./internal/zip.ts";
import type {
  ArchiveProblem,
  ArchiveRead,
  DescribeArchiveProblem,
  OpenArchive,
  ReadArchive,
  ResolveMedia,
  UnparsedLine,
} from "./types.ts";

const physicalLines = (text: string): readonly string[] => {
  const lines = text.split(/\r?\n/);
  if (lines.at(-1) === "") lines.pop();
  return lines;
};

export const readArchive: ReadArchive = (text, zone) => {
  const formatter = formatterFor(zone);
  if (formatter === undefined) return { problems: [{ _tag: "InvalidZone", zone }] };

  const lines = physicalLines(text);
  const matched = lines.map(matchLine);
  const messageRows = matched.filter(
    (line): line is RawLine => line !== undefined && line.candidates.length > 0,
  );
  if (messageRows.length === 0) return { problems: [{ _tag: "NotAnArchive" }] };
  const dayFirst = detectDayFirst(messageRows);
  if (dayFirst === undefined) return { problems: [{ _tag: "AmbiguousDateOrder" }] };

  const counts = senderCounts(messageRows);
  const resultLines: ArchiveLine[] = [];
  const markers: { line: number; name: string }[] = [];
  const unparsed: UnparsedLine[] = [];
  let continuations = 0;
  let open: ArchiveBase | undefined;

  const close = (): void => {
    if (open !== undefined) {
      const classified = classify({ ...open, text: open.text.trimEnd() });
      const line = resultLines.push(classified.line) - 1;
      if (classified.marker !== undefined) markers.push({ line, name: classified.marker });
    }
    open = undefined;
  };

  for (const [index, source] of lines.entries()) {
    const raw = matched[index];
    if (raw !== undefined && raw.candidates.length > 0) {
      close();
      const sender = splitSender(raw, counts);
      const at = instantOf(raw, dayFirst, formatter);
      if (sender === undefined || at === undefined) {
        unparsed.push({
          line: index + 1,
          reason: at === undefined ? "malformed-wall-clock" : "no-message",
        });
        continue;
      }
      open = {
        from: "archive",
        kind: "message",
        wall: raw.wall,
        at,
        zone,
        who: { label: sender.sender },
        text: cleanBody(sender.body),
        whatsappMarked: sender.whatsappMarked,
      };
      continue;
    }
    if (open === undefined) {
      if (source.trim() !== "") unparsed.push({ line: index + 1, reason: "no-message" });
      continue;
    }
    open = { ...open, text: `${open.text}\n${cleanBody(source)}` };
    continuations++;
  }
  close();

  const first = resultLines[0];
  const last = resultLines.at(-1);
  const messages = resultLines.filter((line) => line.kind === "message");
  return {
    lines: resultLines,
    markers,
    continuations,
    unparsed,
    span:
      first === undefined || last === undefined ? undefined : { oldest: first.at, newest: last.at },
    counts: {
      messages: messages.length,
      events: resultLines.length - messages.length,
      placeholders: messages.filter(
        (line) => line.media?.state === "NoHandle" && line.media.why === "placeholder",
      ).length,
      edits: messages.filter((line) => line.edited === true).length,
      deletions: messages.filter((line) => line.deleted === true).length,
      markers: markers.length,
      resolved: 0,
      unresolved: markers.length,
    },
  } satisfies ArchiveRead;
};

const failed = (cause: unknown): ArchiveProblem => ({
  problems: [{ _tag: "Unreadable", cause: cause instanceof Error ? cause.message : String(cause) }],
});

const hashFile = async (path: string): Promise<string | ArchiveProblem> => {
  try {
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(path)) hash.update(chunk);
    return hash.digest("hex");
  } catch (cause: unknown) {
    return failed(cause);
  }
};

const textOf = (primary: Uint8Array): string | ArchiveProblem => {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(primary);
  } catch {
    return { problems: [{ _tag: "InvalidText" }] };
  }
};

export const openArchive: OpenArchive = async (path, zone) => {
  const zip = await looksLikeZip(path);
  if (typeof zip !== "boolean") return zip;
  if (zip) {
    const sha256 = await hashFile(path);
    if (typeof sha256 !== "string") return sha256;
    const opened = await openZip(path);
    if ("problems" in opened) return opened;
    const read = readArchive(opened.text, zone);
    if ("problems" in read) {
      opened.close();
      return read;
    }
    return { ...opened, sha256, readerVersion: 2, read };
  }
  try {
    const primary = Uint8Array.from(await fs.readFile(path));
    const text = textOf(primary);
    if (typeof text !== "string") return text;
    const read = readArchive(text, zone);
    return "problems" in read
      ? read
      : {
          form: "text",
          sha256: createHash("sha256").update(primary).digest("hex"),
          bytes: primary.byteLength,
          readerVersion: 2,
          primary,
          read,
          media: [],
          close: () => undefined,
        };
  } catch (cause: unknown) {
    return failed(cause);
  }
};

export const resolveMedia: ResolveMedia = (read, hashes) => {
  const lines = [...read.lines];
  let resolved = 0;
  for (const marker of read.markers) {
    const line = lines[marker.line];
    const hash = hashes.get(marker.name);
    if (line?.kind !== "message" || hash === undefined) continue;
    lines[marker.line] = { ...line, media: { state: "Stored", hash } };
    resolved++;
  }
  return {
    ...read,
    lines,
    counts: {
      ...read.counts,
      resolved,
      unresolved: read.markers.length - resolved,
    },
  };
};

export const describe: DescribeArchiveProblem = (problem) => {
  switch (problem._tag) {
    case "NotAnArchive":
      return "The file is not a WhatsApp Archive";
    case "AmbiguousDateOrder":
      return "The Archive does not settle whether dates are day-first";
    case "InvalidZone":
      return `The Zone "${problem.zone}" is not an IANA name`;
    case "Unreadable":
      return `Archive is unreadable: ${problem.cause}`;
    case "InvalidZip":
      return `Archive ZIP is invalid: ${problem.cause}`;
    case "InvalidFilename":
      return "Archive ZIP has a filename that is not UTF-8";
    case "InvalidText":
      return "Archive chat text is not UTF-8";
    case "UnsafeEntry":
      return `Archive ZIP entry "${problem.name}" is not flat`;
    case "MissingChatText":
      return "Archive ZIP has no _chat.txt";
  }
};
