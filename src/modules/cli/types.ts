/**
 * `cli` — argv in, one outcome out.
 *
 * THE interface. `cli` holds no logic of its own: it maps argv to a command over
 * a `home`, and returns what to say. It does not print, does not exit, does not
 * read the environment and does not format a problem — rendering lives in
 * `home.describe`, and the process edge is `src/main.ts`.
 */

import type { Problem } from "../home/types.ts";

/** What a command decided. The process edge turns this into output and an exit code. */
export type Outcome =
  /** What is wrong with the home. Empty means healthy: exit 0, else exit 1. */
  | { readonly kind: "report"; readonly problems: readonly Problem[] }
  /** The command line itself was wrong. Exit 2 — never confusable with an unhealthy home. */
  | { readonly kind: "misuse"; readonly said: string };

/**
 * `defaultRoot` is where the home is when `--home` does not say. The caller
 * resolves it, because `cli` reads no environment.
 */
export type Run = (argv: readonly string[], defaultRoot: string) => Promise<Outcome>;
