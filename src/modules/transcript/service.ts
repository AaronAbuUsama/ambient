/** `transcript` assembly. The interface is `types.ts`. */

import { keyOf } from "./internal/key.ts";
import { append, load, replace } from "./internal/store.ts";
import type {
  DescribeTranscriptProblem,
  ReadTranscript,
  TranscriptLine,
  WriteTranscript,
} from "./types.ts";

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
      continue;
    }
    skipped++;
    if (JSON.stringify(lines[index]) !== JSON.stringify(line)) {
      lines[index] = line;
      changed = true;
    }
  }

  if (written === 0 && !changed && !loaded.torn) return { written, skipped, lines };
  const problem = changed ? await replace(place, lines) : await append(place, loaded, additions);
  return problem === undefined ? { written, skipped, lines } : { problems: [problem] };
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
