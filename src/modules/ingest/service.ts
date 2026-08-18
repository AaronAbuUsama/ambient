/**
 * The Continuous Ingestion operation. Read [`types.ts`](./types.ts) first.
 *
 * The order of the writes is the thing this module owns: Blobs, then the
 * Transcript, in one call.
 */

import { describe as describeBlob, openBlobs } from "~/modules/blobs/service.ts";
import { describe as describeChannel, openMirror } from "~/modules/channel/service.ts";
import { describe as describeTranscript, writeTranscript } from "~/modules/transcript/service.ts";
import type { TranscriptLine } from "~/modules/transcript/types.ts";
import { storeMedia } from "./internal/media.ts";
import type { Describe, IngestFailure, IngestProblem, RunIngest, Summarise } from "./types.ts";

const fail = (problem: IngestProblem): IngestFailure => ({ problems: [problem] });

export const runIngest: RunIngest = async (request) => {
  const mirror = await openMirror(request.account);
  if ("problems" in mirror) {
    return fail({
      _tag: "ChannelRefused",
      detail: mirror.problems.map(describeChannel).join("; "),
    });
  }

  const read = await mirror.read(request.peer);
  if ("problems" in read) {
    await mirror.close();
    return fail({ _tag: "ChannelRefused", detail: read.problems.map(describeChannel).join("; ") });
  }

  // Blobs first, and every one before a single line is written. A Blob with no
  // line referencing it is bytes the store already tolerates; a line naming a
  // Blob that is not there is a Transcript that lies, and nothing goes back for it.
  const blobs = openBlobs(request.blobs);
  const hashes = new Set<string>();
  const lines: TranscriptLine[] = [];
  let seen = 0;
  let stored = 0;
  for (const entry of read.lines) {
    if (entry.line.media !== undefined) seen++;
    const put = await storeMedia(entry, mirror, blobs, describeBlob);
    if ("refused" in put) {
      await mirror.close();
      return fail({ _tag: "BlobRefused", detail: put.refused });
    }
    if (put.hash !== undefined) {
      hashes.add(put.hash);
      stored++;
    }
    lines.push(put.line);
  }
  await mirror.close();

  // ONE call with every line. 372,721 lines/s batched against 10 one at a time.
  const written = await writeTranscript(request.transcript, lines);
  if ("problems" in written) {
    return fail({
      _tag: "TranscriptRefused",
      detail: written.problems.map(describeTranscript).join("; "),
    });
  }

  return {
    written: written.written,
    skipped: written.skipped,
    read: read.lines.length,
    revision: read.revision,
    media: { seen, stored, unresolved: seen - stored },
    blobs: hashes.size,
  };
};

export const describe: Describe = (problem) => {
  switch (problem._tag) {
    case "ChannelRefused":
      return `the account could not be read: ${problem.detail}`;
    case "BlobRefused":
      return `media could not be stored, so nothing was written: ${problem.detail}`;
    case "TranscriptRefused":
      return `the Transcript could not be written: ${problem.detail}`;
  }
};

const plural = (n: number, one: string): string => `${String(n)} ${one}${n === 1 ? "" : "s"}`;

export const summarise: Summarise = (report, into) => {
  const media =
    report.media.seen === 0
      ? ""
      : `; ${plural(report.media.stored, "attachment")} stored as ${plural(report.blobs, "Blob")}`;
  const unresolved =
    report.media.unresolved === 0
      ? ""
      : `; ${plural(report.media.unresolved, "attachment")} the Source no longer holds`;
  const head =
    report.written === 0
      ? `Re-ingested: ${plural(report.skipped, "line")} already present, 0 written`
      : `Ingested ${plural(report.written, "Transcript line")} of ${plural(report.read, "read")}`;
  return `${head} into ${into} at revision ${String(report.revision)}${media}${unresolved}`;
};
