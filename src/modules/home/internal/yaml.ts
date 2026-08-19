/**
 * YAML in, a decoded value out. `Schema` is the parse boundary — [ADR 006](../../../../docs/adr/006-schema-is-the-parse-boundary.md).
 *
 * **`unknown` never crosses a signature here.** Text goes in and a `Checked<T>`
 * comes out, so nothing downstream narrows anything and nothing needs a type
 * assertion to proceed. The eight hand-written combinators this replaced —
 * `record`, `text`, `textList`, `textMap`, `oneOf`, `need`, `unknownKeys`,
 * `done` — are the ~130 lines ADR 006 falsifier 1 was measured against.
 *
 * **We keep the `yaml` package.** Effect ships no YAML lexer and does not need
 * to: turning text into data stays `yaml`'s job, and checking that the data has
 * the right shape becomes Schema's.
 *
 * **Two things stay ours.** The words a person reads in `got "…"` are
 * presentation, and `ProblemDetail` is this repo's own vocabulary — `doctor`
 * prints it. Mapping a Schema issue onto one is the `detailsOf` walk below.
 */

import * as Result from "effect/Result";
import { decodeUnknownResult } from "effect/Schema";
import type { Codec } from "effect/Schema";
import type { AST, Union } from "effect/SchemaAST";
import type { Issue } from "effect/SchemaIssue";
import { parseDocument } from "yaml";

import type { Checked } from "./problem.ts";
import type { ProblemDetail } from "../types.ts";

/**
 * Every problem in the file rather than the first, because `doctor` reports a
 * Config file's faults at one time; an unknown key as a named problem rather
 * than a silently dropped field; and the offending value retained, so a person
 * is told what was actually found.
 */
const OPTIONS = { errors: "all", onExcessProperty: "error", reportInput: true } as const;

/** `sources.personal.allow[0]` — the form every `ProblemDetail.key` already uses. */
const keyOf = (path: readonly PropertyKey[]): string =>
  path.reduce<string>(
    (at, step) =>
      Number.isInteger(step)
        ? `${at}[${String(step)}]`
        : at === ""
          ? String(step)
          : `${at}.${String(step)}`,
    "",
  );

/**
 * What a person sees in `got "…"`. Never a stringified object.
 *
 * It takes the `Issue` rather than the value so that no signature in this module
 * accepts `unknown`, and it asks `Array.isArray` / `instanceof Object` rather
 * than `typeof`: a primitive string, number or boolean falls through to
 * `String`, which is the answer we want for all three.
 */
const gotOf = (issue: Issue): string => {
  const value: unknown = "input" in issue ? issue.input : undefined;
  if (value === null || value === undefined) return "nothing";
  if (Array.isArray(value)) return "a list";
  if (value instanceof Object) return "a mapping";
  // SAFETY: null, undefined, arrays and every object have returned above, and
  // those are exhaustive over the non-primitives — so what reaches here is a
  // primitive, whose `String` is the text a person should read. TypeScript does
  // not narrow `unknown` through `instanceof`, which is the only reason the
  // assertion is needed to say what the three returns above already established.
  return String(value as string | number | boolean | bigint | symbol);
};

/** The literals of a union, in the `one of a|b` form the gate already pins. */
const literalsOf = (ast: Union<AST>): readonly string[] =>
  ast.types.flatMap((type) => (type._tag === "Literal" ? [String(type.literal)] : []));

/** This repo's words for a form, not Schema's. `doctor`'s reader has not changed. */
const expectedOf = (ast: AST | undefined): string => {
  if (ast === undefined) return "a valid value";
  switch (ast._tag) {
    case "String":
      return "text";
    case "Number":
      return "a number";
    case "Boolean":
      return "true or false";
    case "Objects":
      return "a mapping";
    case "Union": {
      const literals = literalsOf(ast);
      return literals.length > 0 ? `one of ${literals.join("|")}` : "a valid value";
    }
    default:
      return "a valid value";
  }
};

/** The closed key set an `UnexpectedKey` was measured against. */
const knownOf = (ast: AST): readonly string[] =>
  ast._tag === "Objects" ? ast.propertySignatures.map((signature) => String(signature.name)) : [];

/**
 * One issue tree to a flat list of `ProblemDetail`.
 *
 * `Composite` fans out, `Pointer` extends the key path, and the leaves are the
 * three problems this repo already had words for.
 */
const detailsOf = (issue: Issue, path: readonly PropertyKey[]): readonly ProblemDetail[] => {
  switch (issue._tag) {
    case "Composite":
      return issue.issues.flatMap((inner) => detailsOf(inner, path));
    case "Pointer":
      return detailsOf(issue.issue, [...path, ...issue.path]);
    case "MissingKey":
      return [{ _tag: "MissingKey", key: keyOf(path) }];
    case "UnexpectedKey":
      return [{ _tag: "UnknownKey", key: keyOf(path), known: knownOf(issue.ast) }];
    case "AnyOf":
      return [
        {
          _tag: "BadValue",
          key: keyOf(path),
          expected: expectedOf(issue.ast),
          got: gotOf(issue),
        },
      ];
    default:
      return [
        {
          _tag: "BadValue",
          key: keyOf(path),
          expected: expectedOf("ast" in issue ? issue.ast : undefined),
          got: gotOf(issue),
        },
      ];
  }
};

const firstLine = (message: string): string =>
  (message.split("\n")[0] ?? message).replace(/ at line \d+, column \d+:?$/, "");

/**
 * Text to a domain value, or every reason it is not one.
 *
 * The `yaml` package answers "is this a document"; `Schema` answers "is this the
 * document we meant". A malformed document reports with its line and column,
 * because that is the only problem a person fixes by looking at a position.
 */
export const decodeYaml = <T>(schema: Codec<T, unknown, never, never>, src: string): Checked<T> => {
  const document = parseDocument(src, { prettyErrors: true });
  if (document.errors.length > 0) {
    return {
      problems: document.errors.map((error) => ({
        _tag: "Malformed" as const,
        line: error.linePos?.[0].line ?? 1,
        column: error.linePos?.[0].col,
        detail: `malformed YAML — ${firstLine(error.message)}`,
      })),
    };
  }
  const decoded = decodeUnknownResult(schema, OPTIONS)(document.toJS());
  return Result.isFailure(decoded)
    ? { problems: detailsOf(decoded.failure.issue, []) }
    : { value: decoded.success };
};
