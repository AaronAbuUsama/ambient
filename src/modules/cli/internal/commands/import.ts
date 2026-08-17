/** Wire one Archive read into the one Write path. No parsing or path building. */

import {
  describe as describeArchive,
  openArchive,
  resolveMedia,
} from "~/modules/archive/service.ts";
import { describe as describeBlob, openBlobs } from "~/modules/blobs/service.ts";
import { describe as describeHome } from "~/modules/home/service.ts";
import { describe as describeTranscript, writeTranscript } from "~/modules/transcript/service.ts";
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

export const importArchive: Command = async (home, rest, defaultZone) => {
  const args = argsOf(rest, defaultZone);
  if (args === undefined) return usage();
  if (!home.chats().some((chat) => chat.slug === args.slug)) {
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
  const place = home.chat(args.slug).transcript();
  if ("problems" in place) return message(false, place.problems.map(describeHome).join("; "));
  const written = await writeTranscript(place, read.lines);
  if ("problems" in written) {
    return message(false, written.problems.map(describeTranscript).join("; "));
  }
  const unresolved =
    read.counts.unresolved === 0
      ? ""
      : `; ${read.counts.unresolved} unresolved Marker${read.counts.unresolved === 1 ? "" : "s"}`;
  return message(
    true,
    `Imported ${read.counts.messages} Messages into ${args.slug} using ${args.defaulted ? "default " : ""}Zone ${args.zone}${unresolved}`,
  );
};
