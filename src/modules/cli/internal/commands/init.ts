import type { Command } from "../command.ts";
import { report } from "../command.ts";

/**
 * `ambient init` — `home.converge()`. Creates or repairs every path `home` owns,
 * then reports what convergence had no right to fix.
 */
export const init: Command = async (home) => report(await home.converge());
