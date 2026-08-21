/**
 * The base on disk: walk it, split the fence, decode the block. The only file in
 * `knowledge` that opens anything.
 *
 * **A document is a `.md` file with a YAML frontmatter block, and nothing else.**
 * Measured, not assumed: `ok preview` and `ok lint` found and passed a document in
 * a directory with no `.ok/` at all, and derived its title from the `# H1`. There
 * is no manifest to be listed in and no naming convention to honour
 * ([ADR 007](../../../../docs/adr/007-knowledge-is-files-not-a-client.md)).
 *
 * **`Schema` is the parse boundary** ([ADR 006](../../../../docs/adr/006-schema-is-the-parse-boundary.md)).
 * `yaml` turns text into data; `Schema` says whether the data is a frontmatter
 * block, so nothing downstream of `all()` narrows anything or sees `unknown`.
 */

import * as fs from "node:fs/promises";

import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import type { Issue } from "effect/SchemaIssue";
import { parseDocument } from "yaml";

import { causeOf } from "~/modules/failure/service.ts";
import type { Place } from "~/modules/home/types.ts";
import type { Document, Field, Frontmatter, KnowledgeProblem, Violation } from "../types.ts";

/**
 * The two keys every document carries whatever its type. `type` says which
 * `SchemaType` applies and **no type declares it**. `name` is the identity half,
 * and three of the six declare it — `Person`, `Organization`, `Chat` — while
 * `Commitment`, `Issue` and `Media` do not. So `name` cannot be *only* an
 * ontology field: a Commitment still has one, because identity is `(type, name)`
 * and never a path.
 *
 * Always **known**, which is not the same as always optional: where a type
 * declares `name`, that declaration is in `declared.fields` and still makes it
 * required. `lint` enforces it there.
 */
export const META = ["type", "name"] as const;

/** A list, or the one string every other field form is. `typeof` is not how we ask. */
export const isList = (value: Field): value is readonly string[] => Array.isArray(value);

/** The closed value space of a frontmatter block — `schema.yaml` has no third form. */
const Block = Schema.Record(
  Schema.String,
  Schema.Union([Schema.String, Schema.Array(Schema.String)]),
);

const decodeBlock = Schema.decodeUnknownResult(Block, { errors: "all", reportInput: true });

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/** Anything under a dot-directory is tooling — `.ok/` above all — never a document. */
const HIDDEN = /(?:^|\/)\./;

const EXPECTED = "text or a list of text";

const one = (at: string, detail: Violation["detail"]): KnowledgeProblem => ({
  problems: [{ at, detail }],
});

/** What a person sees in `got "…"`. Never a stringified object. */
const gotOf = (issue: Issue): string => {
  const value: unknown = "input" in issue ? issue.input : undefined;
  if (value === null || value === undefined) return "nothing";
  if (Array.isArray(value)) return "a list";
  if (value instanceof Object) return "a mapping";
  // SAFETY: null, undefined, arrays and every object have returned above, and
  // those are exhaustive over the non-primitives — so what reaches here is a
  // primitive, whose `String` is the text a person should read. `home`'s own
  // `internal/yaml.ts` narrows the identical position the identical way.
  return String(value as string | number | boolean | bigint | symbol);
};

/** `Composite` fans out, `Pointer` names the key, and every leaf is one bad value. */
const detailsOf = (at: string, issue: Issue, key: string): readonly Violation[] => {
  switch (issue._tag) {
    case "Composite":
      return issue.issues.flatMap((inner) => detailsOf(at, inner, key));
    case "Pointer":
      return detailsOf(at, issue.issue, issue.path.map(String).join("."));
    default:
      return [{ at, detail: { _tag: "BadValue", key, expected: EXPECTED, got: gotOf(issue) } }];
  }
};

const firstLine = (message: string): string =>
  (message.split("\n")[0] ?? message).replace(/ at line \d+, column \d+:?$/, "");

/** Identity is read out of the frontmatter, never derived from the path. */
const identified = (
  at: string,
  frontmatter: Frontmatter,
  body: string,
): Document | KnowledgeProblem => {
  const problems: Violation[] = [];
  const identity: Record<string, string> = {};
  for (const key of META) {
    if (!Object.hasOwn(frontmatter, key)) {
      problems.push({ at, detail: { _tag: "MissingKey", key, expected: "text" } });
      continue;
    }
    const value = frontmatter[key];
    if (isList(value)) {
      problems.push({ at, detail: { _tag: "BadValue", key, expected: "text", got: "a list" } });
      continue;
    }
    identity[key] = value;
  }
  return problems.length > 0
    ? { problems }
    : { at, type: identity.type, name: identity.name, frontmatter, body };
};

const documentOf = (at: string, text: string): Document | KnowledgeProblem => {
  const fenced = FENCE.exec(text);
  if (fenced === null) return one(at, { _tag: "NoFrontmatter" });

  const parsed = parseDocument(fenced[1], { prettyErrors: true });
  if (parsed.errors.length > 0) {
    return {
      problems: parsed.errors.map((error) => ({
        at,
        detail: {
          _tag: "Malformed" as const,
          // The block starts on the file's second line, so a person is told where
          // to look in the file they opened, not in a substring they cannot see.
          line: (error.linePos?.[0].line ?? 1) + 1,
          column: error.linePos?.[0].col,
          detail: `malformed YAML — ${firstLine(error.message)}`,
        },
      })),
    };
  }

  const decoded = decodeBlock(parsed.toJS());
  return Result.isFailure(decoded)
    ? { problems: detailsOf(at, decoded.failure.issue, "") }
    : identified(at, decoded.success, text.slice(fenced[0].length));
};

/**
 * `lstat` and not `stat`, and before the read rather than after it. `readFile`
 * follows a symlink, so `person/link.md -> /etc/passwd` would be ingested as a
 * document and its body returned — the `Place` names a directory, and following a
 * link out of it hands back bytes the grant never covered. Refused unread.
 */
const readOne = async (root: string, at: string): Promise<Document | KnowledgeProblem> => {
  try {
    if (!(await fs.lstat(`${root}/${at}`)).isFile()) return one(at, { _tag: "Escapes" });
    return documentOf(at, await fs.readFile(`${root}/${at}`, "utf8"));
  } catch (cause: unknown) {
    return one(at, { _tag: "Unreadable", cause: causeOf(cause) });
  }
};

const filesIn = async (root: string): Promise<readonly string[] | KnowledgeProblem> => {
  try {
    const found = await fs.readdir(root, { recursive: true });
    return found.filter((at) => at.endsWith(".md") && !HIDDEN.test(at)).sort();
  } catch (cause: unknown) {
    return one(".", { _tag: "Unreadable", cause: causeOf(cause) });
  }
};

/** Sorted, so the list a person reads and the list a test pins are the same list. */
export const readAll = async (place: Place): Promise<readonly Document[] | KnowledgeProblem> => {
  const files = await filesIn(place.path);
  if ("problems" in files) return files;

  const documents: Document[] = [];
  const problems: Violation[] = [];
  for (const at of files) {
    const read = await readOne(place.path, at);
    if ("problems" in read) problems.push(...read.problems);
    else documents.push(read);
  }
  return problems.length > 0 ? { problems } : documents;
};
