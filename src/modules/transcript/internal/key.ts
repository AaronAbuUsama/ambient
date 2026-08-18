import type { TranscriptLine } from "../types.ts";

/** NUL keeps adjacent fields from producing the same key by concatenation. */
export const keyOf = (line: TranscriptLine): string =>
  line.from === "archive"
    ? [line.wall, line.who.label, line.kind === "message" ? line.text : line.raw].join("\0")
    : [line.from, line.kind, line.id].join("\0");
