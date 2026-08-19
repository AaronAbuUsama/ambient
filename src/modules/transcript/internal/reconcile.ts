/**
 * Incoming lines against stored lines — what is new, what is a repeat, and what
 * a repeat changes.
 *
 * This is the whole of re-import. A Transcript is appended to by two Readers and
 * the same lines arrive again every time, so the question is never "write these"
 * but "which of these do we not already have". Both defects the gate rows 11 and
 * 12 exist for live here, which is why it is one named file rather than a loop
 * inside `service.ts` with seven accumulators.
 *
 * It touches no disk. `service.ts` loads, calls this, and decides what to write.
 */

import { keyOf } from "./key.ts";
import { bytesOf } from "./parse.ts";
import type { TranscriptLine } from "../types.ts";

export type Reconciled = {
  /** Every stored line, with repeats merged in place. */
  readonly lines: readonly TranscriptLine[];
  /** Only the genuinely new lines, in order, for the append path. */
  readonly additions: readonly TranscriptLine[];
  readonly written: number;
  readonly skipped: number;
  readonly messagesWritten: number;
  readonly messagesSkipped: number;
  /** A repeat changed a stored line, so the whole file must be rewritten. */
  readonly changed: boolean;
};

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

/**
 * Key order is not a change, and it is no longer this function's problem.
 *
 * `stored` was rebuilt by `internal/store.ts` from what is on disk; `next` is the
 * caller's own object. Comparing the two with `JSON.stringify` let a field ordering
 * difference alone set `changed`, and `changed` renames a whole new file over this
 * one — on 638 of 1,000 lines, measured. Defect D1, gate row 11.
 *
 * The fix was a key-sorting replacer: sort both sides, then compare. It worked, but
 * it treated the symptom — two producers of one type that could disagree about
 * shape. `internal/parse.ts` now holds one declaration that both decodes and
 * encodes, so `bytesOf` is canonical by construction and equal lines are equal
 * strings. ADR 006 step 3; the sorter is what it removes.
 */
const same = (stored: TranscriptLine, next: TranscriptLine): boolean =>
  bytesOf(stored) === bytesOf(next);

/**
 * Where each key already sits, by the order it sits in.
 *
 * A key is not unique: the same wall clock, sender and text is a message somebody
 * genuinely sent twice, and the second one is not a duplicate of the first. So a
 * key maps to every position holding it, and the nth incoming line with that key
 * is matched against the nth stored one.
 */
const positionsOf = (lines: readonly TranscriptLine[]): Map<string, number[]> => {
  const positions = new Map<string, number[]>();
  for (const [index, line] of lines.entries()) {
    const key = keyOf(line);
    const found = positions.get(key) ?? [];
    found.push(index);
    positions.set(key, found);
  }
  return positions;
};

export const reconcile = (
  stored: readonly TranscriptLine[],
  incoming: readonly TranscriptLine[],
): Reconciled => {
  const positions = positionsOf(stored);
  const occurrences = new Map<string, number>();
  const lines: TranscriptLine[] = [...stored];
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
      positions.set(key, [...(positions.get(key) ?? []), lines.length]);
      lines.push(line);
      additions.push(line);
      written++;
      if (line.kind === "message") messagesWritten++;
      continue;
    }

    skipped++;
    if (line.kind === "message") messagesSkipped++;
    const held = lines[index]!;
    const next = merged(held, line);
    if (!same(held, next)) {
      lines[index] = next;
      changed = true;
    }
  }

  return { lines, additions, written, skipped, messagesWritten, messagesSkipped, changed };
};
