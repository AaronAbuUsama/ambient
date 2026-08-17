/** The line grammar of an Archive's `_chat.txt`. */

/** Direction marks are removed from values after their structural position is recorded. */
export const withoutDirectionMarks = (text: string): string => text.replace(/[‎‏‪-‮]/g, "");

const ENVELOPE = /^\[([^\]]+)\]([\s\S]*)$/;
const LEADING_DIRECTION_MARKS = /^[‎‏‪-‮]+/;
const AFTER_ENVELOPE = /^[\s‎‏‪-‮]+/;
const STARTS_WITH_DIRECTION_MARK = /^[‎‏‪-‮]/;
const WALL =
  /^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4}),\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:[\s  ]*([APap])\.?[Mm]\.?)?$/;

export type RawLine = {
  readonly wall: string;
  readonly first: number;
  readonly second: number;
  readonly year: number;
  readonly hour: number;
  readonly minute: number;
  readonly secondOfMinute: number;
  readonly rest: string;
  readonly candidates: readonly { readonly sender: string; readonly delimiter: number }[];
};

const senderCandidates = (
  rest: string,
): readonly { readonly sender: string; readonly delimiter: number }[] => {
  const candidates: { sender: string; delimiter: number }[] = [];
  for (
    let delimiter = rest.indexOf(":");
    delimiter !== -1;
    delimiter = rest.indexOf(":", delimiter + 1)
  ) {
    const after = rest[delimiter + 1];
    if (after !== undefined && after !== " " && after !== "\t") continue;
    const sender = withoutDirectionMarks(rest.slice(0, delimiter)).trimEnd();
    if (sender !== "") candidates.push({ sender, delimiter });
  }
  return candidates;
};

export const matchLine = (source: string): RawLine | undefined => {
  const line = source.replace(LEADING_DIRECTION_MARKS, "");
  const envelope = ENVELOPE.exec(line);
  if (envelope === null) return undefined;
  const wall = withoutDirectionMarks(envelope[1] ?? "");
  const rest = (envelope[2] ?? "").replace(AFTER_ENVELOPE, "");
  const matched = WALL.exec(wall);
  if (matched === null) return undefined;

  let hour = Number(matched[4]);
  const ampm = matched[7]?.toLowerCase();
  if (ampm !== undefined) hour = (hour % 12) + (ampm === "p" ? 12 : 0);
  const year = Number(matched[3]);
  return {
    wall,
    first: Number(matched[1]),
    second: Number(matched[2]),
    year: year < 100 ? 2000 + year : year,
    hour,
    minute: Number(matched[5]),
    secondOfMinute: Number(matched[6] ?? 0),
    rest,
    candidates: senderCandidates(rest),
  };
};

export const detectDayFirst = (lines: readonly RawLine[]): boolean | undefined => {
  for (const line of lines) {
    if (line.first > 12) return true;
    if (line.second > 12) return false;
  }
  return undefined;
};

export const senderCounts = (lines: readonly RawLine[]): ReadonlyMap<string, number> => {
  const counts = new Map<string, number>();
  for (const line of lines) {
    for (const candidate of line.candidates) {
      counts.set(candidate.sender, (counts.get(candidate.sender) ?? 0) + 1);
    }
  }
  return counts;
};

/**
 * The format has no escape for `: ` inside a sender label. Across the file, the
 * real label is the most repeated prefix; the longest tied prefix preserves a
 * label that itself contains `: ` without taking a one-off colon from the body.
 * ponytail: report ambiguous prefixes if a real Archive ever breaks the measured
 * 14-label result; the file format supplies no participant metadata to do better.
 */
export const splitSender = (
  line: RawLine,
  counts: ReadonlyMap<string, number>,
):
  | { readonly sender: string; readonly body: string; readonly whatsappMarked: boolean }
  | undefined => {
  let chosen: { readonly sender: string; readonly delimiter: number } | undefined;
  let frequency = -1;
  for (const candidate of line.candidates) {
    const next = counts.get(candidate.sender) ?? 0;
    if (
      next > frequency ||
      (next === frequency && candidate.sender.length > (chosen?.sender.length ?? 0))
    ) {
      chosen = candidate;
      frequency = next;
    }
  }
  if (chosen === undefined) return undefined;
  const body = line.rest.slice(chosen.delimiter + 1).replace(/^[ \t]*/, "");
  return {
    sender: chosen.sender,
    body,
    whatsappMarked: STARTS_WITH_DIRECTION_MARK.test(body),
  };
};

export const cleanBody = (body: string): string => withoutDirectionMarks(body).trim();
