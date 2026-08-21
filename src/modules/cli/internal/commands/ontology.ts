import { describe as describeViolation, lint, open } from "~/modules/knowledge/service.ts";
import type { Command } from "../command.ts";
import { message, misuse, report } from "../command.ts";

/**
 * `ambient ontology lint` — frontmatter against `schema.yaml`, and no logic here.
 *
 * **The ontology is read once, by `home`.** `global.schema` is already the parsed
 * value; `knowledge.lint` consumes it and nothing re-parses the file.
 *
 * **A clean base is an empty report, not an empty message.** `doctor`'s shape,
 * for `doctor`'s reason: an empty list exits `0` and prints nothing, where a
 * `message` would print a bare newline. Gate row 9 asks for nothing.
 */
export const ontology: Command = async (home, rest) => {
  const [verb, ...args] = rest;
  if (verb !== "lint" || args.length > 0) return misuse("usage: ambient ontology lint");

  const global = home.read();
  if ("problems" in global) return report(global.problems);

  const documents = await open(home.knowledge).all();
  const found = "problems" in documents ? documents.problems : lint(global.schema, documents);

  return found.length === 0 ? report([]) : message(false, found.map(describeViolation).join("\n"));
};
