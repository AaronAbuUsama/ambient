/**
 * Bytes into Blobs, one line at a time.
 *
 * Separated from the ordering because they are two decisions. `service.ts` owns
 * *when* Blobs are written relative to the Transcript; this owns *what a line
 * says* once its bytes have been dealt with — and the interesting case is the one
 * where they cannot be.
 */

import type { Blobs, DescribeBlobProblem } from "~/modules/blobs/types.ts";
import type { LiveLine, Mirror } from "~/modules/channel/types.ts";
import type { LiveMessage } from "~/modules/transcript/types.ts";

export type Stored =
  | { readonly line: LiveMessage; readonly hash?: string }
  /** The Blob store refused. The caller stops: a line without its bytes is a lie. */
  | { readonly refused: string };

/**
 * The Source said it held these bytes and the file is not there.
 *
 * `NoHandle` rather than `Failed`: the Source recorded a successful capture, so
 * this is our end of the arrangement failing, not WhatsApp's. Either way the line
 * still declares a media state — never no media, which would say the message had
 * none, and never `Stored`, which would name a Blob that is not there.
 */
const lost = (line: LiveMessage): LiveMessage => ({ ...line, media: { state: "NoHandle" } });

export const storeMedia = async (
  entry: LiveLine,
  mirror: Mirror,
  blobs: Blobs,
  describe: DescribeBlobProblem,
): Promise<Stored> => {
  if (entry.ref === undefined) return { line: entry.line };

  const bytes = await mirror.bytes(entry.ref);
  if (bytes === undefined) return { line: lost(entry.line) };

  const put = await blobs.put(bytes);
  if ("problems" in put) {
    return { refused: put.problems.map(describe).join("; ") };
  }
  return { line: { ...entry.line, media: { state: "Stored", hash: put.hash } }, hash: put.hash };
};
