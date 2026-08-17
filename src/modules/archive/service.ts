/** `archive` assembly. The interface is `types.ts`. */

import {
  cleanBody,
  detectDayFirst,
  matchLine,
  senderCounts,
  splitSender,
  type RawLine,
} from "./internal/line.ts";
import { classify, type ArchiveBase } from "./internal/classify.ts";
import { formatterFor, instantOf } from "./internal/time.ts";
import type { ArchiveLine } from "~/modules/transcript/types.ts";
import type { ArchiveRead, DescribeArchiveProblem, ReadArchive, UnparsedLine } from "./types.ts";

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
  const unparsed: UnparsedLine[] = [];
  let continuations = 0;
  let open: ArchiveBase | undefined;

  const close = (): void => {
    if (open !== undefined) resultLines.push(classify({ ...open, text: open.text.trimEnd() }));
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
    },
  } satisfies ArchiveRead;
};

export const describe: DescribeArchiveProblem = (problem) => {
  switch (problem._tag) {
    case "NotAnArchive":
      return "The file is not a WhatsApp Archive";
    case "AmbiguousDateOrder":
      return "The Archive does not settle whether dates are day-first";
    case "InvalidZone":
      return `The Zone "${problem.zone}" is not an IANA name`;
  }
};
