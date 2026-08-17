/** `transcript` assembly. The interface is `types.ts`. */

import { keyOf } from "./internal/key.ts";
import { append, load, replace } from "./internal/store.ts";
import type {
  DescribeTranscriptProblem,
  ReadTranscript,
  TranscriptLine,
  WriteTranscript,
} from "./types.ts";

const merged = (stored: TranscriptLine, incoming: TranscriptLine): TranscriptLine =>
  stored.from === "archive" &&
  stored.kind === "message" &&
  stored.media?.state === "Stored" &&
  incoming.from === "archive" &&
  incoming.kind === "message" &&
  incoming.media?.state !== "Stored"
    ? { ...incoming, media: stored.media }
    : incoming;

export const readTranscript: ReadTranscript = async (place) => {
  const loaded = await load(place);
  return "problem" in loaded ? { problems: [loaded.problem] } : loaded.lines;
};

export const writeTranscript: WriteTranscript = async (place, incoming) => {
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
    if (JSON.stringify(lines[index]) !== JSON.stringify(next)) {
      lines[index] = next;
      changed = true;
    }
  }

  const messages = { written: messagesWritten, skipped: messagesSkipped };
  if (written === 0 && !changed && !loaded.torn) return { written, skipped, messages, lines };
  const problem = changed ? await replace(place, lines) : await append(place, loaded, additions);
  return problem === undefined ? { written, skipped, messages, lines } : { problems: [problem] };
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
