import {
  describe as describeViolation,
  describeDocument,
  describeIndexFailure,
  index,
  lint,
  next,
  open,
  writeIndex,
} from "~/modules/knowledge/service.ts";
import type { Command } from "../command.ts";
import { message, misuse, report } from "../command.ts";

const USAGE =
  "usage: ambient ontology lint | ambient ontology next [--type=<type>] [--limit=<n>] | ambient ontology index";

/** The one flag shape `next` takes — `--name=value`, never space-separated. */
const flag = (args: readonly string[], name: string): string | undefined =>
  args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);

const knownFlag = (arg: string): boolean => arg.startsWith("--type=") || arg.startsWith("--limit=");

/**
 * `ambient ontology lint | next | index` — no logic here beyond argv shape.
 *
 * **The ontology is read once, by `home`.** `global.schema` is already the
 * parsed value; `knowledge.lint` consumes it and nothing re-parses the file.
 *
 * **A clean or empty result is an empty report, not an empty message.**
 * `doctor`'s shape, for `doctor`'s reason: an empty list exits `0` and prints
 * nothing, where a `message` would print a bare newline. That is what lets a
 * quiet work queue be cheap — nothing unreviewed, nothing printed, nothing
 * spent — and what lets a rebuilt index announce nothing on success.
 */
export const ontology: Command = async (home, rest) => {
  const [verb, ...args] = rest;

  if (verb === "lint") {
    if (args.length > 0) return misuse(USAGE);
    const global = home.read();
    if ("problems" in global) return report(global.problems);

    const documents = await open(home.knowledge).all();
    const found = "problems" in documents ? documents.problems : lint(global.schema, documents);
    return found.length === 0
      ? report([])
      : message(false, found.map(describeViolation).join("\n"));
  }

  if (verb === "next") {
    if (args.some((arg) => !knownFlag(arg))) return misuse(USAGE);
    const type = flag(args, "--type");
    const limitText = flag(args, "--limit");
    if (limitText !== undefined && !/^\d+$/.test(limitText)) return misuse(USAGE);
    const limit = limitText === undefined ? undefined : Number(limitText);

    const documents = await open(home.knowledge).all();
    if ("problems" in documents) {
      return message(false, documents.problems.map(describeViolation).join("\n"));
    }
    const found = next(documents, { type, limit });
    return found.length === 0 ? report([]) : message(true, found.map(describeDocument).join("\n"));
  }

  if (verb === "index") {
    if (args.length > 0) return misuse(USAGE);
    const documents = await open(home.knowledge).all();
    if ("problems" in documents) {
      return message(false, documents.problems.map(describeViolation).join("\n"));
    }
    const written = await writeIndex(home.index, index(documents));
    if ("problems" in written) {
      return message(false, written.problems.map(describeIndexFailure).join("\n"));
    }
    return report([]);
  }

  return misuse(USAGE);
};
