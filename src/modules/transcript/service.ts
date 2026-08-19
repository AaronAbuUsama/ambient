/** `transcript` assembly. The interface is `types.ts`. */

import type { Place } from "~/modules/home/types.ts";
import { acquire } from "./internal/lock.ts";
import { reconcile } from "./internal/reconcile.ts";
import { append, load, replace } from "./internal/store.ts";
import type {
  DescribeTranscriptProblem,
  ReadTranscript,
  TranscriptLine,
  TranscriptProblem,
  TranscriptWrite,
  WriteTranscript,
} from "./types.ts";

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

  const { lines, additions, written, skipped, messagesWritten, messagesSkipped, changed } =
    reconcile(loaded.lines, incoming);
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
