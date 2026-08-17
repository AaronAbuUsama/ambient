/** `archive` assembly. The interface is `types.ts`. */

import {
  cleanBody,
  detectDayFirst,
  matchLine,
  senderCounts,
  splitSender,
  type RawLine,
} from "./internal/line.ts";
import { formatterFor, instantOf } from "./internal/time.ts";
import type { ArchiveMessage } from "~/modules/transcript/types.ts";
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
  const messages: ArchiveMessage[] = [];
  const unparsed: UnparsedLine[] = [];
  let continuations = 0;
  let open: ArchiveMessage | undefined;

  const close = (): void => {
    if (open !== undefined) messages.push({ ...open, text: open.text.trimEnd() });
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

  const first = messages[0];
  const last = messages.at(-1);
  return {
    messages,
    continuations,
    unparsed,
    span:
      first === undefined || last === undefined ? undefined : { oldest: first.at, newest: last.at },
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
