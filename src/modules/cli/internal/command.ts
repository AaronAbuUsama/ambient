/**
 * What every command is. Each one is handed an open home and whatever argv is
 * left after the command name, and owns its own usage line.
 */

import type { Home, Problem } from "~/modules/home/types.ts";
import type { Outcome } from "../types.ts";

/** Async only where it writes: `doctor` never touches disk, so it is not. */
export type Command = (
  home: Home,
  rest: readonly string[],
  defaultZone: string,
) => Outcome | Promise<Outcome>;

export const report = (problems: readonly Problem[]): Outcome => ({ kind: "report", problems });

export const misuse = (said: string): Outcome => ({ kind: "misuse", said });

export const message = (ok: boolean, said: string): Outcome => ({ kind: "message", ok, said });
