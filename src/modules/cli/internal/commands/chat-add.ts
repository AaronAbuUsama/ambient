import type { Command } from "../command.ts";
import { misuse, report } from "../command.ts";

/**
 * `ambient chat add <slug>` — `home.chat(slug).converge()`. Idempotent, and it
 * converges its parents first, so it works on a machine that never ran `init`.
 * An illegal slug is not this command's business: `home` names it and creates
 * nothing.
 */
export const chatAdd: Command = async (home, rest) => {
  const [verb, slug] = rest;
  if (verb !== "add" || slug === undefined) return misuse("usage: ambient chat add <slug>");
  return report(await home.chat(slug).converge());
};
