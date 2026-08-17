import { describe as describeHome } from "~/modules/home/service.ts";
import { describe as describeImport, runImport, summarise } from "~/modules/import/service.ts";
import type { Command } from "../command.ts";
import { message, misuse } from "../command.ts";

/**
 * `ambient import <archive> --into <slug> [--zone <IANA>]` — one call to
 * [`import`](../../../import/types.ts).
 *
 * Argv in, one outcome out. **The operation is not here**: opening the Archive, storing
 * Blobs, writing the Transcript and persisting the Receipt are ordered writes with a
 * meaningful crash story, and they belong to a module that owns that order. This file
 * once held all of it and reached 176 lines against 8, 8, 12 and 14 for its siblings,
 * which had quietly made `cli` the composition owner its own README says it is not.
 */

type ImportArgs = {
  readonly input: string;
  readonly slug: string;
  readonly zone: string;
  readonly given: boolean;
};

const argsOf = (rest: readonly string[], defaultZone: string): ImportArgs | undefined => {
  const input = rest[0];
  if (input === undefined) return undefined;
  let slug: string | undefined;
  let zone = defaultZone;
  let given = false;
  for (let index = 1; index < rest.length; index++) {
    const flag = rest[index];
    const value = rest[index + 1];
    if (flag === "--into" && value !== undefined && slug === undefined) slug = value;
    else if (flag === "--zone" && value !== undefined && !given) {
      zone = value;
      given = true;
    } else return undefined;
    index++;
  }
  return slug === undefined ? undefined : { input, slug, zone, given };
};

export const importArchive: Command = async (home, rest, defaultZone) => {
  const args = argsOf(rest, defaultZone);
  if (args === undefined) {
    return misuse("usage: ambient import <archive> --into <slug> [--zone <IANA>]");
  }

  const chat = home.chats().find((found) => found.slug === args.slug);
  if (chat === undefined) {
    return message(
      false,
      `Chat "${args.slug}" does not exist; run \`ambient chat add ${args.slug}\` first`,
    );
  }

  const transcript = chat.transcript();
  if ("problems" in transcript)
    return message(false, transcript.problems.map(describeHome).join("; "));
  const imports = chat.imports();
  if ("problems" in imports) return message(false, imports.problems.map(describeHome).join("; "));

  const report = await runImport({
    file: args.input,
    transcript,
    imports,
    blobs: home.blobs,
    zone: args.zone,
    zoneGiven: args.given,
  });
  return "problems" in report
    ? message(false, report.problems.map(describeImport).join("; "))
    : message(true, summarise(report, args.slug));
};
