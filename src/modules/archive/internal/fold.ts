/**
 * Physical lines to Archive lines — the fold, and the only place it is done.
 *
 * An Archive is not one message per line. A message opens on a line that carries
 * a wall clock and a sender, and every line after it that carries neither is a
 * continuation of that message. So reading one is a fold with exactly one piece
 * of state: the message currently open.
 *
 * This was a loop inside `readArchive` with the close step written as a nested
 * arrow. It is here so that the open, the continuation and the close each have a
 * name, and so `readArchive` reads as guards, fold, tally.
 */

import type { ArchiveLine } from "~/modules/transcript/types.ts";
import { classify, type ArchiveBase } from "./classify.ts";
import { cleanBody, type RawLine } from "./line.ts";
import type { UnparsedLine } from "../types.ts";

export type Folded = {
  readonly lines: readonly ArchiveLine[];
  readonly markers: readonly { readonly line: number; readonly name: string }[];
  readonly unparsed: readonly UnparsedLine[];
  readonly continuations: number;
};

/** What the fold needs in order to turn one opening line into a Message. */
export type Opening = (raw: RawLine, line: number) => ArchiveBase | UnparsedLine;

/**
 * The state the fold carries, made explicit rather than held in closure.
 *
 * `open` is the one mutable thing, and it is mutable because a continuation is
 * only recognisable *after* the line that follows it — the message cannot be
 * closed until something else opens or the text runs out.
 */
type Fold = {
  open: ArchiveBase | undefined;
  readonly lines: ArchiveLine[];
  readonly markers: { line: number; name: string }[];
  readonly unparsed: UnparsedLine[];
  continuations: number;
};

/** Finish the open message, if there is one, and record any Marker it named. */
const close = (fold: Fold): void => {
  if (fold.open !== undefined) {
    const classified = classify({ ...fold.open, text: fold.open.text.trimEnd() });
    const at = fold.lines.push(classified.line) - 1;
    if (classified.marker !== undefined) fold.markers.push({ line: at, name: classified.marker });
  }
  fold.open = undefined;
};

/**
 * Read every physical line into Archive lines.
 *
 * `matched[index]` is the parse of `sources[index]`, already done once by the
 * caller so it is not repeated here. A row with candidates opens a message;
 * anything else continues the open one, or is unparsed when none is open.
 */
export const foldLines = (
  sources: readonly string[],
  matched: readonly (RawLine | undefined)[],
  opening: Opening,
): Folded => {
  const fold: Fold = { open: undefined, lines: [], markers: [], unparsed: [], continuations: 0 };

  for (const [index, source] of sources.entries()) {
    const raw = matched[index];
    if (raw !== undefined && raw.candidates.length > 0) {
      close(fold);
      const opened = opening(raw, index + 1);
      if ("reason" in opened) fold.unparsed.push(opened);
      else fold.open = opened;
      continue;
    }
    if (fold.open === undefined) {
      if (source.trim() !== "") fold.unparsed.push({ line: index + 1, reason: "no-message" });
      continue;
    }
    fold.open = { ...fold.open, text: `${fold.open.text}\n${cleanBody(source)}` };
    fold.continuations++;
  }
  close(fold);

  return fold;
};
