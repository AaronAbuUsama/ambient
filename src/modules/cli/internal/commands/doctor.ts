import type { Command } from "../command.ts";
import { report } from "../command.ts";

/**
 * `ambient doctor` — `home.plan()`, which is `converge()` minus the writes. One
 * list of things that must be true, so `doctor` cannot fall behind `init`.
 */
export const doctor: Command = (home) => report(home.plan());
