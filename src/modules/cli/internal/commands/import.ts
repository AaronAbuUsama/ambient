/** Wire one Archive read into the one Write path and persist its Receipt. */

import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";

import {
  describe as describeArchive,
  openArchive,
  resolveMedia,
} from "~/modules/archive/service.ts";
import type { ArchiveRead, OpenedArchive } from "~/modules/archive/types.ts";
import { describe as describeBlob, openBlobs } from "~/modules/blobs/service.ts";
import { describe as describeHome } from "~/modules/home/service.ts";
import type { Place } from "~/modules/home/types.ts";
import { describe as describeTranscript, writeTranscript } from "~/modules/transcript/service.ts";
import type { TranscriptWrite } from "~/modules/transcript/types.ts";
import type { Command } from "../command.ts";
import { message, misuse } from "../command.ts";

type ImportArgs = {
  readonly input: string;
  readonly slug: string;
  readonly zone: string;
  readonly defaulted: boolean;
};

const usage = (): ReturnType<typeof misuse> =>
  misuse("usage: ambient import <archive> --into <slug> [--zone <IANA>]");

const argsOf = (rest: readonly string[], defaultZone: string): ImportArgs | undefined => {
  const input = rest[0];
  if (input === undefined) return undefined;
  let slug: string | undefined;
  let zone = defaultZone;
  let defaulted = true;
  for (let index = 1; index < rest.length; index++) {
    const flag = rest[index];
    const value = rest[index + 1];
    if (flag === "--into" && value !== undefined && slug === undefined) slug = value;
    else if (flag === "--zone" && value !== undefined && defaulted) {
      zone = value;
      defaulted = false;
    } else return undefined;
    index++;
  }
  return slug === undefined ? undefined : { input, slug, zone, defaulted };
};

const causeOf = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

const atomic = async (target: string, bytes: Uint8Array | string): Promise<string | undefined> => {
  const temporary = `${target}.tmp-${randomUUID()}`;
  try {
    await fs.writeFile(temporary, bytes, { flag: "wx" });
    await fs.rename(temporary, target);
    return undefined;
  } catch (cause: unknown) {
    await fs.rm(temporary, { force: true }).catch(() => undefined);
    return causeOf(cause);
  }
};

const writeReceipt = async (
  root: Place,
  opened: OpenedArchive,
  read: ArchiveRead,
  written: TranscriptWrite,
  zone: string,
  defaulted: boolean,
): Promise<string | undefined> => {
  const dir = `${root.path}/${opened.sha256}`;
  const findings = [
    ...read.unparsed.map((line) => ({ kind: "unreadable-line" as const, ...line })),
    ...(read.counts.unresolved === 0
      ? []
      : [{ kind: "unresolved-markers" as const, count: read.counts.unresolved }]),
  ];
  const receipt = {
    archive: { sha256: opened.sha256, bytes: opened.bytes, form: opened.form },
    reader: { version: opened.readerVersion },
    zone: { name: zone, source: defaulted ? "default" : "given" },
    transcript: {
      messagesWritten: written.messages.written,
      messagesSkipped: written.messages.skipped,
      linesWritten: written.written,
      linesSkipped: written.skipped,
      span: read.span,
    },
    counts: read.counts,
    findings,
  };
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (cause: unknown) {
    return causeOf(cause);
  }
  return (
    (await atomic(`${dir}/_chat.txt`, opened.primary)) ??
    (await atomic(`${dir}/receipt.json`, `${JSON.stringify(receipt, undefined, 2)}\n`))
  );
};

export const importArchive: Command = async (home, rest, defaultZone) => {
  const args = argsOf(rest, defaultZone);
  if (args === undefined) return usage();
  const chat = home.chats().find((found) => found.slug === args.slug);
  if (chat === undefined) {
    return message(
      false,
      `Chat "${args.slug}" does not exist; run \`ambient chat add ${args.slug}\` first`,
    );
  }

  const opened = await openArchive(args.input, args.zone);
  if ("problems" in opened) {
    return message(false, opened.problems.map(describeArchive).join("; "));
  }
  const wanted = new Set(opened.read.markers.map((marker) => marker.name));
  const hashes = new Map<string, string>();
  const blobs = openBlobs(home.blobs);
  for (const entry of opened.media) {
    if (!wanted.has(entry.name)) continue;
    const source = await entry.open();
    if ("problems" in source) {
      opened.close();
      return message(false, source.problems.map(describeArchive).join("; "));
    }
    const stored = await blobs.put(source);
    if ("problems" in stored) {
      opened.close();
      return message(false, stored.problems.map(describeBlob).join("; "));
    }
    hashes.set(entry.name, stored.hash);
  }
  const read = resolveMedia(opened.read, hashes);
  opened.close();
  const place = chat.transcript();
  if ("problems" in place) return message(false, place.problems.map(describeHome).join("; "));
  const written = await writeTranscript(place, read.lines);
  if ("problems" in written) {
    return message(false, written.problems.map(describeTranscript).join("; "));
  }
  const imports = chat.imports();
  if ("problems" in imports) {
    return message(false, imports.problems.map(describeHome).join("; "));
  }
  const receiptFailure = await writeReceipt(
    imports,
    opened,
    read,
    written,
    args.zone,
    args.defaulted,
  );
  if (receiptFailure !== undefined) {
    return message(false, `Import receipt is unwritable: ${receiptFailure}`);
  }
  const unreadable =
    read.unparsed.length === 0
      ? ""
      : `; ${read.unparsed.length} unreadable line${read.unparsed.length === 1 ? "" : "s"} at ${read.unparsed.map(({ line }) => line).join(", ")}`;
  const unresolved =
    read.counts.unresolved === 0
      ? ""
      : `; ${read.counts.unresolved} unresolved Marker${read.counts.unresolved === 1 ? "" : "s"}`;
  return message(
    true,
    `Imported ${read.counts.messages} Messages into ${args.slug} using ${args.defaulted ? "default " : ""}Zone ${args.zone}${unreadable}${unresolved}`,
  );
};
