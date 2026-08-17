/** Wire one Archive read into the one Write path. No parsing or path building. */

import * as fs from "node:fs/promises";

import { describe as describeArchive, readArchive } from "~/modules/archive/service.ts";
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

const causeOf = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

export const importArchive: Command = async (home, rest, defaultZone) => {
  const args = argsOf(rest, defaultZone);
  if (args === undefined) return usage();
  if (!home.chats().some((chat) => chat.slug === args.slug)) {
    return message(
      false,
      `Chat "${args.slug}" does not exist; run \`ambient chat add ${args.slug}\` first`,
    );
  }

  let text: string;
  try {
    text = await fs.readFile(args.input, "utf8");
  } catch (cause: unknown) {
    return message(false, `Archive is unreadable: ${causeOf(cause)}`);
  }

  const read = readArchive(text, args.zone);
  if ("problems" in read) return message(false, read.problems.map(describeArchive).join("; "));
  const place = home.chat(args.slug).transcript();
  if ("problems" in place) return message(false, place.problems.map(describeHome).join("; "));
  const written = await writeTranscript(place, read.messages);
  if ("problems" in written) {
    return message(false, written.problems.map(describeTranscript).join("; "));
  }
  return message(
    true,
    `Imported ${read.messages.length} Messages into ${args.slug} using ${args.defaulted ? "default " : ""}Zone ${args.zone}`,
  );
};
