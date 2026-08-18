/** `transcript` assembly. The interface is `types.ts`. */

import type { Place } from "~/modules/home/types.ts";
import { keyOf } from "./internal/key.ts";
import { acquire } from "./internal/lock.ts";
import { append, load, replace } from "./internal/store.ts";
import type {
  DescribeTranscriptProblem,
  ReadTranscript,
  TranscriptLine,
  TranscriptProblem,
  TranscriptWrite,
  WriteTranscript,
} from "./types.ts";

/**
 * Stored bytes are never given back. A Blob is content-addressed and immutable, so a
 * later `Failed` is a statement about *fetching* and not about the bytes we already
 * hold — whichever Reader produced the line.
 *
 * This used to require `from === "archive"` on both sides, which made it a no-op for
 * a Live line: a re-delivery whose media had not been fetched overwrote a stored hash
 * while the call reported `written: 0`. Defect D2, gate row 12.
 */
const merged = (stored: TranscriptLine, incoming: TranscriptLine): TranscriptLine =>
  stored.kind === "message" &&
  incoming.kind === "message" &&
  stored.media?.state === "Stored" &&
  incoming.media?.state !== "Stored"
    ? { ...incoming, media: stored.media }
    : incoming;

const record = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Key order is not a change.
 *
 * `stored` was rebuilt by `internal/store.ts` from what is on disk; `next` is the
 * caller's own object. Comparing the two with `JSON.stringify` let a field ordering
 * difference alone set `changed`, and `changed` renames a whole new file over this
 * one — on 638 of 1,000 lines, measured. Defect D1, gate row 11.
 */
const same = (stored: TranscriptLine, next: TranscriptLine): boolean => {
  const ordered = (line: TranscriptLine): string =>
    JSON.stringify(line, (_key: string, value: unknown) =>
      record(value)
        ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : 1)))
        : value,
    );
  return ordered(stored) === ordered(next);
};

export const readTranscript: ReadTranscript = async (place) => {
  const loaded = await load(place);
  return "problem" in loaded ? { problems: [loaded.problem] } : loaded.lines;
};

const write = async (
  place: Place,
  incoming: readonly TranscriptLine[],
): Promise<TranscriptWrite | TranscriptProblem> => {
  const loaded = await load(place);
  if ("problem" in loaded) return { problems: [loaded.problem] };

  const positions = new Map<string, number[]>();
  for (const [index, line] of loaded.lines.entries()) {
    const key = keyOf(line);
    const found = positions.get(key) ?? [];
    found.push(index);
    positions.set(key, found);
  }

  const occurrences = new Map<string, number>();
  const lines: TranscriptLine[] = [...loaded.lines];
  const additions: TranscriptLine[] = [];
  let written = 0;
  let skipped = 0;
  let messagesWritten = 0;
  let messagesSkipped = 0;
  let changed = false;

  for (const line of incoming) {
    const key = keyOf(line);
    const occurrence = occurrences.get(key) ?? 0;
    occurrences.set(key, occurrence + 1);
    const index = positions.get(key)?.[occurrence];
    if (index === undefined) {
      const next = lines.length;
      lines.push(line);
      additions.push(line);
      positions.set(key, [...(positions.get(key) ?? []), next]);
      written++;
      if (line.kind === "message") messagesWritten++;
      continue;
    }
    skipped++;
    if (line.kind === "message") messagesSkipped++;
    const next = merged(lines[index]!, line);
    if (!same(lines[index]!, next)) {
      lines[index] = next;
      changed = true;
    }
  }

  const messages = { written: messagesWritten, skipped: messagesSkipped };
  if (written === 0 && !changed && !loaded.torn) return { written, skipped, messages, lines };
  const problem = changed ? await replace(place, lines) : await append(place, loaded, additions);
  return problem === undefined ? { written, skipped, messages, lines } : { problems: [problem] };
};

export const writeTranscript: WriteTranscript = async (place, incoming) => {
  const release = await acquire(place);
  if (release === undefined) {
    return { problems: [{ _tag: "Unwritable", cause: "another writer holds this Transcript" }] };
  }
  try {
    return await write(place, incoming);
  } finally {
    await release();
  }
};

export const describe: DescribeTranscriptProblem = (problem) => {
  switch (problem._tag) {
    case "MalformedLine":
      return `Transcript line ${problem.line} is malformed`;
    case "Unreadable":
      return `Transcript is unreadable: ${problem.cause}`;
    case "Unwritable":
      return `Transcript is unwritable: ${problem.cause}`;
  }
};
