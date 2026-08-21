/** `knowledge` assembly. The interface is `types.ts`. */

import { readAll } from "./internal/documents.ts";
import { buildIndex, writeIndexTo } from "./internal/index.ts";
import { violationsIn } from "./internal/lint.ts";
import { writeObservations } from "./internal/write.ts";
import type {
  BuildIndex,
  DescribeDocument,
  DescribeIndexFailure,
  DescribeViolation,
  IndexFailure,
  Lint,
  Next,
  Open,
  Violation,
  ViolationDetail,
  WriteIndex,
} from "./types.ts";

/** Builds no path and reads nothing: the `Place` is the whole grant. */
export const open: Open = (place) => ({
  all: () => readAll(place),
  write: (schema, observations) => writeObservations(place, schema, observations),
});

export const lint: Lint = (schema, docs) =>
  docs.flatMap((document) => violationsIn(schema, document));

/** The work queue: a frontmatter status and nothing more. */
export const next: Next = (docs, query) =>
  docs
    .filter((document) => document.frontmatter.status === "unreviewed")
    .filter(
      (document) =>
        query.type === undefined || document.type.toLowerCase() === query.type.toLowerCase(),
    )
    .slice(0, query.limit);

export const index: BuildIndex = (docs) => buildIndex(docs);

/** The `Place` is passed explicitly: it is outside the base `open` was granted for. */
export const writeIndex: WriteIndex = (place, built) => writeIndexTo(place, built);

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
    case "NoFolder":
      return `no declared folder for type "${detail.type}"`;
    case "Collides":
      return `slug "${detail.slug}" is already taken by ${detail.with}`;
  }
};

/** Rendering lives in `knowledge` — `cli`'s README forbids it building strings. */
export const describe: DescribeViolation = (violation) =>
  `${where(violation)}: ${said(violation.detail)}`;

/** One line per document, for the work queue — `at` is what a person opens. */
export const describeDocument: DescribeDocument = (document) => document.at;

export const describeIndexFailure: DescribeIndexFailure = (failure: IndexFailure) =>
  `index.json: unwritable — ${failure.cause}`;
