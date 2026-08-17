import type { TranscriptLine } from "../types.ts";

/** NUL keeps adjacent fields from producing the same key by concatenation. */
export const keyOf = (line: TranscriptLine): string =>
  line.from === "archive"
    ? [line.wall, line.who.label, line.text].join("\0")
    : line.kind === "message"
      ? [line.from, line.kind, line.id].join("\0")
      : [line.from, line.kind, line.at, line.target, line.who.id, line.emoji].join("\0");
