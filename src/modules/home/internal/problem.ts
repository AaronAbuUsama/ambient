/**
 * How a problem is made, ordered and rendered. `cli` prints these strings; it
 * never formats a problem itself.
 */

import type { Found } from "./disk.ts";
import type { Problem, ProblemDetail } from "../types.ts";

/** Anything a validator produces before it knows which file it came from. */
export type Checked<T> = { readonly value: T } | { readonly problems: readonly ProblemDetail[] };

export const problem = (at: string, detail: ProblemDetail): Problem => ({ at, detail });

/** The one narrowing of a `Checked`, so `"problems" in x` is written once. */
export const detailsOf = <T>(c: Checked<T>): readonly ProblemDetail[] =>
  "problems" in c ? c.problems : [];

/** What the filesystem found, said in the problem vocabulary. */
export const kindOf = (f: Found, expected: "file" | "directory"): ProblemDetail => {
  switch (f.kind) {
    case "absent":
      return { _tag: "Missing" };
    case "escapes":
      return { _tag: "Escapes" };
    case "unreadable":
      return { _tag: "Unreadable", cause: f.cause };
    default:
      return { _tag: "WrongKind", expected };
  }
};

const REF_KIND = {
  agent: "agent",
  mcpServer: "MCP server",
  model: "model profile",
  source: "source",
} as const;

const where = (at: string, d: ProblemDetail): string =>
  d._tag === "Malformed" ? `${at}:${d.line}${d.column === undefined ? "" : `:${d.column}`}` : at;

const said = (d: ProblemDetail): string => {
  switch (d._tag) {
    case "Missing":
      return "missing";
    case "WrongKind":
      return `expected a ${d.expected}`;
    case "Escapes":
      return "a symlink here leaves the home";
    case "Unreadable":
      return `unreadable — ${d.cause}`;
    case "Malformed":
      return d.detail;
    case "UnknownKey":
      return `unknown key "${d.key}" (known: ${d.known.join(", ")})`;
    case "MissingKey":
      return `missing key "${d.key}"`;
    case "BadValue":
      return `${d.key === "" ? "" : `${d.key} `}must be ${d.expected}${
        d.got === "" ? "" : `, got "${d.got}"`
      }`;
    case "BadName":
      return `bad name "${d.got}" — expected ${d.expected}`;
    case "DanglingRef":
      return `${d.key} names ${REF_KIND[d.kind]} "${d.to}", which is not defined (known: ${
        d.known.length === 0 ? "none" : d.known.join(", ")
      })`;
    default: {
      const never: never = d;
      return String(never);
    }
  }
};

export const describe = (p: Problem): string => `${where(p.at, p.detail)}: ${said(p.detail)}`;

/** Ordered by `at`, then tag, and de-duplicated — so `doctor` output is diffable. */
export const ordered = (problems: readonly Problem[]): readonly Problem[] => {
  const seen = new Set<string>();
  const unique: Problem[] = [];
  for (const p of problems) {
    const key = JSON.stringify(p);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(p);
  }
  const cmp = (a: string, b: string): number => (a === b ? 0 : a < b ? -1 : 1);
  return unique.sort((a, b) => cmp(a.at, b.at) || cmp(a.detail._tag, b.detail._tag));
};
