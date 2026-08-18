/**
 * `cli` — argv in, one outcome out.
 *
 * THE interface. `cli` holds no logic of its own: it maps argv to a command over
 * a `home`, and returns what to say. It does not print, does not exit, does not
 * read the environment and does not format a problem — rendering lives in
 * `home.describe`, and the process edge is `src/main.ts`.
 */

import type { Problem } from "~/modules/home/types.ts";

/** What a command decided. The process edge turns this into output and an exit code. */
export type Outcome =
  /** What is wrong with the home. Empty means healthy: exit 0, else exit 1. */
  | { readonly kind: "report"; readonly problems: readonly Problem[] }
  /** One command result. `ok: false` is an operational failure and exits 1. */
  | { readonly kind: "message"; readonly ok: boolean; readonly said: string }
  /** The command line itself was wrong. Exit 2 — never confusable with an unhealthy home. */
  | { readonly kind: "misuse"; readonly said: string };

/**
 * Where a long verb says where it has got to.
 *
 * `ambient pair` holds a socket for minutes and shows a code someone has to scan,
 * so an outcome delivered at the end is no use. `cli` still does not print: the
 * composition root hands in the sink, exactly as it hands in the root and the
 * Zone, and a test hands in an array.
 */
export type Say = (line: string) => void;

/**
 * `defaultRoot` is where the home is when `--home` does not say. The caller
 * resolves it, because `cli` reads no environment.
 */
export type Run = (
  argv: readonly string[],
  defaultRoot: string,
  defaultZone?: string,
  say?: Say,
) => Promise<Outcome>;
