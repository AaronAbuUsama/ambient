/** `knowledge` assembly. The interface is `types.ts`. */

import { readAll } from "./internal/documents.ts";
import { violationsIn } from "./internal/lint.ts";
import type { DescribeViolation, Lint, Open, Violation, ViolationDetail } from "./types.ts";

/** Builds no path and reads nothing: the `Place` is the whole grant. */
export const open: Open = (place) => ({ all: () => readAll(place) });

export const lint: Lint = (schema, docs) =>
  docs.flatMap((document) => violationsIn(schema, document));

/** A malformed block is the one problem a person fixes by looking at a position. */
const where = (violation: Violation): string =>
  violation.detail._tag === "Malformed" ? `${violation.at}:${violation.detail.line}` : violation.at;

const said = (detail: ViolationDetail): string => {
  switch (detail._tag) {
    case "Unreadable":
      return `unreadable — ${detail.cause}`;
    case "NoFrontmatter":
      return "no frontmatter block";
    case "Escapes":
      return "not a regular file — the base is read from files, never through a link or a pipe";
    case "Malformed":
      return detail.detail;
    case "UnknownType":
      return `unknown type "${detail.type}" (known: ${detail.known.join(", ")})`;
    case "MissingKey":
      return `missing key "${detail.key}" — expected ${detail.expected}`;
    case "UnknownKey":
      return `unknown key "${detail.key}" (known: ${detail.known.join(", ")})`;
    case "BadValue":
      return `${detail.key} must be ${detail.expected}, got "${detail.got}"`;
  }
};

/** Rendering lives in `knowledge` — `cli`'s README forbids it building strings. */
export const describe: DescribeViolation = (violation) =>
  `${where(violation)}: ${said(violation.detail)}`;
