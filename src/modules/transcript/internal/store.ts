import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";

import type { Place } from "~/modules/home/types.ts";
import { bytesOf, lineOf } from "./parse.ts";
import type { TranscriptLine, TranscriptProblemDetail } from "../types.ts";

type Loaded = {
  readonly lines: readonly TranscriptLine[];
  readonly completeText: string;
  readonly torn: boolean;
};

export type LoadResult = Loaded | { readonly problem: TranscriptProblemDetail };

const causeOf = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

/** The one question this module asks of a caught error: was the file simply absent? */
const isMissing = (cause: unknown): boolean =>
  cause instanceof Error && "code" in cause && cause.code === "ENOENT";

export const load = async (place: Place): Promise<LoadResult> => {
  let text: string;
  try {
    text = await fs.readFile(place.path, "utf8");
  } catch (cause: unknown) {
    if (isMissing(cause)) return { lines: [], completeText: "", torn: false };
    return { problem: { _tag: "Unreadable", cause: causeOf(cause) } };
  }
  const lastNewline = text.lastIndexOf("\n");
  const completeText = lastNewline === -1 ? "" : text.slice(0, lastNewline + 1);
  const rows = completeText === "" ? [] : completeText.split("\n").slice(0, -1);
  const lines: TranscriptLine[] = [];
  for (const [index, row] of rows.entries()) {
    // `lineOf` owns both failures — unparseable JSON and JSON that is not a line
    // are one answer here, and always have been: the same `MalformedLine`.
    const line = lineOf(row);
    if (line === undefined) return { problem: { _tag: "MalformedLine", line: index + 1 } };
    lines.push(line);
  }
  return { lines, completeText, torn: completeText.length !== text.length };
};

/** Canonical bytes, from the one declaration in `parse.ts`. */
const encoded = (lines: readonly TranscriptLine[]): string =>
  lines.map((line) => `${bytesOf(line)}\n`).join("");

export const append = async (
  place: Place,
  loaded: Loaded,
  lines: readonly TranscriptLine[],
): Promise<TranscriptProblemDetail | undefined> => {
  try {
    if (loaded.torn) await fs.truncate(place.path, Buffer.byteLength(loaded.completeText));
    await fs.appendFile(place.path, encoded(lines), "utf8");
    return undefined;
  } catch (cause: unknown) {
    return { _tag: "Unwritable", cause: causeOf(cause) };
  }
};

export const replace = async (
  place: Place,
  lines: readonly TranscriptLine[],
): Promise<TranscriptProblemDetail | undefined> => {
  const temporary = `${place.path}.tmp-${randomUUID()}`;
  try {
    await fs.writeFile(temporary, encoded(lines), { encoding: "utf8", flag: "wx" });
    await fs.rename(temporary, place.path);
    return undefined;
  } catch (cause: unknown) {
    await fs.rm(temporary, { force: true }).catch(() => undefined);
    return { _tag: "Unwritable", cause: causeOf(cause) };
  }
};
