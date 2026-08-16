/**
 * One error vocabulary for the whole module, and the one place it is rendered.
 * `cli` prints these strings; it never formats a problem itself.
 */

export type ProblemDetail =
  | { readonly _tag: "Missing" }
  | { readonly _tag: "WrongKind"; readonly expected: "file" | "directory" }
  | { readonly _tag: "Escapes" }
  | { readonly _tag: "Unreadable"; readonly cause: string }
  | {
      readonly _tag: "Malformed";
      readonly line: number;
      readonly column?: number;
      readonly detail: string;
    }
  | { readonly _tag: "UnknownKey"; readonly key: string; readonly known: readonly string[] }
  | { readonly _tag: "MissingKey"; readonly key: string }
  | {
      readonly _tag: "BadValue";
      readonly key: string;
      readonly expected: string;
      readonly got: string;
    }
  | { readonly _tag: "BadName"; readonly got: string; readonly expected: string }
  | {
      readonly _tag: "DanglingRef";
      readonly key: string;
      readonly to: string;
      readonly kind: "agent" | "mcpServer" | "model" | "source";
      readonly known: readonly string[];
    };

/** `at` is a home-relative label — deliberately not a usable path. It is for humans. */
export type Problem = { readonly at: string; readonly detail: ProblemDetail };

export type HomeProblem = { readonly problems: readonly [Problem, ...Problem[]] };

/** Anything a validator produces before it knows which file it came from. */
export type Checked<T> = { readonly value: T } | { readonly problems: readonly ProblemDetail[] };

export const problem = (at: string, detail: ProblemDetail): Problem => ({ at, detail });

const REF_KIND = {
  agent: "agent",
  mcpServer: "MCP server",
  model: "model profile",
  source: "source",
} as const;

const place = (at: string, d: ProblemDetail): string =>
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

export const describe = (p: Problem): string => `${place(p.at, p.detail)}: ${said(p.detail)}`;

/** Ordered by `at`, then tag — so `doctor` output is stable and diffable. */
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

export const failure = (problems: readonly Problem[]): HomeProblem | undefined =>
  problems.length === 0 ? undefined : { problems: [problems[0], ...problems.slice(1)] };
