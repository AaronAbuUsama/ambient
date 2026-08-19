/**
 * The History Import operation. Read [`types.ts`](./types.ts) first.
 *
 * The order of the writes is the thing this module owns, and it is deliberate:
 * Blobs, then Transcript, then primary source, then Receipt.
 */

import {
  describe as describeArchive,
  openArchive,
  resolveMedia,
} from "~/modules/archive/service.ts";
import { describe as describeBlob, openBlobs } from "~/modules/blobs/service.ts";
import { describe as describeTranscript, writeTranscript } from "~/modules/transcript/service.ts";
import { persist } from "./internal/receipt.ts";
import type {
  DescribeImportProblem,
  ImportFailure,
  ImportProblem,
  RunImport,
  Summarise,
} from "./types.ts";

const fail = (problem: ImportProblem): ImportFailure => ({ problems: [problem] });

export const runImport: RunImport = async (request) => {
  const opened = await openArchive(request.file, request.zone);
  if ("problems" in opened) {
    return fail({ _tag: "Unreadable", detail: opened.problems.map(describeArchive).join("; ") });
  }

  // Only Markers the Transcript will reference are worth storing: an Archive may carry
  // files no message names.
  const wanted = new Set(opened.read.markers.map((marker) => marker.name));
  const hashes = new Map<string, string>();
  const blobs = openBlobs(request.blobs);
  for (const entry of opened.media) {
    if (!wanted.has(entry.name)) continue;
    const source = await entry.open();
    if ("problems" in source) {
      opened.close();
      return fail({ _tag: "Unreadable", detail: source.problems.map(describeArchive).join("; ") });
    }
    const stored = await blobs.put(source);
    if ("problems" in stored) {
      opened.close();
      return fail({ _tag: "BlobRefused", detail: stored.problems.map(describeBlob).join("; ") });
    }
    hashes.set(entry.name, stored.hash);
  }

  const read = resolveMedia(opened.read, hashes);
  opened.close();

  const written = await writeTranscript(request.transcript, read.lines);
  if ("problems" in written) {
    return fail({
      _tag: "TranscriptRefused",
      detail: written.problems.map(describeTranscript).join("; "),
    });
  }

  const findings = [
    ...read.unparsed.map((line) => ({ kind: "unreadable-line" as const, ...line })),
    ...(read.counts.unresolved === 0
      ? []
      : [{ kind: "unresolved-markers" as const, count: read.counts.unresolved }]),
  ];

  const persisted = await persist(
    {
      dir: `${request.imports.path}/${opened.sha256}`,
      sha256: opened.sha256,
      bytes: opened.bytes,
      form: opened.form,
      readerVersion: opened.readerVersion,
      zone: { name: request.zone, given: request.zoneGiven },
      primary: opened.primary,
      counts: read.counts,
      span: read.span,
      written: written.written,
      skipped: written.skipped,
      messagesWritten: written.messages.written,
      messagesSkipped: written.messages.skipped,
      findings,
    },
    new Date().toISOString(),
  );
  if (persisted.cause !== undefined) {
    return fail({ _tag: "ReceiptUnwritable", cause: persisted.cause });
  }

  return {
    written: written.written,
    skipped: written.skipped,
    messages: read.counts.messages,
    events: read.counts.events,
    markers: {
      seen: read.counts.markers,
      resolved: read.counts.resolved,
      unresolved: read.counts.unresolved,
    },
    blobs: new Set(hashes.values()).size,
    unreadable: read.unparsed.map(({ line }) => line),
    zone: { name: request.zone, given: request.zoneGiven },
    rerun: persisted.rerun,
  };
};

export const describe: DescribeImportProblem = (problem) => {
  switch (problem._tag) {
    case "Unreadable":
      return `the Archive could not be read: ${problem.detail}`;
    case "BlobRefused":
      return `media could not be stored: ${problem.detail}`;
    case "TranscriptRefused":
      return `the Transcript could not be written: ${problem.detail}`;
    case "ReceiptUnwritable":
      return `the import is not durable — its Receipt is unwritable: ${problem.cause}`;
  }
};

const plural = (n: number, one: string): string => `${n} ${one}${n === 1 ? "" : "s"}`;

export const summarise: Summarise = (report, into) => {
  const resolved =
    report.markers.resolved === 0
      ? ""
      : `; ${plural(report.markers.resolved, "Marker")} resolved to ${plural(report.blobs, "Blob")}`;
  const unresolved =
    report.markers.unresolved === 0
      ? ""
      : `; ${plural(report.markers.unresolved, "unresolved Marker")}`;
  const unreadable =
    report.unreadable.length === 0
      ? ""
      : `; ${plural(report.unreadable.length, "unreadable line")} at ${report.unreadable.join(", ")}`;
  const zone = `${report.zone.given ? "" : "default "}Zone ${report.zone.name}`;
  const head = report.rerun
    ? `Re-imported: ${plural(report.skipped, "line")} already present, ${report.written} written`
    : `Imported ${plural(report.messages, "Message")} and ${plural(report.events, "Event")} (${plural(report.written, "Transcript line")})`;
  return `${head} into ${into} using ${zone}${resolved}${unreadable}${unresolved}`;
};
