/**
 * What a read of an Archive amounts to — the counts and the span.
 *
 * Every number here is derived from the folded lines, so it is computed in one
 * place from one input rather than accumulated during the fold. That is the
 * point: a counter incremented inside a loop can disagree with the lines it
 * counted, and this cannot.
 *
 * `resolved` and `unresolved` describe Markers, not Messages. A fresh read has
 * resolved nothing — `resolveMedia` is what turns a Marker into a stored Blob —
 * so every Marker starts unresolved and the caller updates both together.
 */

import type { ArchiveLine } from "~/modules/transcript/types.ts";
import type { Folded } from "./fold.ts";
import type { ArchiveRead } from "../types.ts";

type Tally = Pick<ArchiveRead, "span" | "counts">;

const placeholder = (line: ArchiveLine): boolean =>
  line.kind === "message" && line.media?.state === "NoHandle" && line.media.why === "placeholder";

/**
 * The span is the first and last line's Instant, not the smallest and largest.
 *
 * An Archive is written in order, and a re-ordered one is a different problem
 * than a mis-counted one. Reading it in order is also what lets this stay O(n).
 */
export const tallyOf = (folded: Folded): Tally => {
  const first = folded.lines[0];
  const last = folded.lines.at(-1);
  const messages = folded.lines.filter((line) => line.kind === "message");

  return {
    span:
      first === undefined || last === undefined ? undefined : { oldest: first.at, newest: last.at },
    counts: {
      messages: messages.length,
      events: folded.lines.length - messages.length,
      placeholders: folded.lines.filter(placeholder).length,
      edits: messages.filter((line) => line.edited === true).length,
      deletions: messages.filter((line) => line.deleted === true).length,
      markers: folded.markers.length,
      resolved: 0,
      unresolved: folded.markers.length,
    },
  };
};
